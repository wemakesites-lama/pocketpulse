-- PocketPulse persistence — replaces localStorage. One row per analysed/approved batch,
-- owned by a user, protected by RLS. Full LedgerState lives in `payload` (jsonb) so there
-- is zero drift with the Zod contract; headline metrics are denormalised for listing.

create extension if not exists pgcrypto;

create table if not exists public.batches (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users on delete cascade,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  status        text not null default 'draft' check (status in ('draft','approved')),
  approved_at   timestamptz,
  record_count  int           not null default 0,
  gross_total   numeric(12,2) not null default 0,
  total_vat     numeric(12,2) not null default 0,
  vat_at_risk   numeric(12,2) not null default 0,
  model_id      text,
  batch_summary text,
  payload       jsonb         not null default '{}'::jsonb
);

alter table public.batches enable row level security;

drop policy if exists "own batches" on public.batches;
create policy "own batches" on public.batches
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index if not exists batches_user_created_idx on public.batches (user_id, created_at desc);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists batches_updated_at on public.batches;
create trigger batches_updated_at before update on public.batches
  for each row execute function public.set_updated_at();
