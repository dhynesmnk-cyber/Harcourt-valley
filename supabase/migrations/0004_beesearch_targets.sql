-- BeeSearch targets: named, user-created discovery targets that each carry
-- their own training list and their own discovery settings.
--
-- The two-value kind/account_type columns are deliberately NOT widened. They
-- stay as the *rubric* discriminator ('stockist' = the seven-dimension retail
-- matrix, 'referral_partner' = the five-dimension referral matrix), because
-- both rubrics are hardcoded into the AI prompts — a third value would have
-- nothing to score against. What the user names a target is a separate axis,
-- carried by target_id below, so "Wedding planners", "Event suppliers" and
-- "Adjacent venues" can all score on the referral rubric while keeping their
-- own training data and their own search settings.

-- Targets live in the existing profiles table; these are the discovery settings.
alter table beesearch_profiles
  add column if not exists region         text   not null default '',
  add column if not exists business_types text[] not null default '{}',
  add column if not exists notes          text   not null default '';

-- target_id is text to match beesearch_profiles.id (text primary key), and is
-- deliberately NOT a foreign key: profiles are client-authored with a local
-- uid() and pushed on a debounced sync, so a hard FK would reject training
-- rows that arrive before their profile has synced.
alter table beesearch_stockists             add column if not exists target_id text;
alter table beesearch_discovery_suggestions add column if not exists target_id text;
alter table beesearch_accounts              add column if not exists target_id text;

create index if not exists beesearch_stockists_target_idx             on beesearch_stockists (target_id);
create index if not exists beesearch_discovery_suggestions_target_idx on beesearch_discovery_suggestions (target_id, status);

-- The recipient address the engine already scrapes, carried through to the
-- draft so it can be copied alongside the email text. Nothing sends from here
-- — see the outbox notes in the admin UI.
alter table outbox
  add column if not exists website_url text,
  add column if not exists emails      text[];

-- Discovery runs for minutes in a background function, which until now
-- swallowed every error — a genuine failure (no search results, an Anthropic
-- error, a target below the training minimum) was indistinguishable from
-- "still working", so the UI could only time out and shrug. This gives the
-- run a status row the client can poll and report honestly.
create table if not exists beesearch_discovery_runs (
  id          serial primary key,
  target_id   text,
  account_type text not null default 'stockist',
  status      text not null default 'running' check (status in ('running', 'done', 'failed')),
  error       text,
  found       integer not null default 0,
  started_at  timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists beesearch_discovery_runs_target_idx on beesearch_discovery_runs (target_id, started_at desc);

alter table beesearch_discovery_runs enable row level security;
drop policy if exists "admins do everything" on beesearch_discovery_runs;
create policy "admins do everything" on beesearch_discovery_runs
  for all to authenticated using (true) with check (true);

-- Existing training rows predate targets. Land them on the two seeded targets
-- (data.ts seedProfiles: bp1 = stockist rubric, bp2 = referral rubric) so the
-- training already entered stays attached to something rather than orphaning.
update beesearch_stockists set target_id = 'bp1' where target_id is null and kind = 'stockist';
update beesearch_stockists set target_id = 'bp2' where target_id is null and kind = 'referral_partner';
update beesearch_discovery_suggestions set target_id = 'bp1' where target_id is null and account_type = 'stockist';
update beesearch_discovery_suggestions set target_id = 'bp2' where target_id is null and account_type = 'referral_partner';
update beesearch_accounts set target_id = 'bp1' where target_id is null and account_type = 'stockist';
update beesearch_accounts set target_id = 'bp2' where target_id is null and account_type = 'referral_partner';
