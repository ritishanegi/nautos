import psycopg
from app.config import settings


def get_connection():
    return psycopg.connect(settings.database_url)


def update_job_status(
    document_id: str,
    status: str,
    progress: int = 0,
    total_pages: int | None = None,
    processed_pages: int = 0,
    error: str | None = None,
):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            fields = ["status = %s", "progress = %s", "processed_pages = %s"]
            params: list = [status, progress, processed_pages]

            if total_pages is not None:
                fields.append("total_pages = %s")
                params.append(total_pages)

            if status == "processing" and progress == 0:
                fields.append("started_at = NOW()")

            if status in ("complete", "failed"):
                fields.append("completed_at = NOW()")

            if error:
                fields.append("error = %s")
                params.append(error)

            params.append(document_id)
            cur.execute(
                f"UPDATE ingestion_jobs SET {', '.join(fields)} WHERE document_id = %s",
                params,
            )

            if status == "complete":
                cur.execute(
                    "UPDATE documents SET ocr_status = 'complete' WHERE id = %s",
                    (document_id,),
                )
            elif status == "failed":
                cur.execute(
                    "UPDATE documents SET ocr_status = 'failed' WHERE id = %s",
                    (document_id,),
                )
            elif status == "processing":
                cur.execute(
                    "UPDATE documents SET ocr_status = 'processing' WHERE id = %s",
                    (document_id,),
                )

        conn.commit()
    finally:
        conn.close()


def update_page_count(document_id: str, page_count: int):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE documents SET page_count = %s WHERE id = %s",
                (page_count, document_id),
            )
        conn.commit()
    finally:
        conn.close()


def get_document(document_id: str) -> dict | None:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, tenant_id, vessel_id, title, doc_type, scope, s3_key FROM documents WHERE id = %s",
                (document_id,),
            )
            row = cur.fetchone()
            if not row:
                return None
            return {
                "id": row[0],
                "tenant_id": row[1],
                "vessel_id": row[2],
                "title": row[3],
                "doc_type": row[4],
                "scope": row[5],
                "s3_key": row[6],
            }
    finally:
        conn.close()
