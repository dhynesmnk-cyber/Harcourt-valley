-- BeeSearch (formerly "Bee23") — rename the outreach tables and give the
-- outbox enough columns to support a real reply → convert-to-enquiry
-- workflow.

alter table if exists bee23_profiles rename to beesearch_profiles;

-- leads.source: 'bee23' -> 'beesearch'
alter table leads drop constraint if exists leads_source_check;
update leads set source = 'beesearch' where source = 'bee23';
alter table leads add constraint leads_source_check check (source in ('website', 'beesearch'));

-- outbox: match-reasoning + reply/convert workflow columns
alter table outbox
  add column if not exists matched_on text,
  add column if not exists composite_score numeric,
  add column if not exists recommended_strategy text,
  add column if not exists sent_at timestamptz,
  add column if not exists converted_lead_id text references leads (id) on delete set null;

alter table outbox drop constraint if exists outbox_state_check;
alter table outbox add constraint outbox_state_check
  check (state in ('draft', 'approved', 'sent', 'replied', 'declined', 'converted'));

-- Admin policy on the renamed table (Postgres carries policies across a
-- rename, but this re-asserts it under the new name for clarity).
drop policy if exists "admins do everything" on beesearch_profiles;
create policy "admins do everything" on beesearch_profiles for all to authenticated using (true) with check (true);
