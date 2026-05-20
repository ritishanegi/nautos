import psycopg
from pgvector.psycopg import register_vector

from app.config import settings


class VectorDBService:
    """PostgreSQL pgvector storage for document embeddings."""

    def __init__(self):
        self.conn_str = settings.database_url

    def _get_connection(self):
        conn = psycopg.connect(self.conn_str)
        register_vector(conn)
        return conn

    def store_embeddings(
        self,
        document_id: str,
        tenant_id: str,
        chunks: list[dict],
        embeddings: list[list[float]],
    ) -> None:
        """Store chunk embeddings in the embeddings table."""
        conn = self._get_connection()
        try:
            with conn.cursor() as cur:
                for chunk, embedding in zip(chunks, embeddings):
                    cur.execute(
                        """
                        INSERT INTO embeddings (document_id, tenant_id, chunk_text, chunk_index, page_number, embedding)
                        VALUES (%s, %s, %s, %s, %s, %s::vector)
                        """,
                        (
                            document_id,
                            tenant_id,
                            chunk["text"],
                            chunk["chunk_index"],
                            chunk["start_page"],
                            str(embedding),
                        ),
                    )
            conn.commit()
        finally:
            conn.close()

    def vector_search(
        self,
        query_embedding: list[float],
        tenant_id: str,
        vessel_id: str | None = None,
        top_k: int = 10,
    ) -> list[dict]:
        """Cosine similarity search on embeddings scoped to tenant."""
        conn = self._get_connection()
        try:
            with conn.cursor() as cur:
                embedding_str = str(query_embedding)

                if vessel_id:
                    cur.execute(
                        """
                        SELECT e.document_id, e.chunk_text, e.page_number, e.chunk_index,
                               1 - (e.embedding <=> %s::vector) as score
                        FROM embeddings e
                        JOIN documents d ON d.id = e.document_id
                        WHERE e.tenant_id = %s AND d.vessel_id = %s
                        ORDER BY e.embedding <=> %s::vector
                        LIMIT %s
                        """,
                        (embedding_str, tenant_id, vessel_id, embedding_str, top_k),
                    )
                else:
                    cur.execute(
                        """
                        SELECT e.document_id, e.chunk_text, e.page_number, e.chunk_index,
                               1 - (e.embedding <=> %s::vector) as score
                        FROM embeddings e
                        WHERE e.tenant_id = %s
                        ORDER BY e.embedding <=> %s::vector
                        LIMIT %s
                        """,
                        (embedding_str, tenant_id, embedding_str, top_k),
                    )

                results = []
                for row in cur.fetchall():
                    results.append({
                        "document_id": row[0],
                        "text": row[1],
                        "page_number": row[2],
                        "chunk_index": row[3],
                        "score": float(row[4]),
                    })
                return results
        finally:
            conn.close()
