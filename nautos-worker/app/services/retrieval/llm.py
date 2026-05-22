"""
LLM service for RAG answer generation.

Supports multiple providers:
- gemini  (default) — Google Gemini 2.0 Flash (free tier: 15 RPM, 1M tokens/day)
- anthropic         — Claude Sonnet 4.6 (requires paid API key)

Set LLM_PROVIDER and the corresponding API key in .env.
"""

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


def _build_user_message(question: str, context: str) -> str:
    return f"""Based on the following documentation context, answer the question.

<context>
{context}
</context>

Question: {question}"""


class GeminiLLM:
    """Google Gemini streaming client."""

    def __init__(self):
        from google import genai

        self.client = genai.Client(api_key=settings.gemini_api_key)
        self.model = "gemini-2.0-flash"

    def stream_answer(self, question: str, context: str):
        user_message = _build_user_message(question, context)
        response = self.client.models.generate_content_stream(
            model=self.model,
            contents=user_message,
            config={
                "system_instruction": SYSTEM_PROMPT,
                "max_output_tokens": 2048,
                "temperature": 0.3,
            },
        )
        for chunk in response:
            if chunk.text:
                yield chunk.text

    def get_answer(self, question: str, context: str) -> str:
        user_message = _build_user_message(question, context)
        response = self.client.models.generate_content(
            model=self.model,
            contents=user_message,
            config={
                "system_instruction": SYSTEM_PROMPT,
                "max_output_tokens": 2048,
                "temperature": 0.3,
            },
        )
        return response.text


class AnthropicLLM:
    """Anthropic Claude streaming client."""

    def __init__(self):
        import anthropic

        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        self.model = "claude-sonnet-4-6-20250514"

    def stream_answer(self, question: str, context: str):
        user_message = _build_user_message(question, context)
        with self.client.messages.stream(
            model=self.model,
            max_tokens=2048,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        ) as stream:
            for text in stream.text_stream:
                yield text

    def get_answer(self, question: str, context: str) -> str:
        user_message = _build_user_message(question, context)
        response = self.client.messages.create(
            model=self.model,
            max_tokens=2048,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )
        return response.content[0].text


class LLMService:
    """Factory that picks the right LLM based on config."""

    def __init__(self):
        provider = settings.llm_provider.lower()
        if provider == "anthropic" and settings.anthropic_api_key:
            self._impl = AnthropicLLM()
        elif provider == "gemini" and settings.gemini_api_key:
            self._impl = GeminiLLM()
        elif settings.gemini_api_key:
            # Fallback: use whatever key is available
            self._impl = GeminiLLM()
        elif settings.anthropic_api_key:
            self._impl = AnthropicLLM()
        else:
            raise RuntimeError(
                "No LLM API key configured. Set GEMINI_API_KEY or ANTHROPIC_API_KEY in .env"
            )

    def stream_answer(self, question: str, context: str):
        yield from self._impl.stream_answer(question, context)

    def get_answer(self, question: str, context: str) -> str:
        return self._impl.get_answer(question, context)
