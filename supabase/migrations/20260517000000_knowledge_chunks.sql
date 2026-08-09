-- Knowledge chunks for RAG (replaces vendor_embeddings for retrieval)
create table if not exists knowledge_chunks (
  id uuid default gen_random_uuid() primary key,
  vendor_id uuid references vendors(id) on delete cascade,
  contract_id uuid references contracts(id) on delete cascade,
  content text not null,
  embedding vector(768),
  chunk_index int default 0,
  source_type text not null check (source_type in ('vendor', 'contract')),
  created_at timestamptz default now()
);

alter table knowledge_chunks enable row level security;

create policy "Authenticated users can read knowledge chunks" on knowledge_chunks
  for select using (auth.role() = 'authenticated');

-- Migrate existing vendor embeddings (idempotent)
insert into knowledge_chunks (vendor_id, content, embedding, chunk_index, source_type)
select ve.vendor_id, ve.content, ve.embedding, 0, 'vendor'
from vendor_embeddings ve
where not exists (
  select 1 from knowledge_chunks kc
  where kc.vendor_id = ve.vendor_id and kc.source_type = 'vendor' and kc.chunk_index = 0
);

-- Full contract text for re-indexing without re-uploading PDFs
alter table contracts add column if not exists full_text text;

create or replace function match_knowledge_chunks(
  query_embedding vector(768),
  match_threshold float default 0.55,
  match_count int default 12
)
returns table (
  id uuid,
  vendor_id uuid,
  contract_id uuid,
  content text,
  source_type text,
  similarity float
)
language sql stable
as $$
  select
    knowledge_chunks.id,
    knowledge_chunks.vendor_id,
    knowledge_chunks.contract_id,
    knowledge_chunks.content,
    knowledge_chunks.source_type,
    1 - (knowledge_chunks.embedding <=> query_embedding) as similarity
  from knowledge_chunks
  where knowledge_chunks.embedding is not null
    and 1 - (knowledge_chunks.embedding <=> query_embedding) > match_threshold
  order by knowledge_chunks.embedding <=> query_embedding
  limit match_count;
$$;

create index if not exists idx_knowledge_chunks_vendor on knowledge_chunks(vendor_id);
create index if not exists idx_knowledge_chunks_contract on knowledge_chunks(contract_id);
create index if not exists idx_knowledge_chunks_source on knowledge_chunks(source_type);
