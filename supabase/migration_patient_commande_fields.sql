-- Run this in the Supabase SQL Editor

alter table public.patients
  add column if not exists address text;

alter table public.commandes
  add column if not exists ordered_by_name text,
  add column if not exists address text,
  add column if not exists delivery_number text,
  add column if not exists disease_to_treat text,
  add column if not exists details text;
