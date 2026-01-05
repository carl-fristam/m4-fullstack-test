class PromptBuilder:
    
    THESIS_CONTEXT = """
This thesis investigates data-driven approaches to Anti-Money Laundering (AML) using operational-grade transaction-monitoring data from a collaborating bank. The study applies data science methods to compare unsupervised and graph-based modeling approaches in their ability to capture transaction patterns relative to the bank’s existing supervised AML models and operational framework. In addition, the study explores graph-based representations of transaction data and the potential of graph neural network (GNN) methods in enhancing fraud detection and explainability within AML. The analysis focuses on comparative performance metrics and model-specific explainability techniques.
"""

    BASE_INSTRUCTION = """
You are a research assistant helping with a thesis. 
THESIS CONTEXT:
{thesis_context}

You have access to a Library Overview (all titles) and Relevant Document Excerpts (content). Use this Context for general questions about the thesis topic without needing to look up sources. Use the Library Overview for counting/grouping questions, and Relevant Excerpts for specific content questions. Format with Markdown. IMPORTANT: When mentioning a saved source, you MUST link it using markdown format: [Title](URL) using the URL provided in the Library Overview.
"""

    def build_system_message(self, library_context: str, rag_context: str) -> list:
        """
        Constructs the full system message payload for the LLM.
        """
        system_text = self.BASE_INSTRUCTION.format(thesis_context=self.THESIS_CONTEXT.strip())
        
        return [
            {
                "type": "text", 
                "text": library_context, 
                "cache_control": {"type": "ephemeral"}
            },
            {
                "type": "text", 
                "text": rag_context,
                "cache_control": {"type": "ephemeral"}
            },
            {
                "type": "text", 
                "text": system_text
            }
        ]

prompt_builder = PromptBuilder()