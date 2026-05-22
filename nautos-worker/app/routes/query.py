import json
from uuid import UUID
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.services.retrieval.rag import RAGService

router = APIRouter()


class QueryRequest(BaseModel):
    question: str
    tenant_id: str
    vessel_id: str | None = None
    user_id: str | None = None


def _json_default(obj):
    """JSON serializer fallback — converts UUIDs (from psycopg) to strings."""
    if isinstance(obj, UUID):
        return str(obj)
    raise TypeError(f"Object of type {obj.__class__.__name__} is not JSON serializable")


@router.post("/query/stream")
async def stream_query(req: QueryRequest):
    """SSE endpoint for streaming RAG answers."""
    rag = RAGService()

    def event_stream():
        for event in rag.stream_query(
            question=req.question,
            tenant_id=req.tenant_id,
            vessel_id=req.vessel_id,
        ):
            yield f"data: {json.dumps(event, default=_json_default)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/query")
async def query(req: QueryRequest):
    """Non-streaming query endpoint."""
    rag = RAGService()
    result = rag.query(
        question=req.question,
        tenant_id=req.tenant_id,
        vessel_id=req.vessel_id,
    )
    return result
