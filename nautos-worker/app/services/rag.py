import logging
import time

from app.services.embeddings import EmbeddingService
from app.services.search import SearchService
from app.services.vectordb import VectorDBService
from app.services.privacy import PrivacyService
from app.services.llm import LLMService

logger = logging.getLogger(__name__)


class RAGService:
    """
    12-step hybrid RAG pipeline:
    1. Embed question
    2. Keyword search (Elasticsearch BM25)
    3. Vector search (pgvector — vessel, fleet, master scopes)
    4. Reciprocal Rank Fusion
    5. Priority boost (vessel×1.15, fleet×1.05, master×1.00)
    6. Score threshold filter
    7. Top 10 chunks
    8. Strip PII from master chunks
    9. Build context with scope labels
    10. Stream to Claude
    11. Return answer + sources
    12. Log query
    """

    SCORE_THRESHOLD = 0.3
    TOP_K = 10
    BOOST_VESSEL = 1.15
    BOOST_FLEET = 1.05
    BOOST_MASTER = 1.00
    RRF_K = 60  # RRF constant

    def __init__(self):
        self.embedder = EmbeddingService()
        self.search = SearchService()
        self.vectordb = VectorDBService()
        self.privacy = PrivacyService()
        self.llm = LLMService()

    def query(
        self,
        question: str,
        tenant_id: str,
        vessel_id: str | None = None,
        tenant_name: str = "",
    ) -> dict:
        """Execute the full RAG pipeline, return answer + sources."""
        start_time = time.time()

        # Step 1: Embed question
        query_vector = self.embedder.embed_query(question)

        # Step 2: Keyword search via Elasticsearch
        keyword_results = self.search.keyword_search(
            query=question, tenant_id=tenant_id, vessel_id=vessel_id, top_k=20
        )

        # Step 3: Vector search via pgvector
        vector_results = self.vectordb.vector_search(
            query_embedding=query_vector,
            tenant_id=tenant_id,
            vessel_id=vessel_id,
            top_k=20,
        )

        # Step 4: Reciprocal Rank Fusion
        fused = self._reciprocal_rank_fusion(keyword_results, vector_results)

        # Step 5: Priority boost by scope
        for item in fused:
            scope = item.get("scope", "vessel")
            if scope == "vessel":
                item["final_score"] = item["rrf_score"] * self.BOOST_VESSEL
            elif scope == "fleet":
                item["final_score"] = item["rrf_score"] * self.BOOST_FLEET
            else:
                item["final_score"] = item["rrf_score"] * self.BOOST_MASTER

        # Step 6: Score threshold filter
        fused = [r for r in fused if r["final_score"] >= self.SCORE_THRESHOLD]

        # Step 7: Top 10
        fused.sort(key=lambda x: x["final_score"], reverse=True)
        top_chunks = fused[: self.TOP_K]

        if not top_chunks:
            return {
                "answer": "I couldn't find relevant information in the available documentation to answer your question.",
                "sources": [],
                "response_time_ms": int((time.time() - start_time) * 1000),
            }

        # Step 8: Strip PII from master chunks
        for chunk in top_chunks:
            if chunk.get("scope") == "master":
                chunk["text"] = self.privacy.strip_master_metadata(
                    chunk["text"], tenant_name
                )

        # Step 9: Build context with scope labels
        context = self._build_context(top_chunks)

        # Step 10: Get answer from Claude
        answer = self.llm.get_answer(question, context)

        # Step 11: Collect sources
        sources = []
        seen_docs = set()
        for chunk in top_chunks:
            doc_id = chunk["document_id"]
            if doc_id not in seen_docs:
                seen_docs.add(doc_id)
                sources.append({
                    "document_id": doc_id,
                    "title": chunk.get("title", ""),
                    "page_number": chunk.get("page_number"),
                    "scope": chunk.get("scope", "vessel"),
                })

        response_time_ms = int((time.time() - start_time) * 1000)

        return {
            "answer": answer,
            "sources": sources,
            "response_time_ms": response_time_ms,
        }

    def stream_query(
        self,
        question: str,
        tenant_id: str,
        vessel_id: str | None = None,
        tenant_name: str = "",
    ):
        """Execute RAG pipeline and yield streaming tokens."""
        query_vector = self.embedder.embed_query(question)

        keyword_results = self.search.keyword_search(
            query=question, tenant_id=tenant_id, vessel_id=vessel_id, top_k=20
        )
        vector_results = self.vectordb.vector_search(
            query_embedding=query_vector,
            tenant_id=tenant_id,
            vessel_id=vessel_id,
            top_k=20,
        )

        fused = self._reciprocal_rank_fusion(keyword_results, vector_results)

        for item in fused:
            scope = item.get("scope", "vessel")
            if scope == "vessel":
                item["final_score"] = item["rrf_score"] * self.BOOST_VESSEL
            elif scope == "fleet":
                item["final_score"] = item["rrf_score"] * self.BOOST_FLEET
            else:
                item["final_score"] = item["rrf_score"] * self.BOOST_MASTER

        fused = [r for r in fused if r["final_score"] >= self.SCORE_THRESHOLD]
        fused.sort(key=lambda x: x["final_score"], reverse=True)
        top_chunks = fused[: self.TOP_K]

        if not top_chunks:
            yield {"type": "text", "content": "I couldn't find relevant information in the available documentation."}
            yield {"type": "sources", "content": []}
            yield {"type": "done"}
            return

        for chunk in top_chunks:
            if chunk.get("scope") == "master":
                chunk["text"] = self.privacy.strip_master_metadata(chunk["text"], tenant_name)

        context = self._build_context(top_chunks)

        sources = []
        seen_docs = set()
        for chunk in top_chunks:
            doc_id = chunk["document_id"]
            if doc_id not in seen_docs:
                seen_docs.add(doc_id)
                sources.append({
                    "document_id": doc_id,
                    "title": chunk.get("title", ""),
                    "page_number": chunk.get("page_number"),
                    "scope": chunk.get("scope", "vessel"),
                })

        for text_chunk in self.llm.stream_answer(question, context):
            yield {"type": "text", "content": text_chunk}

        yield {"type": "sources", "content": sources}
        yield {"type": "done"}

    def _reciprocal_rank_fusion(
        self, keyword_results: list[dict], vector_results: list[dict]
    ) -> list[dict]:
        """Merge keyword and vector results using RRF scoring."""
        scores: dict[str, dict] = {}

        for rank, result in enumerate(keyword_results):
            key = f"{result['document_id']}:{result.get('page_number', 0)}"
            if key not in scores:
                scores[key] = {**result, "rrf_score": 0.0}
            scores[key]["rrf_score"] += 1.0 / (self.RRF_K + rank + 1)

        for rank, result in enumerate(vector_results):
            key = f"{result['document_id']}:{result.get('page_number', 0)}"
            if key not in scores:
                scores[key] = {**result, "rrf_score": 0.0}
            scores[key]["rrf_score"] += 1.0 / (self.RRF_K + rank + 1)

        return list(scores.values())

    def _build_context(self, chunks: list[dict]) -> str:
        """Build labeled context block for Claude."""
        sections = []
        for chunk in chunks:
            scope = chunk.get("scope", "vessel").upper()
            title = chunk.get("title", "Unknown Document")
            page = chunk.get("page_number", "?")
            sections.append(
                f"[{scope}] {title} (Page {page}):\n{chunk['text']}"
            )
        return "\n\n---\n\n".join(sections)
