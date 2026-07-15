"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Camera, Package, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import {
  deleteStorageFile,
  uploadProductPicture,
} from "@/lib/storage";
import type { Produit, ProduitInsert } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

const emptyForm: ProduitInsert = {
  name: "",
  code: "",
  price: 0,
  description: "",
  picture_url: null,
  active: true,
};

export function ProduitsView() {
  const [produits, setProduits] = useState<Produit[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Produit | null>(null);
  const [form, setForm] = useState<ProduitInsert>(emptyForm);
  const [pictureFile, setPictureFile] = useState<File | null>(null);
  const [picturePreview, setPicturePreview] = useState<string | null>(null);
  const [removePicture, setRemovePicture] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("produits")
      .select("*")
      .order("name", { ascending: true });

    if (fetchError) setError(fetchError.message);
    else {
      setError(null);
      setProduits((data as Produit[]) ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    return () => {
      if (picturePreview?.startsWith("blob:")) URL.revokeObjectURL(picturePreview);
    };
  }, [picturePreview]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return produits;
    return produits.filter((p) =>
      [p.name, p.code, String(p.price), p.description]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [produits, search]);

  function resetForm() {
    setEditing(null);
    setForm(emptyForm);
    setPictureFile(null);
    setRemovePicture(false);
    if (picturePreview?.startsWith("blob:")) URL.revokeObjectURL(picturePreview);
    setPicturePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function openCreate() {
    resetForm();
    setOpen(true);
  }

  function openEdit(product: Produit) {
    setEditing(product);
    setForm({
      name: product.name,
      code: product.code ?? "",
      price: Number(product.price),
      description: product.description ?? "",
      picture_url: product.picture_url,
      active: product.active,
    });
    setPictureFile(null);
    setRemovePicture(false);
    setPicturePreview(product.picture_url);
    setOpen(true);
  }

  function onPictureChange(file: File | null) {
    if (picturePreview?.startsWith("blob:")) URL.revokeObjectURL(picturePreview);
    setPictureFile(file);
    setRemovePicture(false);
    setPicturePreview(file ? URL.createObjectURL(file) : editing?.picture_url ?? null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    let picture_url: string | null = editing?.picture_url ?? null;

    if (removePicture && picture_url) {
      await deleteStorageFile(picture_url);
      picture_url = null;
    }

    if (pictureFile) {
      if (editing?.picture_url) {
        await deleteStorageFile(editing.picture_url);
      }
      const upload = await uploadProductPicture(pictureFile);
      if (upload.error) {
        setSaving(false);
        setError(upload.error);
        return;
      }
      picture_url = upload.url;
    }

    const payload = {
      name: form.name.trim(),
      code: form.code?.toString().trim() || null,
      price: Number(form.price) || 0,
      description: form.description || null,
      picture_url,
      active: form.active,
    };

    const result = editing
      ? await supabase.from("produits").update(payload).eq("id", editing.id)
      : await supabase.from("produits").insert(payload);

    setSaving(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    resetForm();
    setOpen(false);
    await load();
  }

  async function handleDelete(product: Produit) {
    if (
      !confirm(
        `Supprimer le produit « ${product.name} » ? L'image sera aussi retirée du bucket.`,
      )
    ) {
      return;
    }

    setError(null);
    if (product.picture_url) {
      await deleteStorageFile(product.picture_url);
    }

    const { error: deleteError } = await supabase
      .from("produits")
      .delete()
      .eq("id", product.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    await load();
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Produits
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Catalogue lié aux commandes — {filtered.length} produit
            {filtered.length > 1 ? "s" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-600"
        >
          <Plus strokeWidth={1.75} className="h-4 w-4" />
          Ajouter un produit
        </button>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="relative max-w-md">
        <Search
          strokeWidth={1.75}
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nom, code, prix…"
          className="w-full rounded-2xl border-0 bg-white py-3 pl-10 pr-4 text-sm shadow-[0_8px_24px_rgba(15,23,42,0.04)] outline-none ring-emerald-500/20 focus:ring-4"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {loading && (
          <div className="col-span-full rounded-3xl bg-white px-5 py-10 text-center text-sm text-slate-400">
            Chargement…
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="col-span-full rounded-3xl bg-white px-5 py-10 text-center text-sm text-slate-400">
            Aucun produit
          </div>
        )}

        {filtered.map((product) => (
          <article
            key={product.id}
            className="flex gap-4 rounded-3xl bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
          >
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-emerald-50 text-emerald-500">
              {product.picture_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.picture_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <Package strokeWidth={1.75} className="h-6 w-6" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">
                    {product.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {product.code || "Sans code"}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    product.active
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {product.active ? "Actif" : "Inactif"}
                </span>
              </div>
              <p className="mt-1 text-sm font-semibold text-emerald-600">
                {formatCurrency(Number(product.price))}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(product)}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-emerald-600"
                >
                  <Pencil strokeWidth={1.75} className="h-3.5 w-3.5" />
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(product)}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 strokeWidth={1.75} className="h-3.5 w-3.5" />
                  Supprimer
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/25 p-4 backdrop-blur-[1px]">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {editing ? "Modifier le produit" : "Nouveau produit"}
                </h2>
                <p className="text-sm text-slate-400">
                  Image compressée avant envoi (centre-bucket)
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setOpen(false);
                }}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-50"
              >
                <X strokeWidth={1.75} className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-emerald-200 bg-emerald-50 text-emerald-500"
                >
                  {picturePreview && !removePicture ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={picturePreview}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Camera strokeWidth={1.75} className="h-6 w-6" />
                  )}
                </button>
                <div>
                  <p className="text-sm font-medium text-slate-700">Photo</p>
                  <div className="mt-1 flex flex-wrap gap-2 text-sm">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="font-medium text-emerald-600"
                    >
                      Choisir
                    </button>
                    {(pictureFile || (editing?.picture_url && !removePicture)) && (
                      <button
                        type="button"
                        onClick={() => {
                          setPictureFile(null);
                          setRemovePicture(true);
                          setPicturePreview(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="font-medium text-slate-400"
                      >
                        Retirer
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      onPictureChange(e.target.files?.[0] ?? null)
                    }
                  />
                </div>
              </div>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700">Nom</span>
                <input
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="field"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-slate-700">
                    Code
                  </span>
                  <input
                    value={form.code ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, code: e.target.value }))
                    }
                    className="field"
                    placeholder="PRD-001"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-slate-700">
                    Prix
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    required
                    value={form.price}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        price: Number(e.target.value),
                      }))
                    }
                    className="field"
                  />
                </label>
              </div>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700">
                  Description
                </span>
                <textarea
                  rows={3}
                  value={form.description ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  className="field resize-none"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, active: e.target.checked }))
                  }
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                Produit actif (disponible en commande)
              </label>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-600 disabled:opacity-60"
              >
                {saving
                  ? "Enregistrement…"
                  : editing
                    ? "Enregistrer"
                    : "Créer le produit"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
