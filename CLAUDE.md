# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Research Assistant Platform for MSc research - a full-stack RAG application integrating Exa AI neural search with Anthropic Claude 4.5 Sonnet for context-aware research synthesis. The system features session management, prompt caching optimization, and per-user knowledge base isolation.

## Development Commands

### Full Stack (Docker Compose - Recommended)
```bash
# Start all services (frontend, backend, MongoDB, mongo-express)
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Frontend available at: http://localhost:5173
# Backend API at: http://localhost:8000
# MongoDB Express UI: http://localhost:8081
```

### Backend (Python/FastAPI)
```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Run development server (outside Docker)
uvicorn main:app --reload --port 8000

# Environment required:
# - ANTHROPIC_API_KEY
# - EXA_API_KEY
# - CLAUDE_MODEL (default: claude-sonnet-4-5-20250929)
# - MONGO_DETAILS (default: mongodb://mongo:27017)
```

### Frontend (React/Vite)
```bash
cd frontend

# Install dependencies
npm install

# Run development server (outside Docker)
npm run dev

# Build for production
npm run build

# Lint
npm run lint

# Environment:
# - VITE_API_URL (default: http://localhost:8000)
```

## Architecture

### Backend (FastAPI)
- **main.py**: Central API orchestrator with all endpoints
  - Authentication (JWT-based, 24hr tokens)
  - Exa AI search integration (`/exa-search`)
  - Saved results CRUD (`/saved-results/*`)
  - Chat query endpoint with streaming (`/chat-query`)
  - Chat session management (`/chat-sessions/*`)
- **auth.py**: JWT token handling, bcrypt password hashing
- **db_config.py**: Motor (async MongoDB) client configuration
  - Collections: `users`, `saved_research`, `chat_sessions`
- **vector_db.py**: Local vector store using SentenceTransformer (all-MiniLM-L6-v2)
  - Pickle-based persistence (`vectors.pkl`)
  - Per-user document isolation
  - Cosine similarity search

### Frontend (React)
- **App.jsx**: Router setup, auth gatekeeper, JWT payload decoder
- **components/Login.jsx**: Login/register forms
- **components/Dashboard.jsx**: Main knowledge base view, source management
- **components/ExaShowcase.jsx**: Neural search interface with real-time previews
- **components/ChatWidget.jsx**: Floating chat interface for RAG queries
- **components/Header.jsx**: Navigation bar

### Database Schema (MongoDB)
- **users**: `{username, password (hashed)}`
- **saved_research**: `{user_id, title, url, text, saved_at, tags[], is_favorite, note}`
- **chat_sessions**: `{user_id, title, type ("knowledge_base"|"research"), created_at, last_message, messages[], results[]}`

## Critical Implementation Details

### Prompt Caching Strategy
The chat endpoint (`/chat-query`) implements Anthropic's prompt caching by:
1. Loading ALL user sources sorted by `_id` (oldest→newest) for stable context prefix
2. Placing full source context in system prompt with `cache_control: {"type": "ephemeral"}`
3. Appending system instructions after cached context
4. This ensures cache hits when new sources are added (prefix remains unchanged)

**Key insight**: Sorting by `_id` is essential - random order breaks cache on every request.

### Session Management
- Two distinct session types: `knowledge_base` (chat with saved sources) and `research` (search results history)
- Sessions persist last 10 messages for context window management
- Frontend uses `localStorage` for active session tracking across page reloads

### Vector Store Isolation
- Each document in `vectors.pkl` includes `user_id` field
- Search operations filter by user before computing similarities
- Upsert on save, delete on removal - maintains sync with MongoDB

### Authentication Flow
1. Login/register returns JWT token (`sub: username`, 24hr expiry)
2. Frontend stores in `localStorage`, includes in `Authorization: Bearer <token>`
3. All protected routes verify token via `Depends(oauth2_scheme)`
4. User identity extracted with `auth_handler.decode_token(token)`

## Development Patterns

### Adding New API Endpoints
1. Define Pydantic model in `backend/main.py` if new data structure needed
2. Add route with `@app.{method}` decorator
3. Include `token: str = Depends(oauth2_scheme)` for protected routes
4. Extract user with `user_id = auth_handler.decode_token(token)`
5. Always filter MongoDB queries by `user_id` for data isolation

### Adding Frontend Components
- Use vanilla CSS (no CSS-in-JS) - see `App.css` for glassmorphism aesthetic
- Unified blue color language (`text-blue-600`, `border-blue-500`)
- React Router for navigation, `localStorage` for persistent state
- API calls use `fetch()` with token from `localStorage.getItem("token")`

### Working with Vector DB
When modifying saved sources:
```python
# On save
vector_db.upsert_document(doc_id, user_id, title, text)

# On delete
vector_db.delete_document(doc_id)

# For chat context (already implemented)
results = vector_db.search_documents(query, user_id, n_results=5)
```

### Testing Prompt Cache Performance
Monitor backend logs during chat sessions. Second+ queries should show:
```
Cache Creation: 0
Cache Read: [large number]
```
If `Cache Creation` appears on every query, context sorting is broken.

## Common Gotchas

- Docker volume mounts: Code changes auto-sync, but `requirements.txt`/`package.json` changes require rebuild
- MongoDB connection: Inside Docker use `mongodb://mongo:27017`, locally use `mongodb://localhost:27017`
- Frontend proxy: Vite dev server must point to `http://localhost:8000` (set via `VITE_API_URL`)
- Vector store: `vectors.pkl` persists in backend directory - delete to reset (will rebuild from MongoDB on next save)
- JWT expiry: Tokens last 24hrs - frontend doesn't auto-refresh, user must re-login
