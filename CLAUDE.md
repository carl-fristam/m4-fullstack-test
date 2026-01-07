# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a research assistant tool built for MSc thesis work on Anti-Money Laundering (AML). It combines academic paper search (via Exa AI), knowledge management with RAG (Retrieval-Augmented Generation), and AI-powered chat (Claude 4.5 Sonnet) to help find, organize, and interact with research papers.

**Tech Stack:**
- Frontend: React 19 + Vite + Tailwind CSS
- Backend: Python FastAPI with Clean Architecture
- Database: MongoDB (metadata) + Local JSON vector store (embeddings)
- AI: Anthropic Claude 4.5 Sonnet with prompt caching

## Development Commands

### Running the Application

```bash
# Start all services (MongoDB, backend, frontend)
docker-compose up --build

# Access points:
# Frontend: http://localhost:5173
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
# Mongo Express: http://localhost:8081
```

### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Run dev server (if not using Docker)
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Preview production build
npm preview
```

### Backend Development

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run development server (if not using Docker)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Environment Setup

Required environment variables in `backend/.env`:
- `SECRET_KEY`: JWT secret key
- `ANTHROPIC_API_KEY`: Claude API key
- `EXA_API_KEY`: Exa AI search API key
- `MONGO_DETAILS`: MongoDB connection string (default: `mongodb://mongo:27017`)
- `CLAUDE_MODEL`: Model name (default: `claude-haiku-4-5-20251001`)

## Architecture Overview

### Backend Clean Architecture

The backend follows a layered architecture pattern with clear separation of concerns:

```
backend/app/
├── api/v1/          # HTTP endpoints (routes)
├── services/        # Business logic layer
├── models/          # Pydantic schemas
└── core/            # Infrastructure (config, database, security)
```

**Key architectural pattern:** Dependencies flow inward. API layer depends on services, services depend on core, but never the reverse.

**Recent refactor (commit 2ded1c7):** Separated RAG logic into dedicated modules:
- `services/context_builder.py`: Builds library overview + RAG excerpts
- `services/prompt_builder.py`: Constructs system prompts with cache markers
- `services/chat_service.py`: Orchestrates the chat pipeline

### RAG Pipeline Architecture

The RAG implementation uses a custom JSON-based vector store (switched from ChromaDB in commit ba912f1):

1. **Embedding Generation**: SentenceTransformer model `all-MiniLM-L6-v2` (384 dimensions)
2. **Storage**: `vectors.json` file with in-memory singleton service
3. **Search**: Cosine similarity (O(n) - not indexed, suitable for small-medium datasets)
4. **User Isolation**: All queries filtered by `user_id` for multi-tenant safety

**Chat Query Flow:**
```
User Message → Load History → Build Context (Library + RAG) →
Build System Prompt → Claude API (with caching) → Save Response
```

**Prompt Caching Strategy:**
- Library overview (all paper titles): Marked with `cache_control: ephemeral`
- RAG excerpts (top 5 relevant, max 2000 chars each): Marked with `cache_control: ephemeral`
- System instructions: Hardcoded thesis context for AML research
- Benefit: 90% cost reduction + faster responses for repeated context

### Vector Service Implementation

**Location:** `backend/app/services/vector_service.py`

**Design Patterns:**
- Singleton pattern for model efficiency
- Lazy loading of embedding model
- JSON persistence with in-memory operations

**Key Methods:**
- `upsert(doc_id, user_id, title, text)`: Add/update document vector
- `delete(doc_id, user_id)`: Remove document
- `search(query, user_id, top_k=5)`: Find similar documents

**Trade-offs:**
- ✅ Simple deployment, no extra services
- ✅ Fast for <10k documents
- ❌ RAM usage scales with dataset size
- ❌ No ANN indexing (not production-scale)

### Frontend Architecture

**Routing Structure:**
- `/` - Dashboard: Knowledge table + chat sessions sidebar
- `/exa-showcase` - ExaShowcase: Academic paper search interface
- `/chat-widget` - ChatWidget: Full-screen chat view

**API Client Pattern:**
- Centralized axios instance in `api/client.js`
- JWT auto-attached via request interceptor
- Global 401 handling via response interceptor (redirects to login)

**State Management:**
- Simple component state (React hooks)
- JWT token in localStorage
- Username extracted from decoded JWT client-side

**Design System:**
- Custom Tailwind theme with HuggingFace-inspired colors
- Primary: `#FFD21E` (HF Yellow)
- Background: `#0b0f19` (Deep dark blue)
- Typography: Inter font family

## Data Models

### MongoDB Collections

**users:**
```javascript
{
  username: string,      // Unique
  password: string       // Bcrypt hashed
}
```

**saved_research:**
```javascript
{
  _id: ObjectId,
  user_id: string,
  title: string,
  url: string,
  text: string,          // Full paper content for RAG
  saved_at: string,      // ISO datetime
  tags: string[],
  is_favorite: boolean,
  note: string
}
```

**chat_sessions:**
```javascript
{
  _id: ObjectId,
  user_id: string,
  title: string,
  type: "knowledge_base" | "research",
  created_at: string,
  last_message: string,
  messages: [
    {
      role: "user" | "ai",
      text: string,
      timestamp: string,
      sources?: array    // Only for AI messages
    }
  ]
}
```

**vectors.json:**
```json
[
  {
    "id": "doc_id",
    "user_id": "username",
    "title": "Paper Title",
    "text": "Full text...",
    "embedding": [0.123, -0.456, ...]  // 384 dims
  }
]
```

## API Endpoints

**Base URL:** `http://localhost:8000/api/v1`

**Authentication:** All endpoints except `/auth/*` require `Authorization: Bearer <token>`

**Auth:**
- `POST /auth/register` - Create user
- `POST /auth/login` - Get JWT token (24h expiration)

**Knowledge Management:**
- `GET /knowledge/exa-search?query=...` - Search academic papers
- `GET /knowledge/saved-results` - List saved papers
- `POST /knowledge/saved-results` - Save paper (triggers vector embedding)
- `PUT /knowledge/saved-results/{id}` - Update tags/notes/favorite
- `DELETE /knowledge/saved-results/{id}` - Delete paper + vector

**Chat:**
- `GET /chats/?type=...` - List chat sessions
- `POST /chats/` - Create new session
- `DELETE /chats/{id}` - Delete session
- `POST /chats/query` - Send message (executes RAG pipeline)

## Key Implementation Details

### Service Singletons

Global service instances in `backend/app/main.py`:
- `chat_service`: Handles LLM interactions
- `knowledge_service`: Manages saved papers
- `vector_service`: Handles embeddings

**Why singletons?** Avoid reloading embedding model (expensive) and maintain in-memory vector cache.

### Thesis-Specific Prompt Engineering

**Location:** `backend/app/services/prompt_builder.py`

The system prompt is hardcoded for AML research with specific instructions:
- Research domain: "Data-driven approaches to Anti-Money Laundering"
- Citation format: Markdown links `[Title](URL)`
- Context about user's knowledge base and research goals

**To modify for different research domains:** Edit `prompt_builder.build_system_message()`

### Exa AI Integration

**Location:** `backend/app/services/knowledge_service.py:search_exa()`

Searches academic papers with parameters:
- `type="auto"`: Auto-detect content type
- `use_autoprompt=True`: Exa optimizes query
- Returns: Title, URL, text excerpt

### Docker Development Workflow

All services run with hot reload:
- Frontend: Vite dev server with volume mount
- Backend: Uvicorn `--reload` with volume mount
- MongoDB: Persistent volume `mongo_data`

Code changes reflect immediately without rebuilding containers.

## Important Patterns

### Authentication Flow

1. User submits credentials → `POST /auth/login`
2. Backend validates → Returns JWT token
3. Frontend stores token in localStorage
4. Frontend decodes JWT client-side to extract username
5. All subsequent requests include `Authorization: Bearer <token>`
6. Backend validates token via `deps.get_current_user` dependency

### Paper Save Flow

1. User searches via Exa → Results displayed
2. User clicks "Save" → `POST /knowledge/saved-results`
3. Backend checks for duplicates (URL-based)
4. Insert into MongoDB `saved_research` collection
5. Call `vector_service.upsert()`:
   - Generate embedding from text
   - Append to `vectors.json`
6. Frontend updates UI

### Chat Query Flow

1. User sends message → `POST /chats/query`
2. `chat_service.process_query()`:
   - Load last 10 messages from session
   - `context_builder.build()`:
     - Fetch all saved paper titles (library overview)
     - Vector search for top 5 relevant excerpts
   - `prompt_builder.build_system_message()`:
     - Add thesis context
     - Mark library/RAG for caching
   - Call Claude API with constructed prompt
   - Parse response and extract sources
   - Save user message + AI response to MongoDB
3. Frontend displays AI response with citation links

## Security Considerations

- **Password Storage:** Bcrypt with salt via `passlib`
- **JWT Tokens:** 24-hour expiration
- **User Data Isolation:** All database queries filter by `user_id`
- **API Keys:** Stored in `.env` (gitignored)
- **CORS:** Configured for specific origins
- **Input Validation:** Pydantic models on all endpoints

## Deployment Notes

**Current setup:** Docker Compose for development

**Production considerations:**
- Switch to production-grade vector DB (Pinecone, Weaviate)
- Add Redis for session caching
- Implement API rate limiting
- Use managed MongoDB (MongoDB Atlas)
- Add proper logging (replace print statements)
- Set up monitoring and error tracking
- Use environment-specific configs

## Recent Architectural Changes

**Commit 165fbee:** Refactored backend to clean architecture
- Separated API routes, services, models, and core infrastructure
- Improved testability and maintainability

**Commit ba912f1:** Switched from ChromaDB to JSON vector store
- Simplified deployment (no extra dependencies)
- Direct control over vector operations
- Improved reindexing logic

**Commit 2ded1c7:** Separated context and prompt building
- Extracted `context_builder.py` for RAG context assembly
- Extracted `prompt_builder.py` for system prompt construction
- Cleaner separation of concerns in chat service

**Branch ui/new-look:** UI redesign in progress
- Updated Tailwind configuration
- HuggingFace-inspired color scheme
- Component style improvements
