-- BeeSearch accounts: the client's own roster of businesses they already
-- work with (a stockist already supplied, a planner already booking) —
-- replaces the old "target profile" concept (bee23/beesearch_profiles),
-- which described an abstract target rather than a real, growing list.
-- The client adds and edits this list themselves; "discover new ones"
-- (beesearch-discover) matches against it by kind.
--
-- The old beesearch_profiles table is left in place, unused — dropping it
-- isn't worth the risk to whatever's already in it.

create table if not exists beesearch_accounts (
  id         text primary key,
  business   text        not null,
  contact    text        not null default '',
  email      text        not null default '',
  phone      text        not null default '',
  town       text        not null default '',
  kind       text        not null default 'stockist' check (kind in ('stockist', 'planner')),
  notes      text        not null default '',
  added_at   timestamptz not null default now()
);

alter table beesearch_accounts enable row level security;
drop policy if exists "admins do everything" on beesearch_accounts;
create policy "admins do everything" on beesearch_accounts for all to authenticated using (true) with check (true);
