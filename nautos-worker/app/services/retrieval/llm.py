"""
LLM service for RAG answer generation.

Supports multiple providers (swappable via LLM_PROVIDER env var):
- groq       (default) — Llama 3.3 70B (free tier: 30 RPM, 14,400 req/day, no card)
- gemini              — Gemini 1.5 Flash (free tier: 15 RPM, 1M TPM)
- anthropic           — Claude Sonnet 4.6 (paid, best quality — use for production)

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


class GroqLLM:
    """Groq streaming client — uses Llama 3.3 70B by default."""

    def __init__(self):
        from groq import Groq

        self.client = Groq(api_key=settings.groq_api_key)
        # Llama 3.3 70B: solid quality, very fast on Groq's LPU hardware
        self.model = "llama-3.3-70b-versatile"

    def stream_answer(self, question: str, context: str):
        user_message = _build_user_message(question, context)
        stream = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            max_tokens=2048,
            temperature=0.3,
            stream=True,
        )
        for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta

    def get_answer(self, question: str, context: str) -> str:
        user_message = _build_user_message(question, context)
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            max_tokens=2048,
            temperature=0.3,
        )
        return response.choices[0].message.content


class GeminiLLM:
    """Google Gemini streaming client."""

    def __init__(self):
        from google import genai

        self.client = genai.Client(api_key=settings.gemini_api_key)
        # gemini-1.5-flash has the most reliable free-tier quota allocation
        # Free tier: 15 RPM, 1M TPM, 1,500 RPD
        self.model = "gemini-1.5-flash"

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


# Provider registry — easy to extend by adding new entries
_PROVIDERS = {
    "groq": (GroqLLM, "groq_api_key"),
    "gemini": (GeminiLLM, "gemini_api_key"),
    "anthropic": (AnthropicLLM, "anthropic_api_key"),
}


def _is_valid_key(key: str) -> bool:
    """Treat empty/placeholder strings as missing keys."""
    return bool(key) and key.strip().lower() not in ("placeholder", "")


class LLMService:
    """Factory that picks the right LLM based on LLM_PROVIDER + key availability."""

    def __init__(self):
        provider = settings.llm_provider.lower()

        # Try the requested provider first
        if provider in _PROVIDERS:
            cls, key_attr = _PROVIDERS[provider]
            if _is_valid_key(getattr(settings, key_attr)):
                self._impl = cls()
                return

        # Fallback: use any provider that has a valid key
        for name, (cls, key_attr) in _PROVIDERS.items():
            if _is_valid_key(getattr(settings, key_attr)):
                self._impl = cls()
                return

        raise RuntimeError(
            "No LLM API key configured. Set one of GROQ_API_KEY, GEMINI_API_KEY, "
            "or ANTHROPIC_API_KEY in .env (and LLM_PROVIDER to match)."
        )

    def stream_answer(self, question: str, context: str):
        yield from self._impl.stream_answer(question, context)

    def get_answer(self, question: str, context: str) -> str:
        return self._impl.get_answer(question, context)
