-- BeeSearch discovery: a cache of businesses found by a real search (Google
-- Places), so a search doesn't cost money twice for the same business and so
-- "already contacted" is tracked across searches. Populated by the
-- beesearch-discover and beesearch-enrich edge functions, not by the app
-- directly.

create table if not exists beesearch_candidates (
  -- Google Place ID — a stable, natural key, so re-running a search upserts
  -- rather than duplicating.
  id            text primary key,
  kind          text        not null check (kind in ('stockist', 'planner')),
  business      text        not null,
  address       text        not null default '',
  town          text        not null default '',
  phone         text        not null default '',
  website       text        not null default '',
  -- Filled in once beesearch-enrich has looked at the business's own site —
  -- null means "not checked yet", '' means "checked, found nothing".
  email         text,
  distance_km   numeric,
  -- Plain-language reasons this candidate matched — the same "why" shown on
  -- the match card, kept so it survives a page reload.
  reasons       jsonb       not null default '[]'::jsonb,
  status        text        not null default 'new' check (status in ('new', 'dismissed', 'contacted')),
  discovered_at timestamptz not null default now(),
  enriched_at   timestamptz
);
create index if not exists beesearch_candidates_kind_idx on beesearch_candidates (kind, status);

alter table beesearch_candidates enable row level security;
drop policy if exists "admins do everything" on beesearch_candidates;
create policy "admins do everything" on beesearch_candidates for all to authenticated using (true) with check (true);
