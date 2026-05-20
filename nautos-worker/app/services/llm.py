import anthropic

from app.config import settings

SYSTEM_PROMPT = """You are NAUTOS AI, a maritime technical expert assistant. You help ship engineers, fleet managers, and technical superintendents find accurate information from vessel documentation.

Rules:
1. Only answer based on the provided context. If the answer is not in the context, say so clearly.
2. Cite your sources using [Source: document title, page X] format.
3. For maintenance procedures, list steps clearly and in order.
4. For part numbers, specifications, or measurements, quote them exactly as they appear.
5. If multiple documents contain relevant information, synthesize them and cite each.
6. Be concise but complete. Maritime professionals need actionable answers.
7. If the context contains tables, format your answer to preserve that structure.
8. Never fabricate part numbers, intervals, or specifications."""


class LLMService:
    """Anthropic Claude streaming client for RAG answers."""

    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        self.model = "claude-sonnet-4-6-20250514"

    def stream_answer(self, question: str, context: str):
        """
        Stream RAG answer from Claude.
        Yields text chunks as they arrive.
        """
        user_message = f"""Based on the following documentation context, answer the question.

<context>
{context}
</context>

Question: {question}"""

        with self.client.messages.stream(
            model=self.model,
            max_tokens=2048,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        ) as stream:
            for text in stream.text_stream:
                yield text

    def get_answer(self, question: str, context: str) -> str:
        """Non-streaming answer for batch/logging use."""
        user_message = f"""Based on the following documentation context, answer the question.

<context>
{context}
</context>

Question: {question}"""

        response = self.client.messages.create(
            model=self.model,
            max_tokens=2048,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )
        return response.content[0].text
