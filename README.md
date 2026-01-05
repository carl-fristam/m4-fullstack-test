# Research Tool

A custom research assistant I built for my MSc. Used to find, organize, and chat with research papers.

## What is it?
It's a full-stack web app that combines:
1.  **Exa AI**: To search for high-quality academic papers.
2.  **RAG Pipeline**: To save papers and index them using embeddings.
3.  **Claude 4.5 Sonnet**: To chat with my saved papers for summaries and writing paragraphs.

## Tech Stack
*   **Frontend**: React (Vite) + Tailwind + Axios
*   **Backend**: Python (FastAPI) + Clean Architecture
*   **Database**: MongoDB (Metadata) + Local Vector Store (Embeddings)

## Setup
1.  Clone it.
2.  Add your keys to `backend/.env` (`ANTHROPIC_API_KEY`, `EXA_API_KEY`, `SECRET_KEY`).
3.  Run it:
    ```bash
    docker-compose up --build
    ```