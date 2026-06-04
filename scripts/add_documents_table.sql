-- Migration: Add documents table with user_id for multi-tenancy
-- Run against the existing ScholarSight database:
--   docker exec -i scholarsight-postgres psql -U scholarsight -d scholarsight < scripts/add_documents_table.sql

CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('pdf', 'image', 'text')),
    status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'error')),
    page_count INTEGER,
    file_size INTEGER NOT NULL DEFAULT 0,
    uploaded_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents (user_id);
