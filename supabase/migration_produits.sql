-- Produits catalog + delete policies + storage delete
-- Run via: npx supabase db query --linked -f supabase/migration_produits.sql

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

alter table public.produits enable row level security;

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

-- Ensure delete on patients / commandes
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

-- Storage delete for centre-bucket
do $$ begin
  create policy "Anon delete centre-bucket"
    on storage.objects for delete to anon
    using (bucket_id = 'centre-bucket');
exception when duplicate_object then null;
end $$;
