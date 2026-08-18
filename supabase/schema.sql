-- Harcourt Valley — Supabase schema
--
-- Run this once in the Supabase dashboard: Project → SQL Editor → New query
-- → paste this whole file → Run.
--
-- Design: the site's admin-editable data (products, leads, notes, orders,
-- trade orders, email sequences, sends, outreach profiles/outbox, and CMS
-- config) is stored as a single JSON blob in `site_state`, in the same
-- shape the app previously kept in localStorage (see StoreState in
-- src/lib/store.tsx). This keeps every existing read/update function in
-- the app unchanged — only where the data lives moved, not its shape.
-- The shopping cart stays purely local to each visitor's browser; it was
-- never part of the "admin content" problem this migration solves.

-- ---------------------------------------------------------------------
-- Admins allowlist
-- ---------------------------------------------------------------------
-- Real magic-link sign-in lets anyone request a login link for their own
-- email, so write access to site_state is gated on the signed-in user's
-- email appearing in this table — not merely on being logged in.

create table if not exists admins (
  email text primary key
);

insert into admins (email) values ('d.hynes.mnk@gmail.com')
on conflict (email) do nothing;

-- To add the second admin later, run:
--   insert into admins (email) values ('their-email@example.com');

alter table admins enable row level security;

create policy "admins list readable by signed-in users"
  on admins for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------
-- site_state — the single row of admin/site content
-- ---------------------------------------------------------------------

create table if not exists site_state (
  id int primary key default 1,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  constraint site_state_singleton check (id = 1)
);

alter table site_state enable row level security;

-- Public site pages (products, wedding/event copy, appearance) read this
-- without being signed in.
create policy "site state readable by everyone"
  on site_state for select
  using (true);

-- Only allowlisted admins may create or update the row. The app seeds the
-- row automatically the first time a signed-in admin makes any change
-- (including "Reset demo data" in the admin sidebar) — no manual insert
-- needed.
create policy "site state insertable by admins only"
  on site_state for insert
  to authenticated
  with check (auth.jwt() ->> 'email' in (select email from admins));

create policy "site state updatable by admins only"
  on site_state for update
  to authenticated
  using (auth.jwt() ->> 'email' in (select email from admins))
  with check (auth.jwt() ->> 'email' in (select email from admins));
