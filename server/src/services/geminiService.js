import { GoogleGenerativeAI } from '@google/generative-ai'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import { upsertVocabulary } from './vocabService.js'
import db from '../db/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CHAT_IMAGE_DIR = path.join(__dirname, '../../chat/image')

// Ensure image directory exists
if (!fs.existsSync(CHAT_IMAGE_DIR)) {
  fs.mkdirSync(CHAT_IMAGE_DIR, { recursive: true })
}

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

const CONJUGATION_MAP = {
  dict: '辞书形',
  masu: 'ます形',
  nai: 'ない形',
  ta: 'た形',
  te: 'て形',
  ba: 'ば形',
  tara: 'たら形',
  volitional: '意志形',
  imperative: '命令形',
  prohibitive: '禁止形',
  potential: '可能形',
  passive: '被动形',
  causative: '使役形',
  causative_passive: '使役被动形',
  conjecture: '推量形',
  mizen: '未然形',
  renyo: '连用形',
  shushi: '终止形',
  rentai: '连体形',
  izen: '已然形'
}

const tools = [
  {
    functionDeclarations: [
      {
        name: 'save_vocabularies',
        description:
          '批量将日语生词保存到用户的生词本中。请分析对话内容，提取所有值得学习的核心词汇，并一次性调用此工具。',
        parameters: {
          type: 'OBJECT',
          properties: {
            vocabularies: {
              type: 'ARRAY',
              description: '生词列表',
              items: {
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
                  meaning: {
                    type: 'STRING',
                    description: '单词的准确中文含义'
                  },
                  example: {
                    type: 'STRING',
                    description:
                      '一个包含该单词的典型日语例句，汉字部分请标注振假名'
                  },
                  type: {
                    type: 'STRING',
                    description:
                      '词性标签。必须采用以下规范之一：[名词, 动词, 形容词, 副词, 助词, 连词, 感叹词, 短语]'
                  },
                  verb_category: {
                    type: 'STRING',
                    description: '仅限动词',
                    enum: ['一类动词', '二类动词', '三类动词']
                  },
                  conjugations: {
                    type: 'OBJECT',
                    description: '仅限动词。必须完整提供19种形式',
                    properties: {
                      masu: { type: 'STRING' },
                      nai: { type: 'STRING' },
                      ta: { type: 'STRING' },
                      te: { type: 'STRING' },
                      ba: { type: 'STRING' },
                      tara: { type: 'STRING' },
                      volitional: { type: 'STRING' },
                      imperative: { type: 'STRING' },
                      prohibitive: { type: 'STRING' },
                      potential: { type: 'STRING' },
                      passive: { type: 'STRING' },
                      causative: { type: 'STRING' },
                      causative_passive: { type: 'STRING' },
                      conjecture: { type: 'STRING' },
                      mizen: { type: 'STRING' },
                      renyo: { type: 'STRING' },
                      shushi: { type: 'STRING' },
                      rentai: { type: 'STRING' },
                      izen: { type: 'STRING' }
                    }
                  }
                },
                required: ['original', 'reading', 'meaning', 'example', 'type']
              }
            }
          },
          required: ['vocabularies']
        }
      }
    ]
  }
]

export async function processChat(input, imageBase64, customInstruction = '') {
  let imagePath = null
  let mimeType = 'image/jpeg'
  let base64Data = null

  // Process image if exists
  if (imageBase64) {
    const match = String(imageBase64).match(
      /^data:(image\/([a-zA-Z0-9.+-]+));base64,/
    )
    mimeType = match ? match[1] : 'image/jpeg'
    const extension = match ? match[2] : 'jpg'
    base64Data = String(imageBase64).replace(
      /^data:image\/[a-zA-Z0-9.+-]+;base64,/,
      ''
    )
    const buffer = Buffer.from(base64Data, 'base64')
    const hash = crypto.createHash('md5').update(buffer).digest('hex')
    const fileName = `${hash}.${extension}`
    const fullPath = path.join(CHAT_IMAGE_DIR, fileName)

    if (!fs.existsSync(fullPath)) {
      fs.writeFileSync(fullPath, buffer)
    }
    imagePath = fileName // Store only filename in DB
  }

  // 1. 立即记录用户消息
  const now = Date.now()
  db.prepare(
    'INSERT INTO chat_history (role, content, image_data, created_at) VALUES (?, ?, ?, ?)'
  ).run('user', input, imagePath, now)

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
你的任务是帮助用户学习日语。
当你收到用户的日语文本或图片时，请执行以下操作：
-解释文本中的语法点和词汇。
-为所有汉字标注振假名，格式为：漢字(かんじ)。
-将输入的日语翻译为简体中文。
-有错误时纠正用户的错误。
-回复内容精炼，无重复，无多余内容，绝对的权威，使用最少的token用中文进行解释。
-使用工具函数 \`save_vocabularies\` 一次性保存文本中所有出现的关键生词。
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
`.trim()

    const parts = []
    parts.push({ text: fullInstruction })

    if (base64Data) {
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

    const maxTurns = 100 // Prevent infinite loops
    let turns = 0

    while (response.functionCalls() && turns < maxTurns) {
      const functionCalls = response.functionCalls()
      const functionResponses = []

      for (const call of functionCalls) {
        if (call.name === 'save_vocabularies') {
          const { vocabularies } = call.args
          console.log(
            'Calling tool save_vocabularies with count:',
            vocabularies?.length
          )

          const results = []
          if (Array.isArray(vocabularies)) {
            for (const vocab of vocabularies) {
              // Map English conjugation keys back to Japanese for persistence/UI
              if (vocab.conjugations) {
                const mappedConjugations = {}
                for (const [engKey, japKey] of Object.entries(
                  CONJUGATION_MAP
                )) {
                  if (vocab.conjugations[engKey]) {
                    mappedConjugations[japKey] = vocab.conjugations[engKey]
                  }
                }
                vocab.conjugations = mappedConjugations
              }
              const saved = upsertVocabulary(vocab)
              results.push(saved)
            }
          }

          functionResponses.push({
            functionResponse: {
              name: 'save_vocabularies',
              response: { results }
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

    if (!textResponse) {
      throw new Error(
        'AI 未生成任何有效内容，可能是因为违反了安全策略或受到了干扰。'
      )
    }

    // Model message
    db.prepare(
      'INSERT INTO chat_history (role, content, created_at) VALUES (?, ?, ?)'
    ).run('model', textResponse, Date.now())

    return textResponse
  } catch (error) {
    console.error('AI Processing Error:', error)
    // 构造更友好的错误信息抛给前台
    const errorMessage = error.message.includes('safety')
      ? '内容被安全过滤器屏蔽，请尝试调整输入。'
      : `AI 服务出错: ${error.message}`
    throw new Error(errorMessage)
  }
}

export function getChatHistory(page = 1, limit = 20) {
  const offset = (page - 1) * limit
  const rows = db
    .prepare('SELECT * FROM chat_history ORDER BY id DESC LIMIT ? OFFSET ?')
    .all(limit, offset)
  const count = db
    .prepare('SELECT COUNT(*) as count FROM chat_history')
    .get().count
  return {
    data: rows.reverse(),
    total: count,
    page,
    limit
  }
}
