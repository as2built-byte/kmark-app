import { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import {
  collection, addDoc, onSnapshot, deleteDoc,
  doc, updateDoc, orderBy, query, writeBatch
} from 'firebase/firestore';
import { Building2, Plus, X, Edit2, Check, Trash2, Loader2, MapPin, Download, Search } from 'lucide-react';

const PREDEFINED = [
  { nome: 'Ufficio / Sede',               indirizzo: '' },
  { nome: 'ALTOPASCIO',                   indirizzo: '' },
  { nome: 'AMA',                          indirizzo: '' },
  { nome: 'AMA - Calderon de la Barca',   indirizzo: 'Via Calderon de la Barca, Roma' },
  { nome: 'AMA - Campo Boario',           indirizzo: 'Via Campo Boario, Roma' },
  { nome: 'AMA - Isola Ecologica Acilia', indirizzo: 'Via Acilia, Roma' },
  { nome: 'AMA - Maccarese',              indirizzo: 'Maccarese, Fiumicino' },
  { nome: 'AMA - Maresciallo Giardino',   indirizzo: 'Via Maresciallo Giardino, Roma' },
  { nome: 'AMA - Ostia Isola Ecologica',  indirizzo: 'Via Ostia, Roma' },
  { nome: 'AMA - PIAZZALE DEL VERANO',    indirizzo: 'Piazzale del Verano, Roma' },
  { nome: 'AMA - Rocca Cencia',           indirizzo: 'Via Rocca Cencia, Roma' },
  { nome: 'AMA - Saxa Rubra',             indirizzo: 'Via Saxa Rubra, Roma' },
  { nome: 'AMA - Settebagni',             indirizzo: 'Via Settebagni, Roma' },
  { nome: 'AMA - Trigoria',               indirizzo: 'Via Trigoria, Roma' },
  { nome: 'AMA - Via Laurentina',         indirizzo: 'Via Laurentina, Roma' },
  { nome: 'Cantiere Roma Nord',           indirizzo: '' },
  { nome: 'Cantiere Roma Sud',            indirizzo: '' },
  { nome: 'Cantiere Roma Est',            indirizzo: '' },
  { nome: 'Cantiere Roma Ovest',          indirizzo: '' },
  { nome: 'Trasferta',                    indirizzo: '' },
  { nome: 'Smart Working',               indirizzo: '' },
];

export default function AdminCantieri() {
  const [cantieri, setCantieri] = useState([]);
  const [showForm, setShowForm]   = useState(false);
  const [editId, setEditId]       = useState(null);
  const [form, setForm]           = useState({ nome: '', indirizzo: '' });
  const [loading, setLoading]         = useState(false);
  const [seeding, setSeeding]         = useState(false);
  const [error, setError]             = useState('');
  const [addrSuggestions, setAddrSuggestions] = useState([]);
  const [addrLoading, setAddrLoading] = useState(false);
  const [showAddrPanel, setShowAddrPanel] = useState(false);
  const addrDebounce = useRef(null);
  const addrRef = useRef(null);

  useEffect(() => {
    return onSnapshot(
      query(collection(db, 'cantieri'), orderBy('nome')),
      snap => setCantieri(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, []);

  const resetForm = () => {
    setForm({ nome: '', indirizzo: '' });
    setEditId(null);
    setError('');
    setAddrSuggestions([]);
    setShowAddrPanel(false);
  };

  const handleAddrChange = (val) => {
    setForm(f => ({ ...f, indirizzo: val }));
    setShowAddrPanel(true);
    clearTimeout(addrDebounce.current);
    if (val.trim().length < 3) { setAddrSuggestions([]); setAddrLoading(false); return; }
    setAddrLoading(true);
    addrDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&countrycodes=it&limit=6&addressdetails=1`,
          { headers: { 'Accept-Language': 'it' } }
        );
        const data = await res.json();
        setAddrSuggestions(data.map(d => d.display_name));
      } catch { setAddrSuggestions([]); }
      finally { setAddrLoading(false); }
    }, 350);
  };

  const pickAddr = (addr) => {
    setForm(f => ({ ...f, indirizzo: addr }));
    setAddrSuggestions([]);
    setShowAddrPanel(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) { setError('Nome obbligatorio'); return; }
    setLoading(true); setError('');
    try {
      if (editId) {
        await updateDoc(doc(db, 'cantieri', editId), {
          nome: form.nome.trim(), indirizzo: form.indirizzo.trim(),
        });
      } else {
        await addDoc(collection(db, 'cantieri'), {
          nome: form.nome.trim(), indirizzo: form.indirizzo.trim(), attivo: true,
        });
      }
      resetForm(); setShowForm(false);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleEdit = (c) => {
    setForm({ nome: c.nome, indirizzo: c.indirizzo || '' });
    setEditId(c.id); setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminare questo luogo?')) return;
    await deleteDoc(doc(db, 'cantieri', id));
  };

  const handleSeedPredefined = async () => {
    if (!window.confirm(`Importare ${PREDEFINED.length} luoghi predefiniti? (quelli già esistenti verranno ignorati)`)) return;
    setSeeding(true);
    const existingNomi = new Set(cantieri.map(c => c.nome));
    const toAdd = PREDEFINED.filter(p => !existingNomi.has(p.nome));
    try {
      const batch = writeBatch(db);
      toAdd.forEach(p => {
        const ref = doc(collection(db, 'cantieri'));
        batch.set(ref, { nome: p.nome, indirizzo: p.indirizzo, attivo: true });
      });
      await batch.commit();
    } catch (e) { alert('Errore: ' + e.message); }
    finally { setSeeding(false); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Cantieri &amp; Uffici</h1>
          <p className="text-slate-500 text-sm mt-0.5">Gestisci i luoghi di lavoro per la timbratura</p>
        </div>
        <div className="flex items-center gap-2">
          {cantieri.length === 0 && (
            <button
              onClick={handleSeedPredefined}
              disabled={seeding}
              className="flex items-center gap-2 border border-slate-300 hover:border-slate-400 text-slate-600 px-3 py-2 rounded-xl text-sm font-medium transition"
            >
              {seeding ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Importa predefiniti
            </button>
          )}
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 bg-[#c0392b] hover:bg-[#a93226] text-white px-4 py-2 rounded-xl text-sm font-semibold transition"
          >
            <Plus size={15} /> Aggiungi
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-700 text-sm">
              {editId ? 'Modifica luogo' : 'Nuovo luogo'}
            </h3>
            <button type="button" onClick={() => { resetForm(); setShowForm(false); }}>
              <X size={16} className="text-slate-400 hover:text-slate-700" />
            </button>
          </div>
          {error && (
            <div className="text-red-600 text-xs bg-red-50 border border-red-100 px-3 py-2 rounded-lg">{error}</div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Nome *</label>
            <input
              type="text" required
              value={form.nome}
              onChange={e => setForm({ ...form, nome: e.target.value })}
              placeholder="es. AMA - Settebagni"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#c0392b] focus:ring-1 focus:ring-[#c0392b]"
            />
          </div>
          <div className="relative">
            <label className="block text-xs font-medium text-slate-500 mb-1">Indirizzo</label>
            <div className="relative">
              <input
                ref={addrRef}
                type="text"
                value={form.indirizzo}
                onChange={e => handleAddrChange(e.target.value)}
                onFocus={() => addrSuggestions.length > 0 && setShowAddrPanel(true)}
                placeholder="es. Via Settebagni 400, Roma"
                autoComplete="off"
                className="w-full border border-slate-200 rounded-lg px-3 pr-8 py-2 text-sm focus:outline-none focus:border-[#c0392b] focus:ring-1 focus:ring-[#c0392b]"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                {addrLoading
                  ? <Loader2 size={13} className="text-slate-400 animate-spin" />
                  : <Search size={13} className="text-slate-300" />}
              </div>
            </div>

            {showAddrPanel && addrSuggestions.length > 0 && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowAddrPanel(false)} />
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden max-h-52 overflow-y-auto">
                  {addrSuggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => pickAddr(s)}
                      className="w-full flex items-start gap-2 px-3 py-2.5 text-left hover:bg-slate-50 transition border-b border-slate-50 last:border-0"
                    >
                      <MapPin size={12} className="text-[#c0392b] flex-shrink-0 mt-0.5" />
                      <span className="text-xs text-slate-700 leading-snug">{s}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full bg-[#c0392b] hover:bg-[#a93226] disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {editId ? 'Salva modifiche' : 'Aggiungi luogo'}
          </button>
        </form>
      )}

      {/* List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Building2 size={15} className="text-slate-400" />
            <span className="font-semibold text-slate-700 text-sm">Lista luoghi</span>
          </div>
          <span className="text-xs text-slate-400">{cantieri.length} luoghi</span>
        </div>

        {cantieri.length === 0 ? (
          <div className="text-center py-14">
            <Building2 size={40} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm mb-3">Nessun luogo configurato</p>
            <button
              onClick={handleSeedPredefined}
              disabled={seeding}
              className="inline-flex items-center gap-2 text-sm text-[#c0392b] hover:underline font-medium"
            >
              {seeding ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              Importa lista predefinita
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {cantieri.map(c => (
              <div
                key={c.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition group"
              >
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Building2 size={15} className="text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{c.nome}</p>
                  {c.indirizzo ? (
                    <p className="text-xs text-slate-400 truncate flex items-center gap-1 mt-0.5">
                      <MapPin size={10} /> {c.indirizzo}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-300 italic mt-0.5">Indirizzo non specificato</p>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={() => handleEdit(c)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                    title="Modifica"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                    title="Elimina"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {cantieri.length > 0 && (
        <button
          onClick={handleSeedPredefined}
          disabled={seeding}
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-600 transition mx-auto"
        >
          {seeding ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
          Importa mancanti dalla lista predefinita
        </button>
      )}
    </div>
  );
}
