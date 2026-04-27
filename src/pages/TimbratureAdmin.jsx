import { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection, query, orderBy, onSnapshot, limit, where, Timestamp
} from "firebase/firestore";
import {
  Users, MapPin, Search, X, ExternalLink,
  LogIn, LogOut, Clock, ShieldCheck, Download, AlertTriangle
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

//  Coordinate sede K-MARK S.P.A. 
// Aggiorna lat/lng con le coordinate reali della sede aziendale
const SEDE_KMARK = { lat: 45.4654219, lng: 9.1859243 };
const MAX_DIST_M = 500; // soglia "Fuori Sede" in metri

//  Helpers 
const initials  = (n = "") => n.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
const AV_COLORS = ["bg-blue-500","bg-violet-500","bg-rose-500","bg-amber-500","bg-emerald-500","bg-cyan-500","bg-pink-500","bg-orange-500"];
const avColor   = (e = "") => AV_COLORS[e.charCodeAt(0) % AV_COLORS.length];

/** Haversine distance in meters between two GPS points */
function distanceMeters(lat1, lng1, lat2, lng2) {
  const R    = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a    =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Pair entrata/uscita stamps and return total worked ms + human label */
function calcOre(stamps) {
  const sorted = [...stamps].sort(
    (a, b) => (a.createdAt?.toDate?.() || 0) - (b.createdAt?.toDate?.() || 0)
  );
  let totalMs = 0;
  let lastEntrata = null;
  let nEntrate = 0;
  let nUscite  = 0;
  for (const s of sorted) {
    if (s.tipo === "entrata") {
      lastEntrata = s.createdAt?.toDate?.();
      nEntrate++;
    } else if (s.tipo === "uscita" && lastEntrata) {
      const uscita = s.createdAt?.toDate?.();
      if (uscita) totalMs += uscita - lastEntrata;
      lastEntrata = null;
      nUscite++;
    }
  }
  const h   = Math.floor(totalMs / 3600000);
  const min = Math.floor((totalMs % 3600000) / 60000);
  return {
    totalMs,
    label:   totalMs > 0 ? `${h}h ${String(min).padStart(2, "0")}min` : "0h",
    decimal: (totalMs / 3600000).toFixed(2),
    nEntrate,
    nUscite,
  };
}

export default function TimbratureAdmin() {
  const [dipendenti, setDipendenti] = useState([]);
  const [timbrature, setTimbrature] = useState([]);
  const [search,     setSearch]     = useState("");
  const [filtro,     setFiltro]     = useState("tutti");
  const [selected,   setSelected]   = useState(null);

  /* All employees */
  useEffect(() => {
    return onSnapshot(
      query(collection(db, "dipendenti"), orderBy("displayName")),
      (snap) => setDipendenti(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }, []);

  /* Timbrature for current month (needed for export + status) */
  useEffect(() => {
    const startMese = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    return onSnapshot(
      query(
        collection(db, "timbrature"),
        where("createdAt", ">=", Timestamp.fromDate(startMese)),
        orderBy("createdAt", "desc"),
        limit(1000)
      ),
      (snap) => setTimbrature(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }, []);

  /* Latest stamp per userId */
  const latestPerUser = {};
  for (const t of timbrature) {
    if (!latestPerUser[t.userId]) latestPerUser[t.userId] = t;
  }

  /* All stamps per userId (for export) */
  const stampsPerUser = {};
  for (const t of timbrature) {
    if (!stampsPerUser[t.userId]) stampsPerUser[t.userId] = [];
    stampsPerUser[t.userId].push(t);
  }

  /* Merged employee data */
  const employees = dipendenti.map((d) => {
    const latest  = latestPerUser[d.uid] || null;
    const dist    = latest?.lat != null
      ? distanceMeters(latest.lat, latest.lng, SEDE_KMARK.lat, SEDE_KMARK.lng)
      : null;
    return {
      ...d,
      inServizio:  latest?.tipo === "entrata",
      latest,
      distSede:    dist,
      fuoriSede:   dist !== null && dist > MAX_DIST_M,
    };
  });

  const inCount  = employees.filter((e) => e.inServizio).length;
  const outCount = employees.filter((e) => !e.inServizio).length;

  /* Filtered + sorted list */
  const filtered = employees
    .filter((e) =>
      filtro === "in-servizio" ? e.inServizio :
      filtro === "fuori"       ? !e.inServizio : true
    )
    .filter((e) =>
      !search ||
      e.displayName?.toLowerCase().includes(search.toLowerCase()) ||
      e.email?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => (b.inServizio ? 1 : 0) - (a.inServizio ? 1 : 0));

  /*  Export CSV  */
  const exportCSV = () => {
    const now     = new Date();
    const meseStr = format(now, "MMMM yyyy", { locale: it });
    const fileStr = format(now, "yyyy-MM");

    const headers = [
      "Dipendente", "Email", "Reparto",
      "Ore Lavorate", "Ore (decimale)",
      "N. Entrate", "N. Uscite", "Stato"
    ];

    const rows = employees.map((emp) => {
      const stamps = stampsPerUser[emp.uid] || [];
      const ore    = calcOre(stamps);
      return [
        `"${emp.displayName || ""}"`,
        `"${emp.email || ""}"`,
        `"${emp.reparto || ""}"`,
        `"${ore.label}"`,
        ore.decimal,
        ore.nEntrate,
        ore.nUscite,
        `"${emp.inServizio ? "In servizio" : "Fuori servizio"}"`,
      ].join(",");
    });

    const csv  = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `presenze_${fileStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto">

      {/*  Header  */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
            <ShieldCheck size={20} className="text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Controllo Presenze</h1>
            <p className="text-slate-500 text-sm capitalize">
              {format(new Date(), "EEEE d MMMM yyyy", { locale: it })} &mdash; vista amministratore
            </p>
          </div>
        </div>

        <button
          onClick={exportCSV}
          className="flex items-center gap-2 bg-[#27ae60] hover:bg-[#219a52] text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition"
        >
          <Download size={15} />
          Esporta Report
        </button>
      </div>

      {/*  Stats  */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
          <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Users size={20} className="text-slate-500" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">Totale</p>
            <p className="text-3xl font-bold text-slate-800">{employees.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-5 flex items-center gap-4">
          <div className="w-11 h-11 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <LogIn size={20} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-[11px] text-emerald-600 font-semibold uppercase tracking-wide">In servizio</p>
            <p className="text-3xl font-bold text-emerald-600">{inCount}</p>
          </div>
          <div className="ml-auto">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
          <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <LogOut size={20} className="text-slate-400" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">Fuori servizio</p>
            <p className="text-3xl font-bold text-slate-400">{outCount}</p>
          </div>
        </div>
      </div>

      {/*  Main content  */}
      <div className="flex gap-5 items-start">

        {/* Employee table */}
        <div className="flex-1 min-w-0 space-y-3">

          {/* Search + filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text" value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cerca dipendente..."
                className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 shadow-sm"
              />
            </div>
            {[
              { key: "tutti",       label: "Tutti" },
              { key: "in-servizio", label: "In servizio" },
              { key: "fuori",       label: "Fuori servizio" },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setFiltro(key)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                  filtro === key
                    ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                    : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                }`}>
                {label}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Dipendente</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Stato</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Ore mese</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Ultima timbratura</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Posizione</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-14">
                      <Users size={36} className="text-slate-200 mx-auto mb-2" />
                      <p className="text-slate-400 text-sm">Nessun dipendente trovato</p>
                    </td>
                  </tr>
                ) : filtered.map((emp) => {
                  const ts      = emp.latest?.createdAt?.toDate?.();
                  const isSel   = selected?.id === emp.id;
                  const ore     = calcOre(stampsPerUser[emp.uid] || []);
                  const fuori   = emp.fuoriSede && emp.inServizio;

                  return (
                    <tr key={emp.id}
                      onClick={() => setSelected(isSel ? null : emp)}
                      className={`cursor-pointer transition ${
                        isSel ? "bg-emerald-50 ring-inset ring-1 ring-emerald-200" : "hover:bg-slate-50"
                      }`}>

                      {/* Dipendente */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full ${avColor(emp.email)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                            {initials(emp.displayName)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{emp.displayName}</p>
                            <p className="text-xs text-slate-400">{emp.reparto || ""}</p>
                          </div>
                        </div>
                      </td>

                      {/* Stato + Fuori Sede badge */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${emp.inServizio ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
                            <span className={`text-xs font-bold ${emp.inServizio ? "text-emerald-600" : "text-slate-400"}`}>
                              {emp.inServizio ? "In servizio" : "Fuori"}
                            </span>
                          </div>
                          {fuori && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-700 bg-orange-100 border border-orange-200 px-1.5 py-0.5 rounded-full">
                              <AlertTriangle size={9} />
                              Fuori Sede {emp.distSede != null ? `(${Math.round(emp.distSede)}m)` : ""}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Ore mese */}
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold ${ore.totalMs > 0 ? "text-slate-800" : "text-slate-300"}`}>
                          {ore.label}
                        </span>
                      </td>

                      {/* Ultima timbratura */}
                      <td className="px-4 py-3">
                        {ts ? (
                          <div>
                            <div className="flex items-center gap-1.5">
                              {emp.latest?.tipo === "entrata"
                                ? <LogIn  size={11} className="text-emerald-500" />
                                : <LogOut size={11} className="text-rose-500"    />}
                              <span className="font-mono font-bold text-slate-800 text-xs">{format(ts, "HH:mm")}</span>
                              <span className="text-xs text-slate-400">{format(ts, "dd/MM")}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {formatDistanceToNow(ts, { addSuffix: true, locale: it })}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-300 text-xs">Nessuna</span>
                        )}
                      </td>

                      {/* Posizione */}
                      <td className="px-4 py-3">
                        {emp.latest?.lat ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelected(isSel ? null : emp); }}
                            className="flex items-center gap-1 text-xs text-emerald-600 font-semibold hover:underline"
                          >
                            <MapPin size={11} />
                            {isSel ? "Chiudi" : "Vedi mappa"}
                          </button>
                        ) : (
                          <span className="text-slate-300 text-xs"></span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/*  Right panel: map  */}
        {selected?.latest?.lat && (
          <div className="w-[340px] flex-shrink-0">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-4">

              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-full ${avColor(selected.email)} flex items-center justify-center text-white text-xs font-bold`}>
                    {initials(selected.displayName)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{selected.displayName}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <div className={`w-1.5 h-1.5 rounded-full ${selected.inServizio ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
                      <span className={`text-[11px] font-semibold ${selected.inServizio ? "text-emerald-600" : "text-slate-400"}`}>
                        {selected.inServizio ? "In servizio" : "Fuori servizio"}
                      </span>
                      {selected.fuoriSede && selected.inServizio && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded-full border border-orange-200">
                          <AlertTriangle size={9} /> Fuori Sede
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-slate-100">
                  <X size={15} className="text-slate-400" />
                </button>
              </div>

              {/* OpenStreetMap iframe */}
              <div className="bg-slate-100">
                <iframe
                  title={`Posizione di ${selected.displayName}`}
                  width="100%" height="220"
                  style={{ border: 0, display: "block" }}
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${selected.latest.lng - 0.008},${selected.latest.lat - 0.008},${selected.latest.lng + 0.008},${selected.latest.lat + 0.008}&layer=mapnik&marker=${selected.latest.lat},${selected.latest.lng}`}
                />
              </div>

              {/* Details */}
              <div className="p-4 space-y-3">

                {selected.distSede != null && (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border ${
                    selected.fuoriSede
                      ? "bg-orange-50 border-orange-200 text-orange-700"
                      : "bg-emerald-50 border-emerald-200 text-emerald-700"
                  }`}>
                    <MapPin size={12} />
                    {selected.fuoriSede
                      ? `Fuori sede: ${Math.round(selected.distSede)}m dalla sede`
                      : `In sede: ${Math.round(selected.distSede)}m dalla sede`}
                  </div>
                )}

                {selected.latest?.address && (
                  <div className="flex items-start gap-2">
                    <MapPin size={12} className="text-slate-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {selected.latest.address.split(",").slice(0, 3).join(",")}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 font-mono text-xs text-slate-600">
                  <span>{selected.latest.lat.toFixed(6)}° N</span>
                  <span className="text-slate-300">|</span>
                  <span>{selected.latest.lng.toFixed(6)}° E</span>
                  {selected.latest?.accuracy && (
                    <span className="ml-auto text-[10px] text-slate-400">&#177;{Math.round(selected.latest.accuracy)}m</span>
                  )}
                </div>

                {selected.latest?.createdAt?.toDate && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock size={11} />
                    <span>{formatDistanceToNow(selected.latest.createdAt.toDate(), { addSuffix: true, locale: it })}</span>
                    <span className="font-mono font-bold text-slate-700 ml-auto">
                      {format(selected.latest.createdAt.toDate(), "HH:mm")}
                    </span>
                  </div>
                )}

                <a
                  href={`https://www.google.com/maps?q=${selected.latest.lat},${selected.latest.lng}`}
                  target="_blank" rel="noreferrer"
                  className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl py-2.5 transition w-full border border-emerald-200"
                >
                  <ExternalLink size={13} /> Apri in Google Maps
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
