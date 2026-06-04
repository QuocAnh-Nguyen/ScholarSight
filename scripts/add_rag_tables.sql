-- Migration: Create RAG pipeline tables (raw_components, summary_embeddings, query_history, ingestion_batches, roadmap_tasks)
-- Run against the existing ScholarSight database:
--   docker exec -i scholarsight-postgres psql -U scholarsight -d scholarsight < scripts/add_rag_tables.sql

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

------------------------------------------------------------
-- raw_components: stores extracted OCR components
-- Uses parent_doc_id to group components from the same document
-- (Small-to-Big retrieval: semantic search on summaries returns
--  a parent_doc_id, which then fetches ALL sibling components)
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS raw_components (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_doc_id   UUID NOT NULL,
    component_type  TEXT NOT NULL CHECK (component_type IN ('text', 'table', 'image')),
    raw_content     TEXT,
    image_url       TEXT,
    table_structure JSONB,
    source_file     TEXT,
    source_page     INTEGER,
    university_name TEXT,
    academic_year   TEXT,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_raw_components_parent_doc_id ON raw_components (parent_doc_id);

------------------------------------------------------------
-- summary_embeddings: stores LLM-generated summaries with
-- pgvector embeddings for semantic search.
-- FK to raw_components.id ensures each summary belongs to a component.
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS summary_embeddings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doc_id          UUID NOT NULL REFERENCES raw_components(id) ON DELETE CASCADE,
    component_type  TEXT NOT NULL,
    summary_text    TEXT NOT NULL,
    source_page     INTEGER,
    university_name TEXT,
    academic_year   TEXT,
    embedding       vector(1024),
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_summary_embeddings_doc_id ON summary_embeddings (doc_id);
CREATE INDEX IF NOT EXISTS idx_summary_embeddings_embedding ON summary_embeddings USING ivfflat (embedding vector_cosine_ops);

------------------------------------------------------------
-- query_history: stores user queries and their results
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS query_history (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL,
    query_text          TEXT NOT NULL,
    retrieved_doc_ids   TEXT[],
    synthesized_answer  TEXT,
    source_citations    JSONB,
    cosine_scores       DOUBLE PRECISION[],
    created_at          TIMESTAMPTZ DEFAULT now()
);

------------------------------------------------------------
-- ingestion_batches: tracks PDF ingestion progress
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ingestion_batches (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_file      TEXT NOT NULL,
    status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
    total_pages      INTEGER,
    processed_pages  INTEGER DEFAULT 0,
    error_message    TEXT,
    created_at       TIMESTAMPTZ DEFAULT now()
);

------------------------------------------------------------
-- roadmap_tasks: Kanban-style task board for students
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roadmap_tasks (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL,
    title       TEXT NOT NULL,
    description TEXT,
    status      TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
    due_month   INTEGER CHECK (due_month BETWEEN 1 AND 12),
    category    TEXT,
    sort_order  INTEGER DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_roadmap_tasks_user_id ON roadmap_tasks (user_id);

-- ============================================================
-- FIX #5: Multi-tenant isolation — add user_id to documents
-- and ingestion_batches tables.
-- ============================================================
ALTER TABLE documents ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE ingestion_batches ADD COLUMN IF NOT EXISTS user_id UUID;

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents (user_id);
CREATE INDEX IF NOT EXISTS idx_ingestion_batches_user_id ON ingestion_batches (user_id);
