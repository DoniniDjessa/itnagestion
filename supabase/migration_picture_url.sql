-- Run this in Supabase SQL Editor if patients table already exists
alter table public.patients
  add column if not exists picture_url text;

-- Ensure storage policies for centre-bucket (bucket should already exist)
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

-- Optional: allow cleanup from anon client (dev only)
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
