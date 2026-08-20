-- BeeSearch discovery engine, brought in-house from the standalone Replit app
-- and folded into this Supabase project. Single-tenant on purpose — the
-- original app supported up to 10 users with per-user data isolation, but
-- only Harcourt Valley ever used it, so every userId column from the
-- original schema is dropped rather than carried over as dead weight.
--
-- Two account "kinds" share these tables from day one: 'stockist' (the
-- original seven-dimension retail matrix) and 'referral_partner' (a five-
-- dimension matrix for businesses like wedding/event planners that refer
-- clients rather than buy and resell product). See the accounts table
-- comment below for why both rubrics' columns live on one table.

-- beesearch_profiles predates the kind split (migration 0002 renamed it from
-- bee23_profiles with no kind column); add it here since 0002 already ran.
alter table beesearch_profiles
  add column if not exists kind text not null default 'stockist' check (kind in ('stockist', 'referral_partner'));

create table if not exists beesearch_prompt_settings (
  -- Single pinned row, same pattern as site_config.
  id                  smallint primary key default 1 check (id = 1),
  company_name        text not null default '',
  sender_name         text not null default '',
  product_description text not null default '',
  pitch_tone          text not null default 'warm',
  custom_rules        text not null default '',
  additional_context  text not null default '',
  brand_website_url   text not null default '',
  brand_profile       text not null default '',
  updated_at          timestamptz not null default now()
);

create table if not exists beesearch_stockists (
  id            serial primary key,
  -- 'stockist' | 'referral_partner' — which discovery training set this
  -- entry belongs to.
  kind          text not null default 'stockist' check (kind in ('stockist', 'referral_partner')),
  business_name text not null,
  website_url   text,
  location      text,
  category      text,
  created_at    timestamptz not null default now()
);
create index if not exists beesearch_stockists_kind_idx on beesearch_stockists (kind);

create table if not exists beesearch_accounts (
  id                            serial primary key,
  account_name                  text not null,
  website_url                   text not null,
  account_type                  text not null default 'stockist' check (account_type in ('stockist', 'referral_partner')),
  primary_language              text not null default 'en',
  pipeline_stage                text not null default 'pending',
  enrichment_status             text default 'pending',
  enriched_content              text,
  enriched_content_word_count   integer,
  scoring_confidence            text default 'low',
  -- 'stockist' rubric (0-10 each, composite_score sums to 0-70)
  brand_alignment               integer,
  value_alignment               integer,
  demographic_resonance         integer,
  sales_opportunity             integer,
  purchasing_size                integer,
  community_gravity             integer,
  merchandising_readiness       integer,
  -- 'referral_partner' rubric (0-10 each, composite_score sums to 0-50)
  venue_affinity                integer,
  guest_size_fit                integer,
  booking_volume                integer,
  referral_readiness            integer,
  style_alignment                integer,
  composite_score                integer,
  recommended_strategy          text,
  discovery_source               text default 'manual',
  emails                        text[],
  final_pitch                   text,
  pitch_edited_at               timestamptz,
  error_message                 text,
  created_at                    timestamptz not null default now(),
  unique (website_url)
);
create index if not exists beesearch_accounts_status_idx on beesearch_accounts (enrichment_status);

create table if not exists beesearch_pitch_library (
  id                serial primary key,
  account_id        integer not null references beesearch_accounts (id) on delete cascade,
  final_email_text  text not null,
  primary_strategy_tag text not null,
  created_at        timestamptz not null default now()
);
create index if not exists beesearch_pitch_library_strategy_idx on beesearch_pitch_library (primary_strategy_tag);

create table if not exists beesearch_discovery_suggestions (
  id                serial primary key,
  account_type      text not null default 'stockist' check (account_type in ('stockist', 'referral_partner')),
  account_name      text not null,
  website_url       text not null default '',
  reason            text not null,
  based_on_strategy text not null,
  relevance_score   integer not null default 0,
  status            text not null default 'pending' check (status in ('pending', 'added', 'dismissed')),
  url_verified      text not null default 'unknown',
  url_source        text,
  emails            text[],
  dismiss_reason    text,
  created_at        timestamptz not null default now()
);
create index if not exists beesearch_discovery_suggestions_status_idx on beesearch_discovery_suggestions (account_type, status);

alter table beesearch_prompt_settings       enable row level security;
alter table beesearch_stockists             enable row level security;
alter table beesearch_accounts              enable row level security;
alter table beesearch_pitch_library         enable row level security;
alter table beesearch_discovery_suggestions enable row level security;

-- All BeeSearch data is internal admin-tool data — never rendered on the
-- public site — so unlike products/leads there is no anon policy at all.
do $$
declare t text;
begin
  foreach t in array array[
    'beesearch_prompt_settings', 'beesearch_stockists', 'beesearch_accounts',
    'beesearch_pitch_library', 'beesearch_discovery_suggestions'
  ]
  loop
    execute format('drop policy if exists "admins do everything" on %I', t);
    execute format(
      'create policy "admins do everything" on %I for all to authenticated using (true) with check (true)', t
    );
  end loop;
end $$;

-- Seed one prompt-settings row with Harcourt's own brand context, so
-- discovery and pitch generation work out of the box with no settings UI
-- required. Edit this row directly in the SQL editor if the copy needs to
-- change — there's no admin screen for it (yet).
insert into beesearch_prompt_settings (id, company_name, sender_name, product_description, pitch_tone, brand_website_url, brand_profile)
values (
  1,
  'Harcourt Valley Vineyards',
  'Tom',
  'Award-winning Central Victorian wine (500+ medals) from a working family vineyard in Harcourt, 30 minutes from Bendigo — cellar door, weddings in the vines, and long-table events under the granite hills.',
  'warm',
  'https://www.harcourtvalley.com.au',
  'Harcourt Valley Vineyards is a family-run, working vineyard in Harcourt, Central Victoria, planted in 1975. The brand is grounded and unpretentious — plain-spoken, proud of the vines and the granite country they grow on, not a polished corporate wine label. Core offering: award-winning wine (Shiraz, Cabernet, Chardonnay and more) sold at cellar door and to trade stockists, plus vineyard weddings (one per day, ever) and long-table events. Target customer for wine trade: independent bottle shops, wine bars and restaurants in regional Victoria and Melbourne who want a genuine, story-rich regional red, not a mass-market label. Target customer for events: couples and event planners wanting an unhurried, honest, vines-and-granite setting rather than a manicured function centre. Values: family ownership, honesty about pricing and process, quality over scale. Brand voice: plain English, warm, a little wry, never salesy.'
) on conflict (id) do nothing;
