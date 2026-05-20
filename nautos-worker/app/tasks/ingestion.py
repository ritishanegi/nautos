import logging

from app.celery_app import celery
from app.services.storage import StorageService
from app.services.ocr import OCRService
from app.services.chunker import ChunkerService
from app.services.embeddings import EmbeddingService
from app.services.search import SearchService
from app.services.vectordb import VectorDBService
from app.services.db import update_job_status, update_page_count, get_document

logger = logging.getLogger(__name__)


@celery.task(bind=True, name="ingest_document", max_retries=3)
def ingest_document(self, document_id: str):
    """
    Full ingestion pipeline:
    Download from S3 → OCR → Chunk → Embed → Store vectors → Index ES → Complete
    """
    try:
        doc = get_document(document_id)
        if not doc:
            raise ValueError(f"Document {document_id} not found")

        update_job_status(document_id, "processing")

        # Step 1: Download PDF from S3
        logger.info(f"Downloading {doc['s3_key']} from S3")
        storage = StorageService()
        pdf_bytes = storage.download(doc["s3_key"])

        # Step 2: OCR via Azure Document Intelligence
        logger.info(f"Running OCR on document {document_id}")
        ocr = OCRService()
        ocr_result = ocr.extract(pdf_bytes)
        total_pages = ocr_result["total_pages"]

        update_page_count(document_id, total_pages)
        update_job_status(document_id, "processing", progress=30, total_pages=total_pages)

        # Step 3: Chunk text (400 words, 60 overlap)
        logger.info(f"Chunking {total_pages} pages into segments")
        chunker = ChunkerService()
        chunks = chunker.chunk_pages(ocr_result["pages"])
        logger.info(f"Generated {len(chunks)} chunks")

        update_job_status(
            document_id, "processing", progress=50, total_pages=total_pages
        )

        # Step 4: Embed chunks via Voyage AI (batches of 20)
        logger.info(f"Embedding {len(chunks)} chunks")
        embedder = EmbeddingService()
        texts = [c["text"] for c in chunks]
        embeddings = embedder.embed_texts(texts)

        update_job_status(
            document_id, "processing", progress=70, total_pages=total_pages
        )

        # Step 5: Store vectors in pgvector
        logger.info("Storing vectors in pgvector")
        vectordb = VectorDBService()
        vectordb.store_embeddings(document_id, doc["tenant_id"], chunks, embeddings)

        update_job_status(
            document_id, "processing", progress=85, total_pages=total_pages
        )

        # Step 6: Index chunks in Elasticsearch
        logger.info("Indexing chunks in Elasticsearch")
        search = SearchService()
        search.index_chunks(
            document_id=document_id,
            tenant_id=doc["tenant_id"],
            vessel_id=doc["vessel_id"],
            scope=doc["scope"],
            title=doc["title"],
            doc_type=doc["doc_type"],
            chunks=chunks,
        )

        # Step 7: Mark complete
        update_job_status(
            document_id,
            "complete",
            progress=100,
            total_pages=total_pages,
            processed_pages=total_pages,
        )
        logger.info(f"Ingestion complete for document {document_id}")

        return {"status": "complete", "document_id": document_id, "chunks": len(chunks)}

    except Exception as exc:
        logger.error(f"Ingestion failed for {document_id}: {exc}")
        update_job_status(document_id, "failed", error=str(exc))
        raise self.retry(exc=exc, countdown=60)
