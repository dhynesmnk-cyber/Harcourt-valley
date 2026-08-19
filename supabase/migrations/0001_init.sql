-- Harcourt Valley — schema
--
-- Scalar columns for anything filtered or sorted; jsonb for the genuinely
-- nested bits (order lines, sequence steps, the site config document).
-- Ids stay text because the app already generates them client-side.

create extension if not exists "pgcrypto";

/* ---------------------------------------------------------------- */
/*  Tables                                                           */
/* ---------------------------------------------------------------- */

create table if not exists products (
  id              text primary key,
  name            text        not null,
  type            text        not null check (type in ('wine', 'beer', 'mead')),
  varietal        text        not null default '',
  vintage         text,
  price_cents     integer     not null default 0 check (price_cents >= 0),
  stripe_price_id text        not null default '',
  stock           integer     not null default 0 check (stock >= 0),
  description     text        not null default '',
  featured        boolean     not null default false,
  active          boolean     not null default true,
  updated_at      timestamptz not null default now()
);

create table if not exists leads (
  id             text primary key,
  type           text        not null check (type in ('wedding', 'event', 'trade')),
  subtype        text,
  names          text        not null,
  email          text        not null,
  phone          text        not null default '',
  preferred_date date,
  guest_count    integer,
  message        text        not null default '',
  status         text        not null default 'new'
                 check (status in ('new', 'info_sent', 'visiting', 'negotiating', 'booked', 'archived')),
  booked_date    date,
  source         text        not null default 'website' check (source in ('website', 'bee23')),
  info_pack      boolean     not null default false,
  wants_visit    boolean     not null default false,
  created_at     timestamptz not null default now()
);
create index if not exists leads_status_idx on leads (status);
create index if not exists leads_created_idx on leads (created_at desc);
create index if not exists leads_booked_idx on leads (booked_date) where booked_date is not null;

create table if not exists lead_notes (
  id         text primary key,
  lead_id    text        not null references leads (id) on delete cascade,
  body       text        not null default '',
  created_at timestamptz not null default now()
);
create index if not exists lead_notes_lead_idx on lead_notes (lead_id);

create table if not exists orders (
  id          text primary key,
  customer    text        not null,
  email       text        not null,
  lines       jsonb       not null default '[]'::jsonb,
  total_cents integer     not null default 0,
  status      text        not null default 'paid' check (status in ('paid', 'fulfilled')),
  created_at  timestamptz not null default now()
);
create index if not exists orders_created_idx on orders (created_at desc);

create table if not exists trade_orders (
  id         text primary key,
  business   text        not null,
  abn        text        not null default '',
  contact    text        not null default '',
  email      text        not null default '',
  phone      text        not null default '',
  lines      jsonb       not null default '[]'::jsonb,
  notes      text        not null default '',
  status     text        not null default 'new' check (status in ('new', 'fulfilled')),
  created_at timestamptz not null default now()
);
create index if not exists trade_orders_status_idx on trade_orders (status);

create table if not exists sequences (
  id       text primary key,
  name     text    not null,
  audience text    not null check (audience in ('wedding', 'event')),
  active   boolean not null default true,
  steps    jsonb   not null default '[]'::jsonb
);

create table if not exists email_sends (
  id         text primary key,
  lead_id    text        not null,
  lead_name  text        not null default '',
  step_label text        not null default '',
  subject    text        not null default '',
  send_at    timestamptz not null,
  status     text        not null default 'scheduled' check (status in ('scheduled', 'sent'))
);
create index if not exists email_sends_due_idx on email_sends (status, send_at);

create table if not exists bee23_profiles (
  id       text primary key,
  name     text  not null,
  who      text  not null default '',
  criteria jsonb not null default '[]'::jsonb
);

create table if not exists outbox (
  id         text primary key,
  business   text        not null,
  contact    text        not null default '',
  subject    text        not null default '',
  body       text        not null default '',
  state      text        not null default 'draft' check (state in ('draft', 'approved', 'sent')),
  updated_at timestamptz not null default now()
);

-- The site config is genuinely one document — nested ballparks, inclusions and
-- typed lines — so it lives as a single pinned row rather than shredded columns.
create table if not exists site_config (
  id         smallint primary key default 1 check (id = 1),
  data       jsonb       not null,
  updated_at timestamptz not null default now()
);

/* ---------------------------------------------------------------- */
/*  Row Level Security                                               */
/*                                                                   */
/*  The public site is served by the anon key, which ships in the     */
/*  browser bundle. It may therefore do exactly two things: read what */
/*  the site renders, and drop off an enquiry or an order. It must    */
/*  never be able to read a customer record back out.                 */
/* ---------------------------------------------------------------- */

alter table products       enable row level security;
alter table leads          enable row level security;
alter table lead_notes     enable row level security;
alter table orders         enable row level security;
alter table trade_orders   enable row level security;
alter table sequences      enable row level security;
alter table email_sends    enable row level security;
alter table bee23_profiles enable row level security;
alter table outbox         enable row level security;
alter table site_config    enable row level security;

-- Public reads: only the two tables the marketing site renders from.
drop policy if exists "public reads products" on products;
create policy "public reads products"
  on products for select to anon using (true);

drop policy if exists "public reads site config" on site_config;
create policy "public reads site config"
  on site_config for select to anon using (true);

-- Public writes: drop-off only. No select, no update, no delete — a customer
-- can post an enquiry but can never list anyone else's.
drop policy if exists "public submits enquiries" on leads;
create policy "public submits enquiries"
  on leads for insert to anon with check (source = 'website');

drop policy if exists "public places orders" on orders;
create policy "public places orders"
  on orders for insert to anon with check (status = 'paid');

drop policy if exists "public places trade orders" on trade_orders;
create policy "public places trade orders"
  on trade_orders for insert to anon with check (status = 'new');

-- Signed-in admins: full run of the place.
do $$
declare t text;
begin
  foreach t in array array[
    'products', 'leads', 'lead_notes', 'orders', 'trade_orders',
    'sequences', 'email_sends', 'bee23_profiles', 'outbox', 'site_config'
  ]
  loop
    execute format('drop policy if exists "admins do everything" on %I', t);
    execute format(
      'create policy "admins do everything" on %I for all to authenticated using (true) with check (true)', t
    );
  end loop;
end $$;
