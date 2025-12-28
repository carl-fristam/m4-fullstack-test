# Research Assistant Platform

A full-stack application for automated research gathering and synthesis. The system integrates neural search with a retrieval-augmented generation (RAG) pipeline to provide context-aware responses based on a private knowledge base.

## Core Features

- **Neural Search**: Exa AI for semantic search across research papers and web content.
- **Knowledge Base Isolation**: JWT-based authentication ensuring user-specific data isolation.
- **Semantic Retrieval**: Vector store using `sentence-transformers` for efficient retrieval.
- **LLM**: Anthropic Claude 4.5 Sonnet for generating summaries and overviews of saved sources.
- **Conversation Management**: Persistance across chat sessions and previous Exa searches.

## Architecture

- **Frontend**: React and Vite with Tailwind CSS for a responsive, modern interface.
- **Backend**: FastAPI (Python) implementing asynchronous API endpoints and LLM orchestration.
- **Database**: MongoDB for persisting user accounts, chat history, and metadata.
- **Vector DB**: Local implementation using `SentenceTransformer` (all-MiniLM-L6-v2) and persistent storage via NumPy/Pickle.

## Setup

1. **Environment Configuration**:
   Create a `.env` file in the `backend/` directory with the following variables:

   ```env
   # API Configuration
   ANTHROPIC_API_KEY=your_anthropic_key
   EXA_API_KEY=your_exa_key

   # Model Configuration
   CLAUDE_MODEL=claude-sonnet-4-5-20250929

   # Database Configuration
   MONGO_DETAILS=mongodb://mongo:27017
   ```

2. **Container Deployment**:
   The application is containerized using Docker Compose for consistent environment management across development and production.

   ```bash
   docker-compose up --build -d
   ```

   The frontend is accessible at `http://localhost:5173`.

## Workflow

1. **Discovery**: Use the search interface to identify relevant sources using Exa's neural search capabilities.
2. **Curation**: Save search results to a personal knowledge base, where they are automatically indexed for semantic retrieval.
3. **Synthesis**: Interact with the knowledge base through the chat interface. The system retrieves relevant context from saved sources to ground AI responses.
4. **Context Tracking**: Review source citations and session history to maintain research continuity.