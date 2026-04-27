import { useState, useEffect } from "react";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import {
  collection, addDoc, query, where, onSnapshot,
  Timestamp, deleteDoc, doc, orderBy
} from "firebase/firestore";
import {
  format, getDaysInMonth, getDay,
  addMonths, subMonths, parseISO, isToday
} from "date-fns";
import { it } from "date-fns/locale";
import {
  ChevronLeft, ChevronRight, Plus, X, Trash2,
  MessageSquare, Clock, Check, Search
} from "lucide-react";

const GIUSTIFICATIVI = [
  { value: "ferie",        label: "Ferie",                   bg: "bg-emerald-500", ring: "ring-emerald-300", badge: "bg-emerald-100 text-emerald-800" },
  { value: "malattia",     label: "Malattia",                bg: "bg-rose-500",    ring: "ring-rose-300",    badge: "bg-rose-100 text-rose-800"       },
  { value: "permesso",     label: "Permessi",                bg: "bg-amber-500",   ring: "ring-amber-300",   badge: "bg-amber-100 text-amber-800"     },
  { value: "straordinari", label: "Straordinari",            bg: "bg-cyan-500",    ring: "ring-cyan-300",    badge: "bg-cyan-100 text-cyan-800"       },
  { value: "mat-obb",      label: "Maternita Obbligatoria",  bg: "bg-violet-500",  ring: "ring-violet-300",  badge: "bg-violet-100 text-violet-800"   },
  { value: "mat-fac",      label: "Maternita Facoltativa",   bg: "bg-purple-400",  ring: "ring-purple-300",  badge: "bg-purple-100 text-purple-800"   },
  { value: "pnr",          label: "Permesso Non Retribuito", bg: "bg-slate-400",   ring: "ring-slate-300",   badge: "bg-slate-100 text-slate-700"     },
  { value: "smart",        label: "Smart Work",              bg: "bg-blue-500",    ring: "ring-blue-300",    badge: "bg-blue-100 text-blue-800"       },
];

const getType = (v) => GIUSTIFICATIVI.find((t) => t.value === v) || GIUSTIFICATIVI[0];
const CONTRACT_H = 8;
const DAYS_IT = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
const STATO_BADGE = {
  approvata:  "bg-green-100 text-green-700",
  "in attesa":"bg-yellow-100 text-yellow-700",
  rifiutata:  "bg-red-100 text-red-600",
};

export default function Presenze() {
  const { user } = useAuth();
  const [month, setMonth] = useState(new Date());
  const [absences, setAbsences] = useState([]);
  const [sel, setSel] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cerca, setCerca] = useState("");
  const [form, setForm] = useState({ tipo: "ferie", ore: "8", dataFine: "", note: "" });

  const yr  = month.getFullYear();
  const mo  = month.getMonth();
  const days = getDaysInMonth(month);
  const moStr = `${yr}-${String(mo + 1).padStart(2, "0")}`;

  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      query(collection(db, "presenze"), where("userId", "==", user.uid), orderBy("dataInizio")),
      (snap) => setAbsences(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }, [user]);

  const forDay = (n) => {
    const ds = format(new Date(yr, mo, n), "yyyy-MM-dd");
    return absences.filter((a) => ds >= a.dataInizio && ds <= (a.dataFine || a.dataInizio));
  };

  const selectDay = (n) => {
    const ds = format(new Date(yr, mo, n), "yyyy-MM-dd");
    setSel({ n, ds });
    setShowForm(false);
    setCerca("");
    setForm({ tipo: "ferie", ore: "8", dataFine: ds, note: "" });
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, "presenze"), {
        userId: user.uid, email: user.email,
        tipo: form.tipo, ore: parseFloat(form.ore),
        dataInizio: sel.ds, dataFine: form.dataFine || sel.ds,
        note: form.note, stato: "in attesa",
        createdAt: Timestamp.now(),
      });
      setShowForm(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDel = async (id) => {
    if (!confirm("Eliminare questo giustificativo?")) return;
    await deleteDoc(doc(db, "presenze", id));
  };

  const selAbs  = sel ? forDay(sel.n) : [];
  const selOre  = selAbs.reduce((s, a) => s + (a.ore || CONTRACT_H), 0);

  const monthAbs = absences.filter((a) => a.dataInizio?.startsWith(moStr));
  const totals   = GIUSTIFICATIVI.map((t) => ({
    ...t,
    h: monthAbs.filter((a) => a.tipo === t.value).reduce((s, a) => s + (a.ore || CONTRACT_H), 0),
  })).filter((t) => t.h > 0);

  const filteredG = GIUSTIFICATIVI.filter((t) =>
    !cerca || t.label.toLowerCase().includes(cerca.toLowerCase())
  );

  return (
    <div className="flex -m-4 md:-m-6 overflow-hidden bg-slate-50" style={{ height: "calc(100vh - 4rem)" }}>

      {/*  CALENDAR AREA  */}
      <div className={`flex flex-col flex-1 min-w-0 overflow-hidden transition-all duration-200 ${sel ? "max-w-[calc(100%-320px)]" : ""}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200 flex-shrink-0 shadow-sm">
          <h1 className="text-base font-bold text-slate-800">Presenze</h1>
          <div className="flex items-center gap-1">
            <button onClick={() => setMonth((m) => subMonths(m, 1))} className="p-1.5 rounded-lg hover:bg-slate-100 transition">
              <ChevronLeft size={16} className="text-slate-500" />
            </button>
            <span className="text-sm font-semibold text-slate-700 capitalize px-2 min-w-[130px] text-center">
              {format(month, "MMMM yyyy", { locale: it })}
            </span>
            <button onClick={() => setMonth((m) => addMonths(m, 1))} className="p-1.5 rounded-lg hover:bg-slate-100 transition">
              <ChevronRight size={16} className="text-slate-500" />
            </button>
          </div>
          <div className="w-24" />
        </div>

        {/* Scrollable grid */}
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
              <tr>
                <th className="sticky left-0 z-30 bg-white px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide w-24 border-r border-slate-100">
                  Giorno
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                  Assenze / Giustificativi
                </th>
              </tr>
            </thead>

            <tbody>
              {Array.from({ length: days }, (_, i) => {
                const n    = i + 1;
                const date = new Date(yr, mo, n);
                const dow  = getDay(date);
                const isWE = dow === 0 || dow === 6;
                const today = isToday(date);
                const abs  = forDay(n);
                const isSel = sel?.n === n;
                const oreAss = abs.reduce((s, a) => s + (a.ore || CONTRACT_H), 0);

                return (
                  <tr
                    key={n}
                    onClick={() => selectDay(n)}
                    className={`border-b border-slate-100 cursor-pointer transition-colors
                      ${isSel ? "bg-green-50 ring-inset ring-1 ring-green-200" : ""}
                      ${!isSel && !isWE ? "hover:bg-slate-50" : ""}
                      ${isWE && !isSel ? "bg-[repeating-linear-gradient(135deg,transparent,transparent_4px,rgba(0,0,0,0.025)_4px,rgba(0,0,0,0.025)_8px)]" : ""}
                    `}
                  >
                    {/* Day number cell */}
                    <td className={`sticky left-0 z-10 px-4 py-2 border-r border-slate-100 font-medium w-24 
                      ${isSel ? "bg-green-50" : isWE ? "bg-slate-50" : "bg-white"}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0
                          ${today ? "bg-[#27ae60] text-white" : isWE ? "text-slate-400" : "text-slate-600"}`}>
                          {n}
                        </div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wide">{DAYS_IT[dow]}</span>
                      </div>
                    </td>

                    {/* Absence pills cell */}
                    <td className="px-3 py-2 min-h-[44px]">
                      {isWE ? (
                        <span className="text-slate-300 text-[11px]">Riposo</span>
                      ) : abs.length > 0 ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {abs.map((a, ai) => {
                            const t = getType(a.tipo);
                            return (
                              <span key={ai} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-white ${t.bg} shadow-sm`}>
                                {a.ore || CONTRACT_H}h
                                <span className="font-normal opacity-90 ml-0.5">{t.label}</span>
                              </span>
                            );
                          })}
                          {oreAss < CONTRACT_H && (
                            <span className="text-[11px] text-slate-400 ml-1">
                              {CONTRACT_H - oreAss}h rimaste
                            </span>
                          )}
                          {oreAss >= CONTRACT_H && (
                            <span className="text-[11px] text-slate-400 ml-1">0h</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-300 font-medium">{CONTRACT_H}h</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Summary footer */}
            {totals.length > 0 && (
              <tfoot className="sticky bottom-0 z-20 bg-white border-t-2 border-slate-200">
                {totals.map((t) => (
                  <tr key={t.value} className="border-b border-slate-100">
                    <td className="sticky left-0 bg-white z-30 px-4 py-2 border-r border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className={`w-1 h-5 rounded-full ${t.bg}`} />
                        <span className="text-[11px] font-semibold text-slate-600">&rsaquo; {t.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <span className="text-[11px] font-bold text-slate-700">{t.h}h</span>
                    </td>
                  </tr>
                ))}
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/*  RIGHT PANEL  */}
      {sel && (
        <div className="w-80 flex-shrink-0 bg-white border-l border-slate-200 flex flex-col overflow-hidden shadow-lg">

          {/* Panel header */}
          <div className="px-4 py-4 border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-slate-800">Presenza</h3>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-slate-700">{selOre}h</span>
                <button onClick={() => setSel(null)} className="p-1 rounded-lg hover:bg-slate-100 ml-1">
                  <X size={16} className="text-slate-400" />
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-500 capitalize">
              {format(parseISO(sel.ds), "EEEE d MMMM yyyy", { locale: it })}
            </p>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <Clock size={10} />
              Da contratto avrebbe lavorato {CONTRACT_H}h
            </p>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">

            {/* Giustificativi */}
            <div className="px-4 pt-4">
              <h4 className="text-sm font-bold text-slate-700 mb-2">Giustificativi</h4>

              {selAbs.length > 0 ? (
                <div className="space-y-2 mb-3">
                  {selAbs.map((a) => {
                    const t = getType(a.tipo);
                    return (
                      <div key={a.id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
                        <span className="text-base font-bold text-slate-700 w-8 flex-shrink-0">{a.ore || CONTRACT_H}h</span>
                        <div className="flex-1 min-w-0">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${STATO_BADGE[a.stato] || "bg-slate-100 text-slate-500"}`}>
                            {a.stato === "approvata" ? "Approvato" : a.stato === "rifiutata" ? "Rifiutato" : "In attesa"}
                          </span>
                          <p className="text-xs font-semibold text-slate-700 mt-0.5 truncate">{t.label}</p>
                        </div>
                        <button onClick={() => handleDel(a.id)}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition flex-shrink-0">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 mb-3">Nessun giustificativo.</p>
              )}

              {/* Add button */}
              {!showForm ? (
                <button onClick={() => setShowForm(true)}
                  className="w-full flex items-center justify-center gap-2 bg-[#27ae60] hover:bg-[#219a52] text-white rounded-xl py-2.5 text-sm font-semibold transition shadow-sm mb-4">
                  <Plus size={15} /> + Aggiungi giustificativo
                </button>
              ) : (
                <form onSubmit={handleAdd} className="mb-4 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                  <div className="px-3 py-2.5 bg-slate-50 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-700">Giustificativi</p>
                    <p className="text-[11px] text-slate-500">Nuovo giustificativo</p>
                  </div>

                  <div className="p-3 space-y-2.5">
                    {/* Type searchable dropdown */}
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 mb-1 block">
                        Seleziona giustificativo *
                      </label>
                      <div className="border border-[#27ae60] rounded-lg overflow-hidden">
                        <div className="flex items-center px-2.5 py-1.5 bg-white border-b border-slate-100">
                          <Search size={11} className="text-slate-400 mr-1.5 flex-shrink-0" />
                          <input
                            type="text" value={cerca}
                            onChange={(e) => setCerca(e.target.value)}
                            placeholder="Cerca..."
                            className="text-xs w-full focus:outline-none bg-transparent"
                          />
                        </div>
                        <div className="max-h-40 overflow-y-auto bg-white divide-y divide-slate-50">
                          {filteredG.map((t) => (
                            <button key={t.value} type="button"
                              onClick={() => { setForm((f) => ({ ...f, tipo: t.value })); setCerca(""); }}
                              className={`w-full text-left px-3 py-2 text-xs transition flex items-center gap-2
                                ${form.tipo === t.value ? "bg-green-50 text-green-700 font-semibold" : "text-slate-700 hover:bg-slate-50"}`}>
                              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${t.bg}`} />
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* Selected pill */}
                      <div className={`mt-1.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-white ${getType(form.tipo).bg}`}>
                        {getType(form.tipo).label}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Ore</label>
                        <input type="number" step="0.5" min="0.5" max="24" value={form.ore}
                          onChange={(e) => setForm((f) => ({ ...f, ore: e.target.value }))}
                          className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#27ae60]" />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Fine periodo</label>
                        <input type="date" value={form.dataFine} min={sel.ds}
                          onChange={(e) => setForm((f) => ({ ...f, dataFine: e.target.value }))}
                          className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#27ae60]" />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button type="submit" disabled={loading}
                        className="flex-1 bg-[#27ae60] hover:bg-[#219a52] text-white rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition">
                        <Check size={12} /> {loading ? "..." : "Salva"}
                      </button>
                      <button type="button" onClick={() => setShowForm(false)}
                        className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg py-2 text-xs transition">
                        Annulla
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>

            {/* Comments */}
            <div className="px-4 pb-6">
              <div className="flex gap-4 border-b border-slate-100 mb-3">
                <button className="text-xs font-bold text-[#27ae60] border-b-2 border-[#27ae60] pb-1.5 -mb-px">
                  Commenti
                </button>
                <button className="text-xs text-slate-400 pb-1.5">
                  Log delle attivita
                </button>
              </div>
              <input
                type="text"
                placeholder="Aggiungi un commento..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#27ae60] mb-4"
              />
              <div className="text-center py-6">
                <MessageSquare size={36} className="text-slate-200 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Al momento non c&apos;e nessun messaggio!</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
