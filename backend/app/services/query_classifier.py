from app.models.chat import ContextNeed
from app.core.config import settings
from anthropic import Anthropic
from typing import List, Dict

class QueryClassifier:
    """
    LLM-based query intent classifier that determines whether a query
    needs expensive context building (library overview + RAG search).

    Uses Claude Haiku for fast, semantic understanding of intent.
    """

    CLASSIFICATION_PROMPT = """You are a query classifier for a research assistant system.

Determine if the user's query requires access to their saved research papers and knowledge base.

Query: "{question}"

Respond with ONLY one word:
- "HIGH" if the query explicitly asks about or requires their saved papers/knowledge base (e.g., "Compare my papers", "What sources did I save?")
- "MEDIUM" if the query is about research topics that would benefit from knowledge base context (e.g., "What is AML?", "Explain transaction monitoring")
- "MINIMAL" if the query is a follow-up or clarification about previous responses (e.g., "Can you explain that better?", "Tell me more")
- "NONE" if the query is purely conversational or off-topic (e.g., "Hi!", "Tell me a joke", "How are you?")"""

    def __init__(self):
        self.client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model = getattr(settings, 'CLASSIFIER_MODEL', settings.CLAUDE_MODEL)

    async def classify(
        self,
        question: str,
        conversation_history: List[Dict] = None
    ) -> ContextNeed:
        """
        Classify query context necessity using LLM.

        Args:
            question: The user's query
            conversation_history: Previous messages (available if needed for future enhancements)

        Returns:
            ContextNeed enum indicating how much context to load
        """
        if not question or not isinstance(question, str):
            return ContextNeed.MINIMAL

        try:
            # Call Claude Haiku for semantic classification
            response = self.client.messages.create(
                model=self.model,
                max_tokens=10,  # Just need a single word response
                messages=[
                    {
                        "role": "user",
                        "content": self.CLASSIFICATION_PROMPT.format(question=question.strip())
                    }
                ]
            )

            classification = response.content[0].text.strip().upper()

            # Map response to ContextNeed
            if "HIGH" in classification:
                return ContextNeed.HIGH
            elif "MEDIUM" in classification:
                return ContextNeed.MEDIUM
            elif "MINIMAL" in classification:
                return ContextNeed.MINIMAL
            elif "NONE" in classification:
                return ContextNeed.NONE
            else:
                # Default to MINIMAL if response unclear
                return ContextNeed.MINIMAL

        except Exception as e:
            # If classification fails, default to HIGH to be safe (always provide context)
            print(f"Query classification error: {e}")
            return ContextNeed.HIGH


# Global instance
query_classifier = QueryClassifier()
