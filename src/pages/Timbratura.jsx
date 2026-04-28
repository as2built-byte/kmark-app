import { useState, useEffect } from "react";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import {
  collection, addDoc, query, where, orderBy,
  onSnapshot, Timestamp, limit
} from "firebase/firestore";
import {
  Clock, MapPin, Loader2, CheckCircle2, LogIn, LogOut,
  Navigation, AlertCircle, RefreshCw, Building2, ChevronDown, Search
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export default function Timbratura() {
  const { user } = useAuth();
  const [time, setTime]               = useState(new Date());
  const [location, setLocation]       = useState(null);
  const [locLoading, setLocLoading]   = useState(false);
  const [locError, setLocError]       = useState("");
  const [address, setAddress]         = useState("");
  const [addrLoading, setAddrLoading] = useState(false);
  const [stamping, setStamping]       = useState(null);
  const [success, setSuccess]         = useState("");
  const [timbrature, setTimbrature]   = useState([]);
  const [inServizio, setInServizio]   = useState(false);
  const [luogoObj, setLuogoObj]       = useState(null);
  const [luogoError, setLuogoError]   = useState("");
  const [cantieri, setCantieri]       = useState([]);
  const [showPanel, setShowPanel]     = useState(false);
  const [siteSearch, setSiteSearch]   = useState("");

  /* Live clock */
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  /* Load cantieri from Firestore */
  useEffect(() => {
    return onSnapshot(
      query(collection(db, 'cantieri'), orderBy('nome')),
      snap => setCantieri(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err => console.error('[cantieri] onSnapshot error:', err)
    );
  }, []);

  /* Firestore listener */
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "timbrature"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    return onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setTimbrature(rows);
        setInServizio(rows.length > 0 && rows[0].tipo === "entrata");
      },
      (err) => console.error('[timbrature] onSnapshot error:', err)
    );
  }, [user]);

  /* Fetch address from Nominatim — returns the string AND updates state */
  const fetchAddress = async (lat, lng) => {
    setAddrLoading(true);
    try {
      const res  = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { "Accept-Language": "it" } }
      );
      const data = await res.json();
      const addr = data.display_name || "";
      setAddress(addr);
      return addr;
    } catch {
      setAddress("");
      return "";
    } finally {
      setAddrLoading(false);
    }
  };

  /* Get position */
  const getLocation = () => {
    setLocLoading(true);
    setLocError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setLocation({ latitude, longitude, accuracy });
        setLocLoading(false);
        fetchAddress(latitude, longitude);
      },
      (err) => {
        setLocError("GPS non disponibile: " + err.message);
        setLocLoading(false);
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  useEffect(() => { getLocation(); }, []);

  const filteredCantieri = cantieri.filter(c =>
    c.nome.toLowerCase().includes(siteSearch.toLowerCase()) ||
    (c.indirizzo || '').toLowerCase().includes(siteSearch.toLowerCase())
  );

  /* Stamp */
  const handleStamp = async (tipo) => {
    if (!luogoObj) { setLuogoError("Seleziona il luogo prima di timbrare."); return; }
    setLuogoError("");
    if (!location) { setLocError("Posizione GPS non disponibile. Clicca il tasto aggiorna."); return; }
    setStamping(tipo);
    try {
      /* Guarantee address is resolved before saving — fetch if not yet available */
      const finalAddress = address || await fetchAddress(location.latitude, location.longitude);
      await addDoc(collection(db, "timbrature"), {
        userId:          user.uid,
        email:           user.email,
        tipo,
        luogo:           luogoObj.nome,
        luogoIndirizzo:  luogoObj.indirizzo || null,
        lat:             location.latitude,
        lng:             location.longitude,
        accuracy:        location.accuracy,
        address:         finalAddress || null,
        createdAt:       Timestamp.now(),
      });
      setSuccess(tipo === "entrata" ? "Entrata registrata con successo!" : "Uscita registrata con successo!");
      setTimeout(() => setSuccess(""), 4000);
    } catch (e) {
      setLocError("Errore: " + e.message);
    } finally {
      setStamping(null);
    }
  };

  const gmapsUrl = location
    ? `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
    : null;

  const accuracyColor =
    !location ? "bg-slate-400" :
    location.accuracy < 50  ? "bg-green-500" :
    location.accuracy < 150 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Timbratura</h1>
        <p className="text-slate-500 text-sm mt-0.5">Registra la tua entrata e uscita</p>
      </div>

      {/* Status + clock */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold mb-1.5">Stato attuale</p>
            <div className="flex items-center gap-2.5">
              <div className={`w-3 h-3 rounded-full ${inServizio ? "bg-green-500 animate-pulse" : "bg-slate-300"}`} />
              <span className={`text-xl font-bold ${inServizio ? "text-green-600" : "text-slate-400"}`}>
                {inServizio ? "In servizio" : "Fuori servizio"}
              </span>
            </div>
            {timbrature.length > 0 && (
              <p className="text-xs text-slate-400 mt-1">
                Ultima timbratura:{" "}
                <span className="font-medium text-slate-600">
                  {format(timbrature[0].createdAt?.toDate?.() || new Date(), "HH:mm dd/MM/yyyy")}
                </span>
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold text-slate-800 tabular-nums tracking-tight">
              {format(time, "HH:mm:ss")}
            </p>
            <p className="text-xs text-slate-400 mt-0.5 capitalize">
              {format(time, "EEEE d MMMM yyyy", { locale: it })}
            </p>
          </div>
        </div>
      </div>

      {/* Success banner */}
      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm font-medium">
          <CheckCircle2 size={16} /> {success}
        </div>
      )}

      {/* Action buttons */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <p className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold mb-3">Luogo / Cantiere</p>

        {/* Custom site picker */}
        <div className="relative mb-4">
          <button
            type="button"
            onClick={() => { setShowPanel(!showPanel); setSiteSearch(""); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition ${
              luogoError
                ? "border-red-400 bg-red-50"
                : luogoObj
                ? "border-emerald-400 bg-emerald-50"
                : "border-slate-200 bg-slate-50"
            }`}
          >
            <Building2 size={15} className={luogoObj ? "text-emerald-600" : "text-slate-400"} />
            <div className="flex-1 min-w-0">
              {luogoObj ? (
                <>
                  <p className="font-semibold text-slate-800 text-sm leading-tight">{luogoObj.nome}</p>
                  {luogoObj.indirizzo && (
                    <p className="text-xs text-slate-400 truncate mt-0.5">{luogoObj.indirizzo}</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-400">— Seleziona luogo —</p>
              )}
            </div>
            <ChevronDown size={14} className={`text-slate-400 flex-shrink-0 transition-transform ${showPanel ? "rotate-180" : ""}`} />
          </button>

          {showPanel && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => { setShowPanel(false); setSiteSearch(""); }}
              />
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
                {/* Search */}
                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100">
                  <Search size={13} className="text-slate-400 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Cerca cantiere o indirizzo..."
                    value={siteSearch}
                    onChange={e => setSiteSearch(e.target.value)}
                    autoFocus
                    className="flex-1 text-sm focus:outline-none placeholder-slate-400 text-slate-800 bg-transparent"
                  />
                  {siteSearch && (
                    <button onClick={() => setSiteSearch("")} className="text-slate-300 hover:text-slate-500">
                      <X size={12} />
                    </button>
                  )}
                </div>
                {/* Items */}
                <div className="max-h-64 overflow-y-auto">
                  {filteredCantieri.length === 0 ? (
                    <p className="text-center py-6 text-slate-400 text-sm">Nessun risultato</p>
                  ) : filteredCantieri.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setLuogoObj(c);
                        setShowPanel(false);
                        setSiteSearch("");
                        setLuogoError("");
                      }}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition border-b border-slate-50 ${
                        luogoObj?.id === c.id ? "bg-emerald-50" : ""
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        luogoObj?.id === c.id ? "bg-emerald-100" : "bg-slate-100"
                      }`}>
                        <Building2 size={13} className={luogoObj?.id === c.id ? "text-emerald-600" : "text-slate-400"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${
                          luogoObj?.id === c.id ? "text-emerald-700" : "text-slate-800"
                        }`}>{c.nome}</p>
                        {c.indirizzo ? (
                          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                            <MapPin size={10} className="flex-shrink-0" />{c.indirizzo}
                          </p>
                        ) : null}
                      </div>
                      {luogoObj?.id === c.id && (
                        <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0 mt-1" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {luogoError && (
          <div className="flex items-center gap-2 mb-3 text-orange-600 text-xs bg-orange-50 rounded-xl px-3 py-2 border border-orange-100">
            <AlertCircle size={13} className="flex-shrink-0" /> {luogoError}
          </div>
        )}

        <p className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold mb-4">Timbra</p>
        <div className="grid grid-cols-2 gap-4">

          {/* Entrata */}
          <button
            onClick={() => handleStamp("entrata")}
            disabled={!!stamping || inServizio}
            className="group flex flex-col items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-600 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl py-9 transition-all duration-150 shadow-lg shadow-emerald-200"
          >
            {stamping === "entrata"
              ? <Loader2 size={32} className="animate-spin" />
              : <LogIn  size={32} />
            }
            <span className="text-xl font-bold tracking-wide">Entrata</span>
          </button>

          {/* Uscita */}
          <button
            onClick={() => handleStamp("uscita")}
            disabled={!!stamping || !inServizio}
            className="group flex flex-col items-center justify-center gap-3 bg-rose-500 hover:bg-rose-600 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl py-9 transition-all duration-150 shadow-lg shadow-rose-200"
          >
            {stamping === "uscita"
              ? <Loader2 size={32} className="animate-spin" />
              : <LogOut size={32} />
            }
            <span className="text-xl font-bold tracking-wide">Uscita</span>
          </button>
        </div>

        {locError && (
          <div className="flex items-center gap-2 mt-3 text-red-600 text-xs bg-red-50 rounded-xl px-3 py-2.5 border border-red-100">
            <AlertCircle size={13} className="flex-shrink-0" /> {locError}
          </div>
        )}
      </div>

      {/* GPS info card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Navigation size={14} className="text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-700">Posizione GPS</h3>
          </div>
          <button
            onClick={getLocation}
            disabled={locLoading}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-100 transition"
          >
            <RefreshCw size={12} className={locLoading ? "animate-spin" : ""} />
            Aggiorna
          </button>
        </div>

        {locLoading ? (
          <div className="flex items-center gap-3 px-5 py-8 text-slate-400">
            <Loader2 size={18} className="animate-spin text-emerald-500" />
            <span className="text-sm">Acquisizione posizione GPS...</span>
          </div>
        ) : location ? (
          <>
            {/* Static map via OpenStreetMap */}
            <a href={gmapsUrl} target="_blank" rel="noreferrer" className="block relative group cursor-pointer">
              <img
                src={`https://staticmap.openstreetmap.de/staticmap.php?center=${location.latitude},${location.longitude}&zoom=15&size=600x180&markers=${location.latitude},${location.longitude},red-pushpin`}
                alt="Mappa"
                className="w-full h-36 object-cover bg-slate-100"
                onError={(e) => { e.currentTarget.src = `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s+27ae60(${location.longitude},${location.latitude})/${location.longitude},${location.latitude},14,0/600x180?access_token=no_token`; e.currentTarget.onerror = null; }}
              />
              <div className="absolute inset-0 bg-transparent group-hover:bg-black/10 transition flex items-end justify-end p-2">
                <span className="opacity-0 group-hover:opacity-100 transition text-[11px] text-white bg-black/60 px-2 py-1 rounded-lg">
                  Apri in Google Maps
                </span>
              </div>
            </a>

            <div className="px-4 py-3 space-y-2">
              {/* Address */}
              <div className="flex items-start gap-2">
                <MapPin size={13} className="text-slate-400 flex-shrink-0 mt-0.5" />
                {addrLoading ? (
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Loader2 size={10} className="animate-spin" /> Ricerca indirizzo...
                  </p>
                ) : address ? (
                  <p className="text-xs text-slate-600 leading-relaxed">{address}</p>
                ) : (
                  <p className="text-xs text-slate-400">Indirizzo non disponibile</p>
                )}
              </div>

              {/* Coords + accuracy */}
              <div className="flex items-center gap-3 flex-wrap pt-1 border-t border-slate-50">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="font-mono text-slate-700 font-semibold">{location.latitude.toFixed(6)}</span>
                  <span className="text-slate-400">N</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="font-mono text-slate-700 font-semibold">{location.longitude.toFixed(6)}</span>
                  <span className="text-slate-400">E</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs ml-auto">
                  <div className={`w-2 h-2 rounded-full ${accuracyColor}`} />
                  <span className="text-slate-500">
                    Precisione GPS: <span className="font-semibold text-slate-700">{Math.round(location.accuracy)}m</span>
                  </span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center py-10 gap-2 text-slate-400">
            <MapPin size={28} className="text-slate-300" />
            <p className="text-sm">Posizione non disponibile</p>
            <button onClick={getLocation} className="text-xs text-emerald-600 hover:underline font-medium">Riprova</button>
          </div>
        )}
      </div>

      {/* History table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
          <Clock size={14} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-700">Ultime timbrature</h3>
          <span className="ml-auto text-xs text-slate-400">{timbrature.length} record</span>
        </div>

        {timbrature.length === 0 ? (
          <div className="text-center py-12">
            <Clock size={36} className="text-slate-200 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">Nessuna timbratura registrata</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Data</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Ora</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Tipo</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Luogo</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Posizione GPS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {timbrature.map((t) => {
                const ts = t.createdAt?.toDate?.() || new Date();
                const shortAddr = t.address
                  ? t.address.split(",").slice(0, 2).join(",").trim()
                  : null;
                return (
                  <tr key={t.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {format(ts, "dd/MM/yyyy")}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-800 text-xs">
                      {format(ts, "HH:mm:ss")}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-bold ${
                        t.tipo === "entrata"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-rose-100 text-rose-700"
                      }`}>
                        {t.tipo === "entrata" ? <LogIn size={10} /> : <LogOut size={10} />}
                        {t.tipo.charAt(0).toUpperCase() + t.tipo.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {t.luogo ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-semibold bg-slate-100 text-slate-700">
                          <Building2 size={10} />
                          {t.luogo}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs hidden sm:table-cell">
                      {shortAddr ? (
                        <span className="text-slate-400 truncate max-w-[160px] block">{shortAddr}</span>
                      ) : t.lat ? (
                        <a
                          href={`https://www.google.com/maps?q=${t.lat},${t.lng}`}
                          target="_blank" rel="noreferrer"
                          className="text-emerald-600 hover:underline font-mono"
                        >
                          {t.lat.toFixed(4)}, {t.lng.toFixed(4)}
                        </a>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
