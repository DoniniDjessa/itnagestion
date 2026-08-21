-- ITNA Gestion — géographie + dossier patient
-- Run in Supabase SQL Editor (project tvhqldvmmbslrcbcwhhs)

-- ── Patient location & dossier fields ──────────────────────────────
alter table public.patients
  add column if not exists city text,
  add column if not exists commune text,
  add column if not exists quartier text,
  add column if not exists allergies text,
  add column if not exists blood_type text,
  add column if not exists emergency_contact text,
  add column if not exists emergency_phone text,
  add column if not exists photos jsonb not null default '[]'::jsonb;

create index if not exists patients_city_idx on public.patients (city);
create index if not exists patients_commune_idx on public.patients (commune);
create index if not exists patients_quartier_idx on public.patients (quartier);

alter table public.visites
  add column if not exists case_status text;

-- ── Geo catalog (auto-fed when creating/editing patients) ──────────
create table if not exists public.villes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  name_key text not null unique
);

create table if not exists public.communes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  name_key text not null,
  ville_id uuid references public.villes (id) on delete set null,
  unique (name_key, ville_id)
);

create table if not exists public.quartiers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  name_key text not null,
  commune_id uuid references public.communes (id) on delete set null,
  ville_id uuid references public.villes (id) on delete set null,
  unique (name_key, commune_id, ville_id)
);

create index if not exists villes_name_key_idx on public.villes (name_key);
create index if not exists communes_name_key_idx on public.communes (name_key);
create index if not exists quartiers_name_key_idx on public.quartiers (name_key);

alter table public.villes enable row level security;
alter table public.communes enable row level security;
alter table public.quartiers enable row level security;

do $$ begin
  create policy "Allow anon all villes" on public.villes for all to anon using (true) with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Allow anon all communes" on public.communes for all to anon using (true) with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Allow anon all quartiers" on public.quartiers for all to anon using (true) with check (true);
exception when duplicate_object then null;
end $$;

-- Pas de seed : les villes / communes / quartiers sont créés
-- automatiquement à la saisie des patients (syncPatientGeo).
