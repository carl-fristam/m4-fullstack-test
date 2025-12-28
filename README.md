# Research Assistant Platform

A full-stack application for automated research gathering for my MSc. The system integrates EXA AI search with a retrieval-augmented generation (RAG) (MongoDB, VectorDB, Claude) pipeline to provide context-aware responses based on a private knowledge base. Recent updates focus on performance optimization through prompt caching and improved research continuity through session management.

## Core Features

- **Neural Search**: Integrated with Exa AI for semantic search across research papers and web content, featuring persistent search sessions and metadata persistence.
- **Session Management**: Independent history tracking for research discovery and knowledge base interaction, allowing users to switch between ongoing research tasks.
- **Contextual Synthesis**: Anthropic Claude 4.5 Sonnet for generating grounded summaries. The system uses advanced context loading with stable source sorting to maximize cache efficiency.
- **Performance Optimization**: Implementation of Anthropic prompt caching to reduce latency and API costs during prolonged research sessions.
- **Knowledge Base Isolation**: JWT-based authentication ensures strictly isolated per-user data environments.
- **Advanced UX**: Unified blue accent design system, real-time website previews, and robust data management features including an undo-delete mechanism.

## Architecture

- **Frontend**: Built with React and Vite. Employs a modern, responsive interface using vanilla CSS for a distinct "glassmorphism" aesthetic and unified blue color language.
- **Backend**: FastAPI (Python) handles asynchronous orchestration between the MongoDB persistence layer and the Anthropic/Exa AI services.
- **Database**: MongoDB tracks user accounts, multi-type chat history (research vs. knowledge base), and source metadata.
- **Vector DB**: A persistent local vector store utilizing `SentenceTransformer` (all-MiniLM-L6-v2) for semantic indexing of saved research papers.

## Technical Implementation Details

### Prompt Caching Logic
To optimize LLM interaction, the backend sorts saved sources by their database ID before constructing the system prompt. This ensures a stable context prefix, which enables Anthropic's prompt caching to effectively reuse processed tokens across multiple queries in the same research session.

### State Synchronization
The frontend maintains a robust sync between the central dashboard and the floating chat widget. Session IDs are tracked via localStorage and sessionStorage to allow Seamless transitions between different research contexts without losing unsaved progress.

## Setup

1. **Environment Configuration**:
   Create a `.env` file in the `backend/` directory:

   ```env
   # API Keys
   ANTHROPIC_API_KEY=your_anthropic_key
   EXA_API_KEY=your_exa_key

   # Model Selection
   CLAUDE_MODEL=claude-sonnet-4-5-20250929

   # Persistence
   MONGO_DETAILS=mongodb://mongo:27017
   ```

2. **Deployment**:
   The application is containerized using Docker Compose for consistent environment management.

   ```bash
   docker-compose up --build -d
   ```

   The frontend is available at `http://localhost:5173`.

## Workflow

1. **Discovery**: Utilize the search interface to identify relevant sources using Exa's neural search. Preview results in real-time within the platform.
2. **Curation**: Save findings to the knowledge base. Sources are automatically indexed in the vector store and becomes immediately available for chat context.
3. **Synthesis**: Pivot to the chat interface to query the combined intelligence of your saved library. The system automatically injects relevant snippets while optimizing for speed.
4. **Continuity**: Use the history sidebars to revisit previous research threads or search results, maintaining context over complex multi-day projects.