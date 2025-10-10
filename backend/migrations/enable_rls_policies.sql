-- Enable RLS and Create Policies for PMWiki Database
-- This migration enables Row Level Security on all public tables
-- and creates permissive policies that allow full access to authenticated users
-- This maintains current application behavior while securing against unauthorized access

-- ============================================================================
-- DOCUMENT SECTIONS TABLE
-- ============================================================================
ALTER TABLE public.document_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to document_sections for authenticated users"
ON public.document_sections
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow read access to document_sections for service role"
ON public.document_sections
FOR SELECT
TO service_role
USING (true);

-- ============================================================================
-- TOPIC MAPPINGS TABLE
-- ============================================================================
ALTER TABLE public.topic_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to topic_mappings for authenticated users"
ON public.topic_mappings
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow read access to topic_mappings for service role"
ON public.topic_mappings
FOR SELECT
TO service_role
USING (true);

-- ============================================================================
-- SYSTEM CONFIG TABLE
-- ============================================================================
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to system_config for authenticated users"
ON public.system_config
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow read access to system_config for service role"
ON public.system_config
FOR SELECT
TO service_role
USING (true);

-- ============================================================================
-- CITATIONS TABLE
-- ============================================================================
ALTER TABLE public.citations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to citations for authenticated users"
ON public.citations
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow read access to citations for service role"
ON public.citations
FOR SELECT
TO service_role
USING (true);

-- ============================================================================
-- SEARCH QUERIES TABLE
-- ============================================================================
ALTER TABLE public.search_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to search_queries for authenticated users"
ON public.search_queries
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow read access to search_queries for service role"
ON public.search_queries
FOR SELECT
TO service_role
USING (true);

-- ============================================================================
-- SEARCH RESULTS TABLE
-- ============================================================================
ALTER TABLE public.search_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to search_results for authenticated users"
ON public.search_results
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow read access to search_results for service role"
ON public.search_results
FOR SELECT
TO service_role
USING (true);

-- ============================================================================
-- RAG CONVERSATIONS TABLE
-- ============================================================================
ALTER TABLE public.rag_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to rag_conversations for authenticated users"
ON public.rag_conversations
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow read access to rag_conversations for service role"
ON public.rag_conversations
FOR SELECT
TO service_role
USING (true);

-- ============================================================================
-- GENERATED PROCESSES TABLE
-- ============================================================================
ALTER TABLE public.generated_processes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to generated_processes for authenticated users"
ON public.generated_processes
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow read access to generated_processes for service role"
ON public.generated_processes
FOR SELECT
TO service_role
USING (true);

-- ============================================================================
-- SECTION RELATIONSHIPS TABLE
-- ============================================================================
ALTER TABLE public.section_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to section_relationships for authenticated users"
ON public.section_relationships
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow read access to section_relationships for service role"
ON public.section_relationships
FOR SELECT
TO service_role
USING (true);

-- ============================================================================
-- SECTION TOPICS TABLE
-- ============================================================================
ALTER TABLE public.section_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to section_topics for authenticated users"
ON public.section_topics
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow read access to section_topics for service role"
ON public.section_topics
FOR SELECT
TO service_role
USING (true);

-- ============================================================================
-- API USAGE TRACKING TABLE
-- ============================================================================
ALTER TABLE public.api_usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to api_usage_tracking for authenticated users"
ON public.api_usage_tracking
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow read access to api_usage_tracking for service role"
ON public.api_usage_tracking
FOR SELECT
TO service_role
USING (true);

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this to verify RLS is enabled on all tables
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
