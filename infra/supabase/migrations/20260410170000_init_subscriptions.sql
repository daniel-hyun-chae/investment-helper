create extension if not exists pgcrypto;

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id text not null,
  company_code text not null,
  source text not null default 'opendart',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (telegram_user_id, company_code, source)
);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists subscriptions_set_updated_at on subscriptions;

create trigger subscriptions_set_updated_at
before update on subscriptions
for each row
execute function set_updated_at();
