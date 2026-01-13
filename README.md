# Gemini 日语学习 AI

## 快速开始

1. 安装依赖并同时启动前后端开发环境：

```bash
npm run dev
```

2. 生成 JWT Secret（单独文件）：

```bash
npm run keygen
```

## 环境变量

将 `server/.env.sample` 复制为 `server/.env` 并填写你的 Gemini API Key（或其他所需的密钥）。

JWT 密钥文件由后端自动管理，位置为 `server/secret.key`，请勿将其提交到版本库。

## 项目结构（简要说明）

- `server/`：Express 5 后端，使用 SQLite 存储数据，路由与服务逻辑集中在此目录。
- `client/`：Vue 3 前端，用于 UI 和交互（入口文件位于 `client/src/main.js`）。
- `scripts/`：一些辅助脚本（例如密钥生成脚本）。

## 重要文件说明

- 默认提示文件：`server/user_prompt.txt`（可用于自定义或覆盖对话默认提示）。
- 后端配置：`server/config/env.js` 与 `server/config/secret.js`。
- 与聊天和词汇相关的路由：`server/routes/chat.js` 与 `server/routes/vocab.js`。

## 运行与开发提示

- 开发前请确保已在 `server/.env` 中配置 API Key，并运行一次 `npm run keygen` 生成 `server/secret.key`（若尚未生成）。
- 推荐在项目根目录运行开发命令：

```bash
npm run dev
```

## 备注

- 请勿提交 `server/secret.key` 与包含敏感信息的 `server/.env` 到公开仓库。
- 如需修改对话默认提示，可编辑 `server/user_prompt.txt`。

欢迎在此项目基础上扩展更多日语学习功能（例如记忆复习、词汇本地化、或接入其他大模型）。

## Quick Start

1. Install dependencies and run both frontend/backend:
   ```bash
   npm run dev
   ```
2. Generate JWT Secret (Separate file):
   ```bash
   npm run keygen
   ```

## Environment Variables

Copy `server/.env.sample` to `server/.env` and fill in your Gemini API key.
JWT Secret is automatically managed in `server/secret.key` (don't commit this!).

## Project Structure

- /server: Express 5 Backend + SQLite
- /client: Vue 3 Frontend
- /scripts: Utility scripts
