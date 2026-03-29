# Knowledge Assistant

AI-powered knowledge management and research assistant that allows users to ingest diverse content types, build a queryable knowledge base, and receive intelligent, citation-backed answers.

## Features

- **Document Ingestion**: Upload PDFs, Word docs, Excel sheets, Markdown files, and web pages
- **AI-Powered Q&A**: Ask questions and get accurate, citation-backed answers
- **Knowledge Bases**: Organize documents into collections for focused research
- **Team Collaboration**: Share knowledge bases with team members
- **Beautiful UX**: Modern, responsive interface with dark mode support
- **OAuth 2.0**: Sign in with Google or GitHub
- **Privacy-First**: Local-first architecture with secure data handling

## Tech Stack

### Backend
- **Runtime**: Node.js + Express
- **Database**: MongoDB
- **Vector Store**: Chroma
- **AI**: OpenAI + LangChain
- **Auth**: Passport.js (OAuth 2.0 + JWT)

### Frontend
- **Framework**: Vue 3 + Vite
- **State**: Pinia
- **Styling**: Tailwind CSS
- **Icons**: Heroicons

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Chroma DB (for vector storage)
- OpenAI API key

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
# - MONGODB_URI
# - OPENAI_API_KEY
# - JWT_SECRET
# - OAuth credentials (Google, GitHub)

# Start development server
npm run dev
```

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
