import { supabase } from "@/lib/supabase/client";
import { labelKey, normalizeLabel } from "@/lib/analytics";

export type VilleRow = {
  id: string;
  name: string;
  name_key: string;
};

export type CommuneRow = {
  id: string;
  name: string;
  name_key: string;
  ville_id: string | null;
};

export type QuartierRow = {
  id: string;
  name: string;
  name_key: string;
  commune_id: string | null;
  ville_id: string | null;
};

export async function searchVilles(query: string, limit = 12) {
  const q = normalizeLabel(query);
  if (q.length < 3) return [] as VilleRow[];
  const { data, error } = await supabase
    .from("villes")
    .select("id, name, name_key")
    .ilike("name", `%${q}%`)
    .order("name")
    .limit(limit);
  if (error) return [] as VilleRow[];
  return (data as VilleRow[]) ?? [];
}

export async function searchCommunes(
  query: string,
  villeId?: string | null,
  limit = 12,
) {
  const q = normalizeLabel(query);
  if (q.length < 3) return [] as CommuneRow[];
  let req = supabase
    .from("communes")
    .select("id, name, name_key, ville_id")
    .ilike("name", `%${q}%`)
    .order("name")
    .limit(limit);
  if (villeId) req = req.eq("ville_id", villeId);
  const { data, error } = await req;
  if (error) return [] as CommuneRow[];
  return (data as CommuneRow[]) ?? [];
}

export async function searchQuartiers(
  query: string,
  opts?: { villeId?: string | null; communeId?: string | null },
  limit = 12,
) {
  const q = normalizeLabel(query);
  if (q.length < 3) return [] as QuartierRow[];
  let req = supabase
    .from("quartiers")
    .select("id, name, name_key, commune_id, ville_id")
    .ilike("name", `%${q}%`)
    .order("name")
    .limit(limit);
  if (opts?.communeId) req = req.eq("commune_id", opts.communeId);
  else if (opts?.villeId) req = req.eq("ville_id", opts.villeId);
  const { data, error } = await req;
  if (error) return [] as QuartierRow[];
  return (data as QuartierRow[]) ?? [];
}

export async function findVilleByName(rawName: string) {
  const key = labelKey(rawName);
  if (!key) return null;
  const { data } = await supabase
    .from("villes")
    .select("id, name, name_key")
    .eq("name_key", key)
    .maybeSingle();
  return (data as VilleRow | null) ?? null;
}

/** Upsert ville by normalized name; returns id or null */
export async function ensureVille(rawName: string) {
  const name = normalizeLabel(rawName);
  if (!name) return null;
  const key = labelKey(name);

  const existing = await supabase
    .from("villes")
    .select("id, name")
    .eq("name_key", key)
    .maybeSingle();

  if (existing.data?.id) return existing.data.id as string;

  const inserted = await supabase
    .from("villes")
    .insert({ name, name_key: key })
    .select("id")
    .single();

  if (inserted.error) {
    // race: fetch again
    const again = await supabase
      .from("villes")
      .select("id")
      .eq("name_key", key)
      .maybeSingle();
    return (again.data?.id as string) ?? null;
  }
  return inserted.data.id as string;
}

export async function ensureCommune(rawName: string, villeId: string | null) {
  const name = normalizeLabel(rawName);
  if (!name) return null;
  const key = labelKey(name);

  let q = supabase
    .from("communes")
    .select("id")
    .eq("name_key", key);
  q = villeId ? q.eq("ville_id", villeId) : q.is("ville_id", null);
  const existing = await q.maybeSingle();
  if (existing.data?.id) return existing.data.id as string;

  const inserted = await supabase
    .from("communes")
    .insert({ name, name_key: key, ville_id: villeId })
    .select("id")
    .single();

  if (inserted.error) {
    let again = supabase.from("communes").select("id").eq("name_key", key);
    again = villeId ? again.eq("ville_id", villeId) : again.is("ville_id", null);
    const r = await again.maybeSingle();
    return (r.data?.id as string) ?? null;
  }
  return inserted.data.id as string;
}

export async function ensureQuartier(
  rawName: string,
  villeId: string | null,
  communeId: string | null,
) {
  const name = normalizeLabel(rawName);
  if (!name) return null;
  const key = labelKey(name);

  let q = supabase
    .from("quartiers")
    .select("id")
    .eq("name_key", key);
  q = communeId ? q.eq("commune_id", communeId) : q.is("commune_id", null);
  q = villeId ? q.eq("ville_id", villeId) : q.is("ville_id", null);
  const existing = await q.maybeSingle();
  if (existing.data?.id) return existing.data.id as string;

  const inserted = await supabase
    .from("quartiers")
    .insert({
      name,
      name_key: key,
      ville_id: villeId,
      commune_id: communeId,
    })
    .select("id")
    .single();

  if (inserted.error) return null;
  return inserted.data.id as string;
}

/** Persist typed geo labels into catalog tables */
export async function syncPatientGeo(input: {
  city?: string | null;
  commune?: string | null;
  quartier?: string | null;
}) {
  const villeId = input.city ? await ensureVille(input.city) : null;
  const communeId = input.commune
    ? await ensureCommune(input.commune, villeId)
    : null;
  if (input.quartier) {
    await ensureQuartier(input.quartier, villeId, communeId);
  }
  return { villeId, communeId };
}
