import logging

from app.celery_app import celery
from app.services.rag import RAGService
from app.services.db import get_connection

logger = logging.getLogger(__name__)


@celery.task(bind=True, name="run_query")
def run_query(
    self,
    question: str,
    tenant_id: str,
    user_id: str | None = None,
    vessel_id: str | None = None,
):
    """
    Execute RAG query pipeline (non-streaming, for async/batch use).
    Logs query to query_log table.
    """
    rag = RAGService()
    result = rag.query(question=question, tenant_id=tenant_id, vessel_id=vessel_id)

    # Step 12: Log query
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO query_log (tenant_id, user_id, vessel_id, question, answer, sources, response_time_ms)
                VALUES (%s, %s, %s, %s, %s, %s::jsonb, %s)
                """,
                (
                    tenant_id,
                    user_id,
                    vessel_id,
                    question,
                    result["answer"],
                    str(result["sources"]).replace("'", '"'),
                    result["response_time_ms"],
                ),
            )
        conn.commit()
    finally:
        conn.close()

    return result
