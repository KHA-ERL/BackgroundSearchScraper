create extension if not exists pgcrypto;

create table if not exists app_users (
  user_key text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists user_preferences (
  user_key text not null references app_users(user_key) on delete cascade,
  key text not null,
  value jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_key, key)
);

create table if not exists scrape_history (
  user_key text not null references app_users(user_key) on delete cascade,
  api_path text not null,
  rows jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_key, api_path)
);

create table if not exists scrape_runs (
  id uuid primary key default gen_random_uuid(),
  user_key text not null references app_users(user_key) on delete cascade,
  tool_name text not null,
  api_path text,
  status text not null default 'success',
  row_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists scrape_cache (
  namespace text not null,
  cache_key text not null,
  payload jsonb not null,
  expires_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (namespace, cache_key)
);

create table if not exists browser_sessions (
  provider text not null,
  user_key text not null references app_users(user_key) on delete cascade,
  storage_state jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (provider, user_key)
);

create table if not exists job_companies (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  token text not null,
  company_name text not null,
  career_page text,
  domain text,
  description text,
  logo_url text,
  active boolean not null default true,
  last_checked_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (source, token)
);

create table if not exists job_listings (
  id uuid primary key default gen_random_uuid(),
  dedupe_key text not null unique,
  title text not null,
  company_name text not null,
  company_source text,
  company_token text,
  location text,
  work_type text,
  salary text,
  experience text,
  skills text,
  posted_at timestamptz,
  posted_age_days integer,
  url text not null,
  career_page text,
  source text,
  discovery_source text,
  confidence text not null default 'high',
  is_active boolean not null default true,
  is_dead boolean not null default false,
  last_seen_at timestamptz not null default now(),
  dead_checked_at timestamptz,
  raw jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists job_alerts (
  id uuid primary key default gen_random_uuid(),
  user_key text not null references app_users(user_key) on delete cascade,
  name text not null,
  query text not null,
  location_mode text not null default 'worldwide',
  location text,
  work_type text not null default 'all',
  max_age_days integer not null default 7 check (max_age_days between 1 and 7),
  enabled boolean not null default true,
  last_checked_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists job_alert_matches (
  alert_id uuid not null references job_alerts(id) on delete cascade,
  job_id uuid not null references job_listings(id) on delete cascade,
  matched_at timestamptz not null default now(),
  seen boolean not null default false,
  primary key (alert_id, job_id)
);

create table if not exists job_crawl_runs (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'success',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  companies_scanned integer not null default 0,
  jobs_seen integer not null default 0,
  jobs_saved integer not null default 0,
  jobs_dead integer not null default 0,
  alert_matches integer not null default 0,
  errors jsonb not null default '[]'::jsonb
);

create index if not exists scrape_runs_user_created_idx
  on scrape_runs(user_key, created_at desc);

create index if not exists scrape_cache_expiry_idx
  on scrape_cache(namespace, expires_at);

create index if not exists job_companies_active_idx
  on job_companies(active, last_checked_at desc);

create index if not exists job_listings_fresh_idx
  on job_listings(is_active, is_dead, posted_at desc);

create index if not exists job_listings_company_idx
  on job_listings(company_name, posted_at desc);

create index if not exists job_listings_work_type_idx
  on job_listings(work_type, posted_at desc);

create index if not exists job_alerts_user_enabled_idx
  on job_alerts(user_key, enabled, created_at desc);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists app_users_set_updated_at on app_users;
create trigger app_users_set_updated_at
before update on app_users
for each row execute function set_updated_at();

drop trigger if exists user_preferences_set_updated_at on user_preferences;
create trigger user_preferences_set_updated_at
before update on user_preferences
for each row execute function set_updated_at();

drop trigger if exists scrape_history_set_updated_at on scrape_history;
create trigger scrape_history_set_updated_at
before update on scrape_history
for each row execute function set_updated_at();

drop trigger if exists scrape_cache_set_updated_at on scrape_cache;
create trigger scrape_cache_set_updated_at
before update on scrape_cache
for each row execute function set_updated_at();

drop trigger if exists browser_sessions_set_updated_at on browser_sessions;
create trigger browser_sessions_set_updated_at
before update on browser_sessions
for each row execute function set_updated_at();

drop trigger if exists job_companies_set_updated_at on job_companies;
create trigger job_companies_set_updated_at
before update on job_companies
for each row execute function set_updated_at();

drop trigger if exists job_listings_set_updated_at on job_listings;
create trigger job_listings_set_updated_at
before update on job_listings
for each row execute function set_updated_at();

drop trigger if exists job_alerts_set_updated_at on job_alerts;
create trigger job_alerts_set_updated_at
before update on job_alerts
for each row execute function set_updated_at();
