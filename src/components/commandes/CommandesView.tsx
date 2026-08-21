"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ChevronRight, Pencil, Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type {
  Commande,
  CommandeStatus,
  OrderItem,
  Patient,
  Produit,
} from "@/lib/types";
import { isOrderEditable, SALE_STATUS } from "@/lib/types";
import { formatCurrency, formatDate, patientFullName } from "@/lib/format";
import { usePagination } from "@/hooks/usePagination";
import { PageLoader } from "@/components/ui/NiceLoader";
import { Pagination } from "@/components/ui/Pagination";
import { SummaryKpis } from "@/components/ui/SummaryKpis";
import { FilterToolbar, DatePresetChips } from "@/components/ui/FilterToolbar";
import {
  currentMonthValue,
  getPresetRange,
  inDateRange,
  type DatePreset,
} from "@/lib/date-filters";

const statusFilters = [
  "Toutes",
  "En attente",
  "Livrée",
  "Payée",
  "Annulée",
] as const;

const ALL_STATUSES: CommandeStatus[] = [
  "En attente",
  "Livrée",
  "Payée",
  "Annulée",
];

const statusMeta: Record<string, { label: string; dot: string }> = {
  "En attente": { label: "En attente", dot: "bg-amber-500 status-dot-pending" },
  Livrée: { label: "Livrée", dot: "bg-teal-500 status-dot-ok" },
  Payée: { label: "Payée (vente)", dot: "bg-emerald-500 status-dot-ok" },
  Annulée: { label: "Annulée", dot: "bg-slate-400 status-dot-muted" },
};

type ItemDraft = OrderItem;

const emptyItem = (): ItemDraft => ({
  product_id: "",
  name: "",
  code: "",
  qty: 1,
  price: 0,
});

export function CommandesView() {
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [filter, setFilter] =
    useState<(typeof statusFilters)[number]>("Toutes");
  const [search, setSearch] = useState("");
  const [preset, setPreset] = useState<DatePreset | "all">("all");
  const [month, setMonth] = useState(currentMonthValue());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Commande | null>(null);
  const [selected, setSelected] = useState<Commande | null>(null);
  const [statusDraft, setStatusDraft] = useState<CommandeStatus>("En attente");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [orderedByName, setOrderedByName] = useState("");
  const [orderAddress, setOrderAddress] = useState("");
  const [deliveryNumber, setDeliveryNumber] = useState("");
  const [diseaseToTreat, setDiseaseToTreat] = useState("");
  const [orderDetails, setOrderDetails] = useState("");
  const [items, setItems] = useState<ItemDraft[]>([emptyItem()]);

  async function load() {
    setLoading(true);
    const [commandesRes, patientsRes, produitsRes] = await Promise.all([
      supabase
        .from("commandes")
        .select("*, patients(id, first_name, last_name)")
        .order("created_at", { ascending: false }),
      supabase
        .from("patients")
        .select("*")
        .order("last_name", { ascending: true }),
      supabase
        .from("produits")
        .select("*")
        .eq("active", true)
        .order("name", { ascending: true }),
    ]);

    if (commandesRes.error || patientsRes.error || produitsRes.error) {
      setError(
        commandesRes.error?.message ||
          patientsRes.error?.message ||
          produitsRes.error?.message ||
          "Erreur de chargement",
      );
    } else {
      setError(null);
      setCommandes((commandesRes.data as Commande[]) ?? []);
      setPatients(patientsRes.data ?? []);
      setProduits((produitsRes.data as Produit[]) ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const range = useMemo(
    () =>
      preset === "all"
        ? null
        : getPresetRange(preset, { month }),
    [preset, month],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return commandes.filter((c) => {
      if (filter !== "Toutes" && c.status !== filter) return false;
      if (!inDateRange(c.created_at, range)) return false;
      if (!q) return true;
      const patientName = c.patients
        ? `${c.patients.first_name} ${c.patients.last_name}`.toLowerCase()
        : "";
      return (
        c.reference_id.toLowerCase().includes(q) ||
        patientName.includes(q) ||
        (c.disease_to_treat || "").toLowerCase().includes(q)
      );
    });
  }, [commandes, filter, search, range]);

  const orderKpis = useMemo(() => {
    const pending = filtered.filter((c) => c.status === "En attente").length;
    const paid = filtered.filter((c) => c.status === "Payée").length;
    const totalAmt = filtered.reduce(
      (s, c) => s + Number(c.total_amount || 0),
      0,
    );
    return [
      {
        label: "Commandes",
        value: String(filtered.length),
        hint: "Selon filtres",
        iconSrc: "/icons/kpi-orders.svg",
        tone: "blue" as const,
      },
      {
        label: "En attente",
        value: String(pending),
        iconSrc: "/icons/kpi-pending.svg",
        tone: "amber" as const,
      },
      {
        label: "Payées",
        value: String(paid),
        iconSrc: "/icons/kpi-paid.svg",
        tone: "emerald" as const,
      },
      {
        label: "Montant",
        value: formatCurrency(totalAmt),
        iconSrc: "/icons/kpi-money.svg",
        tone: "violet" as const,
      },
    ];
  }, [filtered]);

  const {
    page,
    setPage,
    totalPages,
    pageItems,
    total,
    from,
    to,
  } = usePagination(filtered, 10);

  const totalAmount = items.reduce(
    (sum, item) => sum + Number(item.qty || 0) * Number(item.price || 0),
    0,
  );

  function updateItem(index: number, patch: Partial<ItemDraft>) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }

  function applyProduct(index: number, productId: string) {
    const product = produits.find((p) => p.id === productId);
    if (!product) {
      updateItem(index, { product_id: "", name: "", code: "", price: 0 });
      return;
    }
    updateItem(index, {
      product_id: product.id,
      name: product.name,
      code: product.code ?? "",
      price: Number(product.price),
    });
  }

  function applyPatient(id: string) {
    setPatientId(id);
    const patient = patients.find((p) => p.id === id);
    if (!patient) return;
    setOrderedByName(patientFullName(patient.first_name, patient.last_name));
    setOrderAddress(patient.address ?? "");
  }

  function resetOrderForm() {
    setEditingOrder(null);
    setPatientId("");
    setOrderedByName("");
    setOrderAddress("");
    setDeliveryNumber("");
    setDiseaseToTreat("");
    setOrderDetails("");
    setItems([emptyItem()]);
  }

  function openCreate() {
    resetOrderForm();
    setFormOpen(true);
  }

  function openEditOrder(commande: Commande) {
    if (!isOrderEditable(commande.status)) return;
    setEditingOrder(commande);
    setPatientId(commande.patient_id);
    setOrderedByName(commande.ordered_by_name ?? "");
    setOrderAddress(commande.address ?? "");
    setDeliveryNumber(commande.delivery_number ?? "");
    setDiseaseToTreat(commande.disease_to_treat ?? "");
    setOrderDetails(commande.details ?? "");
    setItems(
      Array.isArray(commande.items) && commande.items.length
        ? commande.items.map((i) => ({
            product_id: i.product_id ?? "",
            name: i.name,
            code: i.code ?? "",
            qty: i.qty,
            price: i.price,
          }))
        : [emptyItem()],
    );
    setSelected(null);
    setFormOpen(true);
  }

  function openOrder(commande: Commande) {
    setSelected(commande);
    setStatusDraft((commande.status as CommandeStatus) || "En attente");
  }

  async function saveStatus() {
    if (!selected) return;
    setUpdatingStatus(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("commandes")
      .update({ status: statusDraft })
      .eq("id", selected.id);

    setUpdatingStatus(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSelected(null);
    await load();
  }

  async function handleDeleteOrder(commande: Commande) {
    if (!isOrderEditable(commande.status)) {
      setError("Seules les commandes « En attente » peuvent être supprimées.");
      return;
    }
    if (!confirm(`Supprimer la commande ${commande.reference_id} ?`)) return;

    const { error: deleteError } = await supabase
      .from("commandes")
      .delete()
      .eq("id", commande.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setSelected(null);
    await load();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!patientId) {
      setError("Sélectionnez un patient");
      return;
    }

    const cleanItems = items.filter((item) => item.name.trim() && item.qty > 0);
    if (cleanItems.length === 0) {
      setError("Ajoutez au moins un produit");
      return;
    }

    setSaving(true);
    setError(null);

    const payloadItems = cleanItems.map((i) => ({
      product_id: i.product_id || undefined,
      name: i.name,
      code: i.code?.trim() || undefined,
      qty: i.qty,
      price: i.price,
    }));

    if (editingOrder) {
      const { error: updateError } = await supabase
        .from("commandes")
        .update({
          patient_id: patientId,
          items: payloadItems,
          total_amount: totalAmount,
          ordered_by_name: orderedByName.trim() || null,
          address: orderAddress.trim() || null,
          delivery_number: deliveryNumber.trim() || null,
          disease_to_treat: diseaseToTreat.trim() || null,
          details: orderDetails.trim() || null,
        })
        .eq("id", editingOrder.id);

      setSaving(false);
      if (updateError) {
        setError(updateError.message);
        return;
      }
    } else {
      const year = new Date().getFullYear();
      const seq = String(commandes.length + 1).padStart(3, "0");
      const reference_id = `CMD-${year}-${seq}`;

      const { error: insertError } = await supabase.from("commandes").insert({
        reference_id,
        patient_id: patientId,
        items: payloadItems,
        total_amount: totalAmount,
        status: "En attente",
        ordered_by_name: orderedByName.trim() || null,
        address: orderAddress.trim() || null,
        delivery_number: deliveryNumber.trim() || null,
        disease_to_treat: diseaseToTreat.trim() || null,
        details: orderDetails.trim() || null,
      });

      setSaving(false);
      if (insertError) {
        setError(insertError.message);
        return;
      }
    }

    resetOrderForm();
    setFormOpen(false);
    await load();
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Commandes
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Produits du catalogue — édition / suppression uniquement si{" "}
            <span className="font-medium text-amber-600">En attente</span>.{" "}
            <span className="font-medium text-emerald-600">{SALE_STATUS}</span> =
            vente.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-600"
        >
          <Plus strokeWidth={1.75} className="h-4 w-4" />
          Nouvelle commande
        </button>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <SummaryKpis items={orderKpis} />

      <FilterToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Référence, patient, maladie…"
      >
        <DatePresetChips
          value={preset}
          onChange={(v) => setPreset(v as DatePreset | "all")}
          options={[
            { id: "all", label: "Toutes dates" },
            { id: "aujourd_hui", label: "Aujourd'hui" },
            { id: "hier", label: "Hier" },
            { id: "month", label: "Mois" },
          ]}
        />
        {preset === "month" && (
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="field h-10 w-40 py-0"
          />
        )}
      </FilterToolbar>

      <div className="flex flex-wrap gap-5 border-b border-slate-200/80">
        {statusFilters.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilter(status)}
            className={`relative pb-3 text-sm font-medium transition ${
              filter === status
                ? "text-slate-900"
                : "text-slate-400 hover:text-slate-700"
            }`}
          >
            {status}
            {filter === status && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-emerald-500" />
            )}
          </button>
        ))}
      </div>

      <div className="data-table">
        {loading && <PageLoader label="Chargement des commandes…" />}
        {!loading && filtered.length === 0 && (
          <div className="px-5 py-10 text-center text-sm text-slate-400">
            Aucune commande
          </div>
        )}
        {!loading && filtered.length > 0 && (
          <div className="data-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Patient</th>
                  <th>Date</th>
                  <th>Montant</th>
                  <th>Statut</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((commande) => {
                  const meta = statusMeta[commande.status] ?? statusMeta.Annulée;
                  const mutable = isOrderEditable(commande.status);
                  return (
                    <tr
                      key={commande.id}
                      className="row-click"
                      onClick={() => openOrder(commande)}
                    >
                      <td className="cell-strong">{commande.reference_id}</td>
                      <td>
                        {commande.patients
                          ? patientFullName(
                              commande.patients.first_name,
                              commande.patients.last_name,
                            )
                          : "—"}
                      </td>
                      <td>{formatDate(commande.created_at)}</td>
                      <td className="cell-strong tabular-nums">
                        {formatCurrency(Number(commande.total_amount))}
                      </td>
                      <td>
                        <span className="inline-flex items-center gap-2 text-sm">
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${meta.dot}`}
                          />
                          {meta.label}
                        </span>
                      </td>
                      <td>
                        <div
                          className="flex items-center justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {mutable && (
                            <>
                              <button
                                type="button"
                                title="Modifier"
                                onClick={() => openEditOrder(commande)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"
                              >
                                <Pencil strokeWidth={1.75} className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                title="Supprimer"
                                onClick={() => handleDeleteOrder(commande)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 strokeWidth={1.75} className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            title="Ouvrir"
                            onClick={() => openOrder(commande)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-50"
                          >
                            <ChevronRight strokeWidth={1.75} className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          from={from}
          to={to}
          onPageChange={setPage}
          label="commandes"
        />
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/25 p-4 backdrop-blur-[1px]">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {selected.reference_id}
                </h2>
                <p className="text-sm text-slate-400">Statut de la commande</p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-50"
              >
                <X strokeWidth={1.75} className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <p>
                  Patient :{" "}
                  <span className="font-medium text-slate-900">
                    {selected.patients
                      ? patientFullName(
                          selected.patients.first_name,
                          selected.patients.last_name,
                        )
                      : "—"}
                  </span>
                </p>
                <p className="mt-1">
                  Commandé par :{" "}
                  <span className="font-medium text-slate-900">
                    {selected.ordered_by_name || "—"}
                  </span>
                </p>
                <p className="mt-1">
                  Adresse :{" "}
                  <span className="font-medium text-slate-900">
                    {selected.address || "—"}
                  </span>
                </p>
                <p className="mt-1">
                  N° de livraison :{" "}
                  <span className="font-medium text-slate-900">
                    {selected.delivery_number || "—"}
                  </span>
                </p>
                <p className="mt-1">
                  Maladie à traiter :{" "}
                  <span className="font-medium text-slate-900">
                    {selected.disease_to_treat || "—"}
                  </span>
                </p>
                {selected.details && (
                  <p className="mt-1">
                    Détails :{" "}
                    <span className="font-medium text-slate-900">
                      {selected.details}
                    </span>
                  </p>
                )}
                <p className="mt-1">
                  Total :{" "}
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(Number(selected.total_amount))}
                  </span>
                </p>
              </div>

              {Array.isArray(selected.items) && selected.items.length > 0 && (
                <ul className="space-y-1.5 text-sm text-slate-600">
                  {selected.items.map((item, i) => (
                    <li
                      key={i}
                      className="flex justify-between gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-slate-100"
                    >
                      <span>
                        {item.code ? (
                          <span className="mr-1.5 text-xs text-slate-400">
                            [{item.code}]
                          </span>
                        ) : null}
                        {item.name} × {item.qty}
                      </span>
                      <span className="font-medium">
                        {formatCurrency(Number(item.qty) * Number(item.price))}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700">
                  Statut
                </span>
                <select
                  value={statusDraft}
                  onChange={(e) =>
                    setStatusDraft(e.target.value as CommandeStatus)
                  }
                  className="field"
                >
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s === "Payée" ? "Payée (livrée + payée → vente)" : s}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex flex-col gap-2 sm:flex-row">
                {isOrderEditable(selected.status) && (
                  <>
                    <button
                      type="button"
                      onClick={() => openEditOrder(selected)}
                      className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-200"
                    >
                      Modifier lignes
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteOrder(selected)}
                      className="flex-1 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-100"
                    >
                      Supprimer
                    </button>
                  </>
                )}
                <button
                  type="button"
                  disabled={updatingStatus}
                  onClick={saveStatus}
                  className="flex-1 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-600 disabled:opacity-60"
                >
                  {updatingStatus ? "Mise à jour…" : "Enregistrer le statut"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/25 p-4 backdrop-blur-[1px]">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {editingOrder
                    ? `Modifier ${editingOrder.reference_id}`
                    : "Nouvelle commande"}
                </h2>
                <p className="text-sm text-slate-400">
                  Sélectionnez des produits du catalogue
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  resetOrderForm();
                  setFormOpen(false);
                }}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-50"
              >
                <X strokeWidth={1.75} className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
              {produits.length === 0 && (
                <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Aucun produit actif. Créez-en dans l&apos;onglet Produits.
                </div>
              )}

              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700">
                  Patient
                </span>
                <select
                  required
                  value={patientId}
                  onChange={(e) => applyPatient(e.target.value)}
                  className="field"
                >
                  <option value="">Sélectionner un patient</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {patientFullName(p.first_name, p.last_name)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700">
                  Nom de celui qui a commandé
                </span>
                <input
                  required
                  value={orderedByName}
                  onChange={(e) => setOrderedByName(e.target.value)}
                  className="field"
                  placeholder="Nom et prénom"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700">
                  Adresse
                </span>
                <textarea
                  required
                  rows={2}
                  value={orderAddress}
                  onChange={(e) => setOrderAddress(e.target.value)}
                  className="field resize-none"
                  placeholder="Adresse de livraison"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-slate-700">
                    Numéro de livraison
                  </span>
                  <input
                    required
                    value={deliveryNumber}
                    onChange={(e) => setDeliveryNumber(e.target.value)}
                    className="field"
                    placeholder="Téléphone ou n° de suivi"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-slate-700">
                    Maladie à traiter
                  </span>
                  <input
                    required
                    value={diseaseToTreat}
                    onChange={(e) => setDiseaseToTreat(e.target.value)}
                    className="field"
                  />
                </label>
              </div>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700">
                  Détails
                </span>
                <textarea
                  rows={3}
                  value={orderDetails}
                  onChange={(e) => setOrderDetails(e.target.value)}
                  className="field resize-none"
                  placeholder="Précisions, consignes de livraison…"
                />
              </label>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-700">Produits</p>
                  <button
                    type="button"
                    onClick={() => setItems((prev) => [...prev, emptyItem()])}
                    className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700"
                  >
                    <Plus strokeWidth={1.75} className="h-4 w-4" />
                    Ligne
                  </button>
                </div>

                {items.map((item, index) => (
                  <div
                    key={index}
                    className="grid gap-2 rounded-2xl bg-slate-50 p-3 sm:grid-cols-[1fr_70px_36px]"
                  >
                    <select
                      required
                      value={item.product_id || ""}
                      onChange={(e) => applyProduct(index, e.target.value)}
                      className="field"
                    >
                      <option value="">Choisir un produit…</option>
                      {produits.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.code ? `[${p.code}] ` : ""}
                          {p.name} — {formatCurrency(Number(p.price))}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={item.qty}
                      onChange={(e) =>
                        updateItem(index, { qty: Number(e.target.value) })
                      }
                      className="field"
                      title="Quantité"
                    />
                    <button
                      type="button"
                      disabled={items.length === 1}
                      onClick={() =>
                        setItems((prev) => prev.filter((_, i) => i !== index))
                      }
                      className="flex items-center justify-center rounded-xl text-slate-400 hover:bg-white hover:text-red-500 disabled:opacity-30"
                    >
                      <Trash2 strokeWidth={1.75} className="h-4 w-4" />
                    </button>
                    {item.name && (
                      <p className="text-xs text-slate-400 sm:col-span-3">
                        {item.code ? `${item.code} · ` : ""}
                        {item.name} @ {formatCurrency(Number(item.price))}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3">
                <span className="text-sm text-emerald-700/70">Montant total</span>
                <span className="text-lg font-semibold text-emerald-700">
                  {formatCurrency(totalAmount)}
                </span>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-600 disabled:opacity-60"
              >
                {saving
                  ? "Enregistrement…"
                  : editingOrder
                    ? "Enregistrer les modifications"
                    : "Créer la commande"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
