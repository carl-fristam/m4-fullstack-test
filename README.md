# MSc Research Tool

Full-stack application for gathering and organizing research. Built with React, FastAPI, and MongoDB.

## Features

- **Semantic Search**: Uses Exa AI for neural search to find research papers and articles.
- **Two-Stage RAG**: Scalable RAG pipeline supporting 100+ sources.
    - Uses Claude Haiku for fast candidate selection from the knowledge base.
    - Uses Claude 3.5 Sonnet for final synthesis and response generation.
- **Data Isolation**: Multi-tenant architecture using JWT authentication and user-scoped vector search.
- **Real-time Chat**: Streaming responses via Server-Sent Events (SSE).
- **Productivity Tools**: Conversation reset and clipboard copy functionality.

## Tech Stack

- **Frontend**: React, Tailwind CSS, Vite
- **Backend**: FastAPI, AsyncAnthropic, Exa-Py
- **Database**: MongoDB (Persistence)
- **Vector Store**: Local semantic storage (Sentence-Transformers)

## Setup

1. Create a `backend/.env` file:
```env
# API Keys
ANTHROPIC_API_KEY=your_key
EXA_API_KEY=your_key

# Models
CLAUDE_MODEL=claude-sonnet-4-5-20250929
HAIKU_MODEL=claude-3-5-haiku-20241022

# Database
MONGO_DETAILS=mongodb://mongo:27017
```

2. Deploy using Docker:
```bash
docker-compose up --build -d
```
Access the application at `http://localhost:5173`.

## Usage

1. **Search**: Find relevant papers via the search interface.
2. **Save**: Add findings to your isolated knowledge base.
3. **Analyze**: Use the chat container to query your saved research.
4. **Manage**: Reset chats or copy outputs as needed.