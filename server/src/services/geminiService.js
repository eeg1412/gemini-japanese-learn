import { GoogleGenerativeAI } from '@google/generative-ai'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { upsertVocabulary } from './vocabService.js'
import db from '../db/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let genAIInstance = null
function getGenAI() {
  if (!genAIInstance) {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined in environment variables.')
    }
    genAIInstance = new GoogleGenerativeAI(apiKey)
  }
  return genAIInstance
}

const tools = [
  {
    functionDeclarations: [
      {
        name: 'save_vocabulary',
        description:
          '将日语生词保存到用户的生词本中。每当对话中出现值得学习的核心词汇时，请务必调用此工具进行保存。',
        parameters: {
          type: 'OBJECT',
          properties: {
            original: {
              type: 'STRING',
              description:
                '单词的原型/字典形（如：食べる、学校）。这是词库中的唯一标识。'
            },
            reading: {
              type: 'STRING',
              description: '单词的平假名或片假名读音'
            },
            meaning: { type: 'STRING', description: '单词的准确中文含义' },
            example: {
              type: 'STRING',
              description: '一个包含该单词的典型日语例句'
            },
            type: {
              type: 'STRING',
              description:
                '词性标签。必须采用以下规范之一：[名词, 动词, 形容词, 副词, 助词, 连词, 感叹词, 短语]'
            }
          },
          required: ['original', 'reading', 'meaning', 'example', 'type']
        }
      }
    ]
  }
]

export async function processChat(input, imageBase64, customInstruction = '') {
  try {
    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-pro'
    const model = getGenAI().getGenerativeModel({
      model: modelName,
      tools: tools
    })

    // Load system prompt
    const promptPath = process.env.USER_PROMPT_PATH
      ? path.resolve(__dirname, '../../', process.env.USER_PROMPT_PATH)
      : path.join(__dirname, '../../user_prompt.txt')

    // 默认系统提示词
    let defaultSystemPrompt = `
你是一位资深的日语老师。你的任务是帮助用户学习日语。
当你收到用户的日语文本或图片时，请执行以下操作：
1. 解释文本中的语法点。
2. 纠正用户的错误（如果有）。
3. 使用工具函数 \`save_vocabulary\` 保存文本中出现的关键生词。
4. 回复时请使用亲切、鼓励的语气，并主要使用中文进行解释。
5. 每次对话中，尝试提取生词进行保存。
`.trim()

    let userPromptOverride = ''
    if (fs.existsSync(promptPath)) {
      userPromptOverride = fs.readFileSync(promptPath, 'utf-8')
    }

    // Combine instructions
    const fullInstruction = `
${defaultSystemPrompt}

${userPromptOverride}

${customInstruction}

任务执行规范：
1. 将输入的日语翻译为简体中文。
2. 为所有汉字标注振假名，格式为：漢字(かんじ)。
3. 提取核心词汇并为每个单词调用 'save_vocabulary' 函数。
4. 返回翻译结果和标注了振假名的原文。
`.trim()

    const parts = []
    parts.push({ text: fullInstruction })

    if (imageBase64) {
      // Support data URL (data:image/png;base64,...) and raw base64.
      const match = String(imageBase64).match(
        /^data:(image\/[a-zA-Z0-9.+-]+);base64,/
      )
      const mimeType = match ? match[1] : 'image/jpeg'
      const base64Data = String(imageBase64).replace(
        /^data:image\/[a-zA-Z0-9.+-]+;base64,/,
        ''
      )

      parts.push({
        inlineData: {
          data: base64Data,
          mimeType
        }
      })
    }

    parts.push({ text: input })

    const chat = model.startChat({
      history: []
    })

    const safeText = resp => {
      try {
        const t = resp?.text?.()
        return typeof t === 'string' ? t.trim() : ''
      } catch {
        return ''
      }
    }

    let result = await chat.sendMessage(parts)
    let response = result.response
    const collectedTexts = []
    const firstText = safeText(response)
    if (firstText) collectedTexts.push(firstText)

    // Handle function calls loop
    // Gemini 1.5 automatic function calling isn't strictly "auto" in node sdk same way as python sometimes,
    // we iterate requests.

    const maxTurns = 10 // Prevent infinite loops
    let turns = 0

    while (response.functionCalls() && turns < maxTurns) {
      const functionCalls = response.functionCalls()
      const functionResponses = []

      for (const call of functionCalls) {
        if (call.name === 'save_vocabulary') {
          const args = call.args
          console.log('Calling tool save_vocabulary:', args)
          const savedVocab = upsertVocabulary(args)

          functionResponses.push({
            functionResponse: {
              name: 'save_vocabulary',
              response: { result: savedVocab }
            }
          })
        }
      }

      // Send function results back to model
      result = await chat.sendMessage(functionResponses)
      response = result.response
      const t = safeText(response)
      if (t) collectedTexts.push(t)
      turns++
    }

    const textResponse =
      collectedTexts.join('\n\n').trim() || safeText(response)

    // Log to DB
    const now = Date.now()
    // User message
    db.prepare(
      'INSERT INTO chat_history (role, content, image_data, created_at) VALUES (?, ?, ?, ?)'
    ).run('user', input, imageBase64 || null, now)
    // Model message
    db.prepare(
      'INSERT INTO chat_history (role, content, created_at) VALUES (?, ?, ?)'
    ).run('model', textResponse, Date.now())

    return textResponse
  } catch (error) {
    console.error('AI Processing Error:', error)
    throw error
  }
}

export function getChatHistory(page = 1, limit = 20) {
  const offset = (page - 1) * limit
  const rows = db
    .prepare(
      'SELECT * FROM chat_history ORDER BY created_at DESC LIMIT ? OFFSET ?'
    )
    .all(limit, offset)
  const count = db
    .prepare('SELECT COUNT(*) as count FROM chat_history')
    .get().count
  return {
    data: rows.reverse(), // Show oldest first in the UI usually? Or newest at bottom. Front end request "Scroll up to get next page", implying default view is newest.
    // "Default from new to old".
    // If we request page 1 (newest 20), we typically render them at the bottom.
    // I will return them as is (DESC), frontend can reverse them for display order (bottom-up).
    total: count,
    page,
    limit
  }
}
