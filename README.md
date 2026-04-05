<div align="center">

# 🧠 Knowledge Assistant

**AI-powered knowledge management and research assistant**

Upload documents, build knowledge bases, and get intelligent citation-backed answers — powered by RAG, LangChain, and free open-source LLMs via HuggingFace.

![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)
![Vue 3](https://img.shields.io/badge/Vue-3-4FC08D?logo=vue.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-8-47A248?logo=mongodb&logoColor=white)
![LangChain](https://img.shields.io/badge/LangChain-0.3-1C3C3C?logo=chainlink&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue)

</div>

---

## ✨ Features

| Category | Features |
|---|---|
| 📄 **Document Ingestion** | Upload PDFs, Word (DOCX), Excel (XLSX), CSV, Markdown, plain text, and web URLs |
| 🤖 **AI-Powered Q&A** | Ask natural language questions and receive accurate, citation-backed answers |
| 🧩 **RAG Pipeline** | Semantic chunking + vector search via ChromaDB + LangChain retrieval chains |
| 📚 **Knowledge Bases** | Organize documents into named collections with custom icons for focused research |
| 💬 **Persistent Chat** | Full conversation history with per-chat knowledge base scoping |
| 🤝 **Team Collaboration** | Create teams, invite members, and share knowledge bases across your organization |
| 🌗 **Dark Mode** | Full light/dark theme toggle with system preference detection |
| 🔑 **JWT Auth** | Secure token-based API authentication with refresh support |
| 🛡️ **Security** | Helmet, rate limiting, CORS, input validation out of the box |
| 🐳 **Docker Ready** | Single `docker compose up` to run the full stack locally |
| ☁️ **Cloud Deploy** | One-click deploy config for Render (backend + ChromaDB) and Vercel (frontend) |

---

## 🤖 Supported AI Models

Knowledge Assistant works with **both free HuggingFace models and OpenAI models**.

### Free Models (HuggingFace — default, no cost)

| Model | Best For |
|---|---|
| `meta-llama/Llama-3.1-8B-Instruct` | General Q&A — fast and capable |
| `meta-llama/Llama-3.2-3B-Instruct` | Lightweight, low-latency answers |
| `Qwen/Qwen2.5-7B-Instruct` | Multilingual queries |
| `Qwen/Qwen2.5-Coder-7B-Instruct` | Code-heavy documents |
| `microsoft/Phi-3.5-mini-instruct` | Efficient on smaller hardware |
| `mistralai/Mixtral-8x7B-Instruct-v0.1` | Best free-tier quality |
| `deepseek-ai/DeepSeek-R1-Distill-Qwen-7B` | Reasoning / chain-of-thought |

### OpenAI Models (requires API key)

To use OpenAI models, see [→ Switching to OpenAI](#-switching-to-openai-models) below.

---

## 🏗️ Tech Stack

### Backend
- **Runtime**: Node.js 18+ / Express
- **Database**: MongoDB 7 (Mongoose ODM)
- **Vector Store**: ChromaDB
- **AI / RAG**: LangChain, HuggingFace Inference API, OpenAI (optional)
- **Auth**: Passport.js — Google OAuth 2.0, GitHub OAuth, JWT
- **File Parsing**: pdf-parse, mammoth (DOCX), xlsx, cheerio (web scraping)
- **Logging**: Winston

### Frontend
- **Framework**: Vue 3 + Vite
- **State Management**: Pinia
- **Styling**: Tailwind CSS + custom dark-mode design system
- **Routing**: Vue Router 4
- **Markdown Rendering**: marked + highlight.js
- **Icons**: Heroicons

---

## 🚀 Getting Started

### Prerequisites

- [Node.js 18+](https://nodejs.org/)
- [MongoDB](https://www.mongodb.com/) — local install **or** free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster
- [ChromaDB](https://www.trychroma.com/) — run locally via Docker (see below)
- [HuggingFace API key](https://huggingface.co/settings/tokens) — free, for LLM inference and embeddings
- _(Optional)_ [OpenAI API key](https://platform.openai.com/api-keys) — for GPT models

---

## 🐳 Quick Start with Docker (Recommended)

The easiest way to run the full stack locally is Docker Compose — it starts MongoDB, ChromaDB, the backend, and the frontend together.

```bash
# 1. Clone the repo
git clone https://github.com/your-username/knowledge-assistant.git
cd knowledge-assistant

# 2. Create backend environment file
cp backend/.env.example backend/.env
# Edit backend/.env and fill in your keys (see Environment Variables below)

# 3. Start everything
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:80 |
| Backend API | http://localhost:3000 |
| ChromaDB | http://localhost:8000 |
| MongoDB | localhost:27017 |

---

## 🛠️ Manual Setup (Development)

### 1. Start Infrastructure

```bash
# Start MongoDB + ChromaDB via Docker (no full build needed)
docker compose up mongodb chroma -d
```

Or run MongoDB and ChromaDB natively if you prefer.

### 2. Backend

```bash
cd backend

# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env
# → Open .env and fill in your values (see section below)

# Start development server (hot-reload)
npm run dev
```

The API will be available at `http://localhost:3000`.

### 3. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## ⚙️ Environment Variables

Create `backend/.env` from the example file and fill in the values:

```env
# ── Server ─────────────────────────────────────────────────────────────
PORT=3000
NODE_ENV=development

# ── Database ───────────────────────────────────────────────────────────
MONGODB_URI=mongodb://localhost:27017/knowledge-assistant
# For MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/knowledge-assistant

# ── Auth ───────────────────────────────────────────────────────────────
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=7d
SESSION_SECRET=your-session-secret-change-this

# ── AI Providers ───────────────────────────────────────────────────────
# HuggingFace — required for free LLM inference + embeddings
HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxxxxxxxxx

# OpenAI — optional, only needed if using GPT models
# OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx

# ── ChromaDB ───────────────────────────────────────────────────────────
CHROMA_URL=http://localhost:8000
CHROMA_COLLECTION_NAME=knowledge_base

# ── OAuth — Google (optional) ──────────────────────────────────────────
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# ── OAuth — GitHub (optional) ──────────────────────────────────────────
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_CALLBACK_URL=http://localhost:3000/api/auth/github/callback

# ── Frontend URL (CORS) ────────────────────────────────────────────────
FRONTEND_URL=http://localhost:5173

# ── File Uploads ───────────────────────────────────────────────────────
MAX_FILE_SIZE_MB=50
UPLOAD_DIR=./uploads
```

---

## 🔑 Switching to OpenAI Models

By default the app uses **free HuggingFace models**. To unlock GPT models:

### Step 1 — Add your OpenAI key to `.env`

```env
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx
```

### Step 2 — Uncomment OpenAI models in `frontend/src/views/Chat.vue`

Find the `MODELS` array (around line 330) and uncomment whichever GPT models you want:

```js
const MODELS = [
  // ── OpenAI ──────────────────────────────────────────────────
  { value: "gpt-4o", label: "GPT-4o (Multimodal)" },          // ← uncomment
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },             // ← uncomment
  { value: "gpt-4-turbo", label: "GPT-4 Turbo" },             // ← uncomment
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },        // ← uncomment
  // { value: "o3", label: "o3 (Reasoning)" },
  // { value: "o4-mini", label: "o4 Mini (Reasoning)" },

  // ── HuggingFace (Free) ───────────────────────────────────────
  {
    value: "meta-llama/Llama-3.1-8B-Instruct",
    label: "Llama 3.1 8B (Fast & Free)",
  },
  // ... rest of free models
];
```

> **Note:** When `OPENAI_API_KEY` is set, OpenAI is also used for embeddings (`text-embedding-3-small`), which improves retrieval quality.

---

## 🔐 OAuth Setup (Optional)

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Create an **OAuth 2.0 Client ID** (Web Application)
3. Add authorized redirect URI: `http://localhost:3000/api/auth/google/callback`
4. Copy **Client ID** and **Client Secret** to `.env`

### GitHub OAuth

1. Go to GitHub → Settings → Developer Settings → [OAuth Apps](https://github.com/settings/developers)
2. Create a new OAuth App
3. Set **Authorization callback URL**: `http://localhost:3000/api/auth/github/callback`
4. Copy **Client ID** and **Client Secret** to `.env`

---
## 📁 Project Structure

```
knowledge-assistant/
├── backend/
│   ├── src/
│   │   ├── config/         # DB, logger, passport, upload config
│   │   ├── middleware/      # Auth middleware
│   │   ├── models/          # Mongoose models (User, Document, Chat, KnowledgeBase, Team)
│   │   ├── routes/          # Express route handlers
│   │   └── services/
│   │       ├── documentProcessor.js  # PDF/DOCX/XLSX/web parsing + chunking
│   │       ├── vectorStore.js        # ChromaDB integration
│   │       └── ragService.js         # LangChain RAG pipeline
│   ├── .env.example
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── views/           # Chat, Documents, KnowledgeBases, Teams, Settings
│   │   ├── components/      # Reusable UI components
│   │   ├── stores/          # Pinia stores (auth, theme, toast)
│   │   ├── services/        # API client
│   │   └── router/          # Vue Router config
│   └── Dockerfile
├── docker-compose.yml
```

---

## 📜 License

MIT — free to use, modify, and distribute.

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### Running Chroma DB

```bash
# Using Docker
docker run -p 8000:8000 chromadb/chroma

# Or install locally
pip install chromadb
chroma run --host localhost --port 8000
```

## Environment Variables

### Backend (.env)

```env
# Server
PORT=3000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/knowledge-assistant

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# OAuth - Google
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# OAuth - GitHub
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Chroma
CHROMA_URL=http://localhost:8000
```

## Project Structure

```
knowledge-assistant/
├── backend/
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── middleware/     # Express middleware
│   │   ├── models/         # MongoDB models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   └── index.js        # Entry point
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── assets/         # Styles
│   │   ├── components/     # Vue components
│   │   ├── layouts/        # Page layouts
│   │   ├── router/         # Vue Router
│   │   ├── services/       # API services
│   │   ├── stores/         # Pinia stores
│   │   ├── views/          # Pages
│   │   ├── App.vue
│   │   └── main.js
│   └── package.json
│
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/google` - Google OAuth
- `GET /api/auth/github` - GitHub OAuth
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - Get current user

### Documents
- `GET /api/documents` - List documents
- `POST /api/documents/upload` - Upload document
- `POST /api/documents/url` - Ingest web page
- `GET /api/documents/:id` - Get document
- `PUT /api/documents/:id` - Update document
- `DELETE /api/documents/:id` - Delete document

### Chat
- `POST /api/chat/query` - Send query
- `GET /api/chat` - List chats
- `GET /api/chat/:id` - Get chat
- `POST /api/chat/summarize` - Generate summary
- `POST /api/chat/insights` - Generate insights

### Knowledge Bases
- `GET /api/knowledge-base` - List knowledge bases
- `POST /api/knowledge-base` - Create knowledge base
- `GET /api/knowledge-base/:id` - Get knowledge base
- `PUT /api/knowledge-base/:id` - Update knowledge base
- `DELETE /api/knowledge-base/:id` - Delete knowledge base
- `POST /api/knowledge-base/:id/share` - Share knowledge base

### Teams
- `GET /api/teams` - List teams
- `POST /api/teams` - Create team
- `POST /api/teams/:id/invite` - Invite member
- `POST /api/teams/join/:token` - Join via invite

## License

MIT
