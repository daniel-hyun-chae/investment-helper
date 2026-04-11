create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create table if not exists public.company_directory (
  corp_code text primary key,
  corp_name text not null,
  corp_eng_name text,
  stock_code text,
  modify_date text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_financial_points (
  id uuid primary key default gen_random_uuid(),
  corp_code text not null references public.company_directory(corp_code) on delete cascade,
  basis text not null check (basis in ('CFS', 'OFS')),
  fiscal_year integer not null,
  fiscal_quarter integer not null check (fiscal_quarter between 1 and 4),
  revenue numeric,
  operating_income numeric,
  selling_general_administrative_expense numeric,
  cost_of_sales numeric,
  source_rcept_no text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (corp_code, basis, fiscal_year, fiscal_quarter)
);

create table if not exists public.company_refresh_state (
  corp_code text primary key references public.company_directory(corp_code) on delete cascade,
  selected_basis text not null check (selected_basis in ('CFS', 'OFS')),
  last_checked_at timestamptz,
  last_known_rcept_no text,
  last_known_rcept_date text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists company_directory_set_updated_at on public.company_directory;
create trigger company_directory_set_updated_at
before update on public.company_directory
for each row
execute function public.set_updated_at();

drop trigger if exists company_financial_points_set_updated_at on public.company_financial_points;
create trigger company_financial_points_set_updated_at
before update on public.company_financial_points
for each row
execute function public.set_updated_at();

drop trigger if exists company_refresh_state_set_updated_at on public.company_refresh_state;
create trigger company_refresh_state_set_updated_at
before update on public.company_refresh_state
for each row
execute function public.set_updated_at();

create index if not exists idx_company_directory_name_trgm
  on public.company_directory using gin (corp_name gin_trgm_ops);

create index if not exists idx_company_directory_stock_code
  on public.company_directory (stock_code);

create index if not exists idx_company_financial_points_lookup
  on public.company_financial_points (corp_code, basis, fiscal_year desc, fiscal_quarter desc);

create or replace function public.search_company_directory(search_text text, limit_count integer default 20)
returns table (
  corp_code text,
  corp_name text,
  corp_eng_name text,
  stock_code text,
  modify_date text,
  similarity_score real
)
language sql
stable
as $$
  select
    d.corp_code,
    d.corp_name,
    d.corp_eng_name,
    d.stock_code,
    d.modify_date,
    greatest(
      similarity(d.corp_name, search_text),
      similarity(coalesce(d.corp_eng_name, ''), search_text),
      similarity(coalesce(d.stock_code, ''), search_text)
    ) as similarity_score
  from public.company_directory d
  where
    search_text is not null
    and length(trim(search_text)) > 0
    and (
      d.corp_name ilike '%' || search_text || '%'
      or coalesce(d.corp_eng_name, '') ilike '%' || search_text || '%'
      or coalesce(d.stock_code, '') ilike '%' || search_text || '%'
      or similarity(d.corp_name, search_text) > 0.2
      or similarity(coalesce(d.corp_eng_name, ''), search_text) > 0.2
    )
  order by similarity_score desc, d.corp_name asc
  limit greatest(1, least(coalesce(limit_count, 20), 100));
$$;
