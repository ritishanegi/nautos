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

CRITICAL RULES — these are non-negotiable:

1. ONLY use information from the provided <context>. Never infer, synthesize beyond the text, or fill in gaps from general knowledge.
2. If the answer is not in the context, respond exactly: "Not found in the provided documentation." Do not guess.
3. Quote part numbers, ident numbers, codes, torque values, intervals, and specifications EXACTLY as written — character-for-character.
4. For tables: output ALL rows present in the context. Never abbreviate with "...", "and so on", or "(continues)". If a table has 57 rows in the context, your output has 57 rows.
5. Cite every factual claim using [Source: document title, page X] format. If you cannot cite it, you cannot say it.
6. For multilingual documents (German/English/French maritime manuals), preserve the original language in part designations and add English translation in parentheses if helpful.
7. For maintenance procedures, list every step in the order shown — no skipping.
8. Format tables as proper Markdown tables (with `|` and `---` separators) so they render in the UI.

When the user is having a multi-turn conversation, you may use prior messages for context (e.g. "what about its weight?" refers to the previously discussed item), but every factual claim must still come from <context>.

Maritime engineers will trust your answers to maintain equipment that costs millions and protect lives. Accuracy over creativity, always."""

# Max number of prior chat turns to include — limits prompt cost + latency
MAX_HISTORY_TURNS = 10


def _build_user_message(question: str, context: str) -> str:
    return f"""Based on the following documentation context, answer the question.

<context>
{context}
</context>

Question: {question}"""


def _truncate_history(history: list[dict] | None) -> list[dict]:
    """Keep only the last MAX_HISTORY_TURNS messages (user+assistant pairs)."""
    if not history:
        return []
    return history[-MAX_HISTORY_TURNS:]


class GroqLLM:
    """Groq streaming client — uses Llama 3.3 70B by default."""

    def __init__(self):
        from groq import Groq

        self.client = Groq(api_key=settings.groq_api_key)
        # Llama 3.3 70B: solid quality, very fast on Groq's LPU hardware
        self.model = "llama-3.3-70b-versatile"

    def _build_messages(self, question: str, context: str, chat_history: list[dict] | None):
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        messages.extend(_truncate_history(chat_history))
        messages.append({"role": "user", "content": _build_user_message(question, context)})
        return messages

    def stream_answer(self, question: str, context: str, chat_history: list[dict] | None = None):
        stream = self.client.chat.completions.create(
            model=self.model,
            messages=self._build_messages(question, context, chat_history),
            max_tokens=4000,
            temperature=0.1,
            stream=True,
        )
        for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta

    def get_answer(self, question: str, context: str, chat_history: list[dict] | None = None) -> str:
        response = self.client.chat.completions.create(
            model=self.model,
            messages=self._build_messages(question, context, chat_history),
            max_tokens=4000,
            temperature=0.1,
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

    def _build_contents(self, question: str, context: str, chat_history: list[dict] | None):
        # Gemini uses "contents" with role 'user' / 'model' (not 'assistant')
        contents = []
        for msg in _truncate_history(chat_history):
            role = "model" if msg["role"] == "assistant" else "user"
            contents.append({"role": role, "parts": [{"text": msg["content"]}]})
        contents.append({
            "role": "user",
            "parts": [{"text": _build_user_message(question, context)}],
        })
        return contents

    def stream_answer(self, question: str, context: str, chat_history: list[dict] | None = None):
        response = self.client.models.generate_content_stream(
            model=self.model,
            contents=self._build_contents(question, context, chat_history),
            config={
                "system_instruction": SYSTEM_PROMPT,
                "max_output_tokens": 4000,
                "temperature": 0.1,
            },
        )
        for chunk in response:
            if chunk.text:
                yield chunk.text

    def get_answer(self, question: str, context: str, chat_history: list[dict] | None = None) -> str:
        response = self.client.models.generate_content(
            model=self.model,
            contents=self._build_contents(question, context, chat_history),
            config={
                "system_instruction": SYSTEM_PROMPT,
                "max_output_tokens": 4000,
                "temperature": 0.1,
            },
        )
        return response.text


class AnthropicLLM:
    """Anthropic Claude streaming client."""

    def __init__(self):
        import anthropic

        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        self.model = "claude-sonnet-4-6-20250514"

    def _build_messages(self, question: str, context: str, chat_history: list[dict] | None):
        # Anthropic accepts the standard role/content shape directly
        messages = list(_truncate_history(chat_history))
        messages.append({"role": "user", "content": _build_user_message(question, context)})
        return messages

    def stream_answer(self, question: str, context: str, chat_history: list[dict] | None = None):
        with self.client.messages.stream(
            model=self.model,
            max_tokens=4000,
            system=SYSTEM_PROMPT,
            messages=self._build_messages(question, context, chat_history),
        ) as stream:
            for text in stream.text_stream:
                yield text

    def get_answer(self, question: str, context: str, chat_history: list[dict] | None = None) -> str:
        response = self.client.messages.create(
            model=self.model,
            max_tokens=4000,
            system=SYSTEM_PROMPT,
            messages=self._build_messages(question, context, chat_history),
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

    def stream_answer(self, question: str, context: str, chat_history: list[dict] | None = None):
        yield from self._impl.stream_answer(question, context, chat_history=chat_history)

    def get_answer(self, question: str, context: str, chat_history: list[dict] | None = None) -> str:
        return self._impl.get_answer(question, context, chat_history=chat_history)
