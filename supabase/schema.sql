-- ITNA Gestion — schema for patients & commandes
-- Run this in the Supabase SQL Editor

create extension if not exists "pgcrypto";

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  first_name text not null,
  last_name text not null,
  phone text,
  email text,
  birth_date date,
  gender text,
  medical_history text,
  picture_url text,
  address text,
  city text,
  quartier text,
  allergies text,
  blood_type text,
  emergency_contact text,
  emergency_phone text,
  photos jsonb not null default '[]'::jsonb
);

-- Safe if table already existed without picture_url
alter table public.patients
  add column if not exists picture_url text;

alter table public.patients
  add column if not exists address text;

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
create index if not exists patients_quartier_idx on public.patients (quartier);

create table if not exists public.commandes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  reference_id text not null unique,
  patient_id uuid not null references public.patients (id) on delete restrict,
  items jsonb not null default '[]'::jsonb,
  total_amount numeric(12, 2) not null default 0,
  status text not null default 'En attente',
  ordered_by_name text,
  address text,
  delivery_number text,
  disease_to_treat text,
  details text
);

alter table public.commandes
  add column if not exists ordered_by_name text,
  add column if not exists address text,
  add column if not exists delivery_number text,
  add column if not exists disease_to_treat text,
  add column if not exists details text;

create index if not exists commandes_patient_id_idx on public.commandes (patient_id);
create index if not exists commandes_status_idx on public.commandes (status);
create index if not exists commandes_created_at_idx on public.commandes (created_at desc);

create table if not exists public.visites (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  visit_date timestamptz not null default now(),
  motif text,
  symptoms text,
  blood_pressure text,
  temperature numeric(4, 1),
  weight_kg numeric(5, 2),
  diagnosis text,
  treatment text,
  notes text,
  status text not null default 'Terminée',
  case_status text
);

create index if not exists visites_patient_id_idx on public.visites (patient_id);
create index if not exists visites_visit_date_idx on public.visites (visit_date desc);

alter table public.visites
  add column if not exists case_status text;

create table if not exists public.produits (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  code text unique,
  price numeric(12, 2) not null default 0,
  description text,
  picture_url text,
  active boolean not null default true
);

create index if not exists produits_name_idx on public.produits (name);
create index if not exists produits_code_idx on public.produits (code);

alter table public.patients enable row level security;
alter table public.commandes enable row level security;
alter table public.visites enable row level security;
alter table public.produits enable row level security;

-- Dev-friendly policies (anon read/write). Tighten for production.
do $$ begin
  create policy "Allow anon select patients"
    on public.patients for select to anon using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Allow anon insert patients"
    on public.patients for insert to anon with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Allow anon update patients"
    on public.patients for update to anon using (true) with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Allow anon select commandes"
    on public.commandes for select to anon using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Allow anon insert commandes"
    on public.commandes for insert to anon with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Allow anon update commandes"
    on public.commandes for update to anon using (true) with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Allow anon select visites"
    on public.visites for select to anon using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Allow anon insert visites"
    on public.visites for insert to anon with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Allow anon update visites"
    on public.visites for update to anon using (true) with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Allow anon delete visites"
    on public.visites for delete to anon using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Allow anon select produits"
    on public.produits for select to anon using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Allow anon insert produits"
    on public.produits for insert to anon with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Allow anon update produits"
    on public.produits for update to anon using (true) with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Allow anon delete produits"
    on public.produits for delete to anon using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Allow anon delete patients"
    on public.patients for delete to anon using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Allow anon delete commandes"
    on public.commandes for delete to anon using (true);
exception when duplicate_object then null;
end $$;

-- Storage: bucket `centre-bucket` (create in Dashboard if missing, set Public)
insert into storage.buckets (id, name, public)
values ('centre-bucket', 'centre-bucket', true)
on conflict (id) do update set public = true;

do $$ begin
  create policy "Anon read centre-bucket"
    on storage.objects for select to anon
    using (bucket_id = 'centre-bucket');
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Anon upload centre-bucket"
    on storage.objects for insert to anon
    with check (bucket_id = 'centre-bucket');
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Anon update centre-bucket"
    on storage.objects for update to anon
    using (bucket_id = 'centre-bucket')
    with check (bucket_id = 'centre-bucket');
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Anon delete centre-bucket"
    on storage.objects for delete to anon
    using (bucket_id = 'centre-bucket');
exception when duplicate_object then null;
end $$;
