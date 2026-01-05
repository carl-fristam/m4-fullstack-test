from app.services.vector_service import get_vector_service
from app.services.knowledge_service import knowledge_service

class ContextBuilder:

    def __init__(self):
        self.vector_service = get_vector_service()

    async def build(self, query: str, user_id: str) -> tuple[str, str, list]:
        # 1. Get the library overview for a given user
        all_sources = await knowledge_service.get_all_titles(user_id)
        library_context = f"Library Overview ({len(all_sources)} total sources):\n"
        for s in all_sources:
            library_context += f"- {s['title']} (URL: {s.get('url', 'None')}, Date: {s['date']})\n"

        # 2. RAG Search
        search_results = self.vector_service.search(query, user_id, n_results=5)
    
        # 3. Build Context (RAG)
        source_texts = []
        source_titles = []
        MAX_LEN = 2000

        for s in search_results:
            title = s['metadata'].get('title', 'Untitled')

            content = s.get('text', '')
            if len(content) > MAX_LEN: content = content[:MAX_LEN] + "..."
            
            source_texts.append(f"Source: {title}\nContent: {content}\n---\n")
            source_titles.append(title)
            
        rag_context = "Relevant Document Excerpts (RAG):\n" + "".join(source_texts)
            
        return library_context, rag_context, source_titles

context_builder = ContextBuilder()