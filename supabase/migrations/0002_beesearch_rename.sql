-- BeeSearch (formerly "Bee23") — rename the outreach tables and give the
-- outbox enough columns to support a real reply → convert-to-enquiry
-- workflow, and match profiles a "kind" so matching isn't hardcoded to two
-- ids in the app.

alter table if exists bee23_profiles rename to beesearch_profiles;

alter table beesearch_profiles
  add column if not exists kind text not null default 'stockist' check (kind in ('stockist', 'planner'));

-- leads.source: 'bee23' -> 'beesearch'
alter table leads drop constraint if exists leads_source_check;
update leads set source = 'beesearch' where source = 'bee23';
alter table leads add constraint leads_source_check check (source in ('website', 'beesearch'));

-- outbox: add contact + match-reasoning + reply/convert workflow columns
alter table outbox
  add column if not exists email text not null default '',
  add column if not exists phone text not null default '',
  add column if not exists town text not null default '',
  add column if not exists kind text not null default 'stockist' check (kind in ('stockist', 'planner')),
  add column if not exists matched_on jsonb not null default '[]'::jsonb,
  add column if not exists sent_at timestamptz,
  add column if not exists converted_lead_id text references leads (id) on delete set null;

alter table outbox drop constraint if exists outbox_state_check;
alter table outbox add constraint outbox_state_check
  check (state in ('draft', 'approved', 'sent', 'replied', 'declined', 'converted'));

-- Admin policy on the renamed table (the old one on bee23_profiles was
-- dropped along with the table rename, since Postgres carries policies
-- across a rename — this just re-asserts it under the new name for clarity).
drop policy if exists "admins do everything" on beesearch_profiles;
create policy "admins do everything" on beesearch_profiles for all to authenticated using (true) with check (true);
