import json
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
            yield f"data: {json.dumps(event)}\n\n"

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
