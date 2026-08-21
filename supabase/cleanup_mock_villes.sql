-- Nettoyage des villes mock (Sénégal) injectées par l'ancien seed.
-- À exécuter une fois dans le SQL Editor Supabase.

delete from public.villes
where name_key in (
  'dakar',
  'pikine',
  'guédiawaye',
  'guediawaye',
  'rufisque',
  'thiès',
  'thies',
  'mbour',
  'saint-louis',
  'kaolack',
  'touba',
  'ziguinchor'
);
