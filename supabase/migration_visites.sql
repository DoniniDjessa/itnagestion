-- Visites + health flow details
-- Run in Supabase SQL Editor

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
  status text not null default 'Terminée'
);

create index if not exists visites_patient_id_idx on public.visites (patient_id);
create index if not exists visites_visit_date_idx on public.visites (visit_date desc);

alter table public.visites enable row level security;

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
