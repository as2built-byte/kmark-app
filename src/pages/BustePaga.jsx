import { useState, useEffect, useRef } from 'react';
import { db, storage } from '../firebase';
import { useAuth } from '../context/AuthContext';

import {
  collection, addDoc, query, where, onSnapshot,
  Timestamp, deleteDoc, doc, orderBy
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import {
  ChevronLeft, ChevronRight, Upload, X, Check,
  Loader2, Trash2, ExternalLink, Search, CheckSquare, Square
} from 'lucide-react';
import { format } from 'date-fns';

const MESI = [
  { label: 'Gennaio',   short: 'Gen' },
  { label: 'Febbraio',  short: 'Feb' },
  { label: 'Marzo',     short: 'Mar' },
  { label: 'Aprile',    short: 'Apr' },
  { label: 'Maggio',    short: 'Mag' },
  { label: 'Giugno',    short: 'Giu' },
  { label: 'Luglio',    short: 'Lug' },
  { label: 'Agosto',    short: 'Ago' },
  { label: 'Settembre', short: 'Set' },
  { label: 'Ottobre',   short: 'Ott' },
  { label: 'Novembre',  short: 'Nov' },
  { label: 'Dicembre',  short: 'Dic' },
  { label: '13esima',   short: '13ª' },
  { label: '14esima',   short: '14ª' },
];

const eur = (n) => `€ ${Number(n || 0).toLocaleString('it-IT', { maximumFractionDigits: 0 })}`;

export default function BustePaga() {
  const { user, userRole } = useAuth();
  const isAdmin = userRole === 'admin';
  const [bustePaga, setBustePaga]   = useState([]);
  const [dipendenti, setDipendenti] = useState([]);
  const [anno, setAnno]             = useState(new Date().getFullYear());
  const [meseAttivo, setMeseAttivo] = useState(new Date().getMonth());
  const [tuttAnno, setTuttAnno]     = useState(false);
  const [filtroEmail, setFiltroEmail] = useState('');
  const [cerca, setCerca]           = useState('');
  const [selected, setSelected]     = useState(new Set());
  const [showModal, setShowModal]   = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [progress, setProgress]     = useState(0);
  const [error, setError]           = useState('');
  const fileRef = useRef();

  const [form, setForm] = useState({
    emailDipendente: '', nomeDipendente: '',
    mese: new Date().getMonth(), anno: new Date().getFullYear(),
    netto: '', descrizione: '', dataEmissione: format(new Date(), 'yyyy-MM-dd'),
  });

  useEffect(() => {
    return onSnapshot(
      query(collection(db, 'dipendenti'), orderBy('displayName')),
      snap => setDipendenti(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'bustePaga'), where('anno', '==', anno), orderBy('mese'));
    return onSnapshot(q, snap => setBustePaga(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [anno]);

  const statsMese = (idx) => {
    const b = bustePaga.filter(x => x.mese === idx);
    return { count: b.length, total: b.reduce((s, x) => s + (x.netto || 0), 0) };
  };

  const visibili = bustePaga.filter(b => {
    const meseOk  = tuttAnno || b.mese === meseAttivo;
    const emailOk = !filtroEmail || b.emailDipendente === filtroEmail;
    const cercaOk = !cerca || b.nomeDipendente?.toLowerCase().includes(cerca.toLowerCase());
    return meseOk && emailOk && cercaOk;
  });

  const totaleVisibili = visibili.reduce((s, b) => s + (b.netto || 0), 0);

  const toggleAll = () => {
    if (selected.size === visibili.length) setSelected(new Set());
    else setSelected(new Set(visibili.map(b => b.id)));
  };
  const toggleOne = (id) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    const file = fileRef.current?.files[0];
    if (!file)                  { setError('Seleziona un file PDF.'); return; }
    if (!form.emailDipendente)  { setError('Seleziona un dipendente.'); return; }
    if (!form.netto)            { setError('Inserisci il netto.'); return; }
    setError(''); setUploading(true); setProgress(0);
    const path = `bustePaga/${form.emailDipendente}/${anno}_${String(form.mese+1).padStart(2,'0')}_${Date.now()}.pdf`;
    const task = uploadBytesResumable(ref(storage, path), file);
    task.on('state_changed',
      s  => setProgress(Math.round(s.bytesTransferred / s.totalBytes * 100)),
      err => { setError(err.message); setUploading(false); },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        await addDoc(collection(db, 'bustePaga'), {
          emailDipendente: form.emailDipendente,
          nomeDipendente:  form.nomeDipendente,
          mese:  Number(form.mese),
          anno:  Number(form.anno),
          netto: parseFloat(form.netto),
          descrizione:   form.descrizione || `Busta paga ${MESI[form.mese].label} ${form.anno}`,
          dataEmissione: form.dataEmissione,
          url, storagePath: path,
          uploadedBy: user.uid,
          createdAt: Timestamp.now(),
        });
        setUploading(false); setShowModal(false); setProgress(0);
        if (fileRef.current) fileRef.current.value = '';
      }
    );
  };

  const handleDelete = async (bp) => {
    if (!confirm(`Eliminare la busta di ${bp.nomeDipendente}?`)) return;
    try { await deleteObject(ref(storage, bp.storagePath)); } catch {}
    await deleteDoc(doc(db, 'bustePaga', bp.id));
    setSelected(s => { const n = new Set(s); n.delete(bp.id); return n; });
  };

  return (
    <div className="space-y-0">

      {/*  Top bar  */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-2 text-slate-700">
          <h1 className="text-xl font-bold">Buste paga</h1>
          <ChevronRight size={16} className="text-slate-400" />
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1 shadow-sm">
            <button onClick={() => setAnno(a => a - 1)} className="p-0.5 rounded hover:bg-slate-100">
              <ChevronLeft size={15} className="text-slate-500" />
            </button>
            <span className="font-bold text-slate-800 w-11 text-center text-sm">{anno}</span>
            <button onClick={() => setAnno(a => a + 1)} className="p-0.5 rounded hover:bg-slate-100">
              <ChevronRight size={15} className="text-slate-500" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { setTuttAnno(t => !t); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
              tuttAnno
                ? 'bg-slate-700 text-white border-slate-700'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tuttAnno ? ' ' : ''}Seleziona tutto l'anno
          </button>
          {isAdmin && (
            <button
              onClick={() => { setShowModal(true); setForm(f => ({ ...f, anno, mese: meseAttivo })); }}
              className="flex items-center gap-2 bg-[#27ae60] hover:bg-[#219a52] text-white px-4 py-1.5 rounded-lg text-sm font-semibold shadow-sm transition"
            >
              <Upload size={14} />
              + Carica buste paga
            </button>
          )}
        </div>
      </div>

      {/*  Monthly nav  */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <div className="flex min-w-max">
            {MESI.map(({ label, short }, idx) => {
              const stats    = statsMese(idx);
              const isActive = !tuttAnno && meseAttivo === idx;
              const hasData  = stats.count > 0;
              return (
                <button
                  key={label}
                  onClick={() => { setMeseAttivo(idx); setTuttAnno(false); }}
                  className={`flex flex-col items-center px-4 py-3 text-xs border-b-2 transition min-w-[72px]
                    ${isActive
                      ? 'border-[#27ae60] bg-[#27ae60]/5'
                      : 'border-transparent hover:bg-slate-50'}
                  `}
                >
                  <span className={`font-semibold text-xs mb-1.5 ${isActive ? 'text-[#27ae60]' : 'text-slate-500'}`}>
                    {short}
                  </span>
                  <span className={`text-xs ${hasData ? 'text-[#27ae60] font-medium' : 'text-slate-300'}`}>
                    {stats.count} buste
                  </span>
                  <span className={`text-xs font-bold mt-0.5 ${hasData ? 'text-[#27ae60]' : 'text-slate-300'}`}>
                    {eur(stats.total)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active month summary banner */}
        {!tuttAnno && statsMese(meseAttivo).count > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5 border-t border-slate-100 bg-[#27ae60]/5">
            <span className="text-sm font-bold text-[#27ae60]">
              {statsMese(meseAttivo).count} buste
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-sm font-bold text-[#27ae60]">
              {eur(statsMese(meseAttivo).total)}
            </span>
            <span className="text-xs text-slate-400 ml-1">
               {MESI[meseAttivo].label} {anno}
            </span>
          </div>
        )}
        {tuttAnno && (
          <div className="flex items-center gap-3 px-4 py-2.5 border-t border-slate-100 bg-slate-50">
            <span className="text-sm font-bold text-[#27ae60]">
              {bustePaga.length} buste totali
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-sm font-bold text-[#27ae60]">
              {eur(bustePaga.reduce((s, b) => s + (b.netto || 0), 0))}
            </span>
            <span className="text-xs text-slate-400 ml-1"> Anno {anno}</span>
          </div>
        )}
      </div>

      {/*  Filters  */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <select
          value={filtroEmail}
          onChange={e => setFiltroEmail(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#27ae60] shadow-sm min-w-[180px]"
        >
          <option value="">Seleziona dipendente</option>
          {dipendenti.map(d => <option key={d.id} value={d.email}>{d.displayName}</option>)}
        </select>

        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={cerca}
            onChange={e => setCerca(e.target.value)}
            placeholder="Cerca dipendente..."
            className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#27ae60] bg-white shadow-sm"
          />
        </div>

        {visibili.length > 0 && (
          <span className="text-xs text-slate-400 ml-auto">
            {visibili.length} risultati  <span className="font-semibold text-[#27ae60]">{eur(totaleVisibili)}</span>
          </span>
        )}
      </div>

      {/*  Table  */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-4 py-3 w-8">
                <button onClick={toggleAll} className="text-slate-400 hover:text-slate-600">
                  {selected.size > 0 && selected.size === visibili.length
                    ? <CheckSquare size={16} className="text-[#27ae60]" />
                    : <Square size={16} />}
                </button>
              </th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Dipendente
              </th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Mese di competenza 
              </th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Netto
              </th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Descrizione
              </th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Data di emissione
              </th>
              <th className="px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">
                Azioni
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibili.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-14">
                  <p className="text-slate-400 text-sm">
                    Nessuna busta paga per {tuttAnno ? anno : `${MESI[meseAttivo].label} ${anno}`}
                  </p>
                </td>
              </tr>
            ) : visibili.map(bp => (
              <tr key={bp.id} className={`hover:bg-slate-50 transition ${selected.has(bp.id) ? 'bg-green-50/50' : ''}`}>
                <td className="px-4 py-3">
                  <button onClick={() => toggleOne(bp.id)} className="text-slate-400 hover:text-[#27ae60]">
                    {selected.has(bp.id)
                      ? <CheckSquare size={16} className="text-[#27ae60]" />
                      : <Square size={16} />}
                  </button>
                </td>
                <td className="px-3 py-3 font-medium text-slate-800">{bp.nomeDipendente}</td>
                <td className="px-3 py-3 text-slate-600">{MESI[bp.mese]?.label} {bp.anno}</td>
                <td className="px-3 py-3 font-bold text-slate-800">{eur(bp.netto)}</td>
                <td className="px-3 py-3 text-slate-500">{bp.descrizione}</td>
                <td className="px-3 py-3 text-slate-500">{bp.dataEmissione}</td>
                <td className="px-3 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <a
                      href={bp.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-xs text-[#27ae60] hover:underline font-semibold"
                    >
                      <ExternalLink size={12} /> Vedi dettaglio
                    </a>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(bp)}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/*  Upload Modal  */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Carica busta paga</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-slate-100">
                <X size={18} className="text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="p-5 space-y-3">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{error}</div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Dipendente *</label>
                <select
                  required value={form.emailDipendente}
                  onChange={e => {
                    const d = dipendenti.find(d => d.email === e.target.value);
                    setForm({ ...form, emailDipendente: e.target.value, nomeDipendente: d?.displayName || '' });
                  }}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#27ae60]"
                >
                  <option value="">Seleziona dipendente...</option>
                  {dipendenti.map(d => <option key={d.id} value={d.email}>{d.displayName}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Mese</label>
                  <select
                    value={form.mese}
                    onChange={e => setForm({ ...form, mese: Number(e.target.value) })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#27ae60]"
                  >
                    {MESI.map((m, i) => <option key={i} value={i}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Anno</label>
                  <input
                    type="number" value={form.anno}
                    onChange={e => setForm({ ...form, anno: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#27ae60]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Netto (€) *</label>
                  <input
                    type="number" step="0.01" required value={form.netto}
                    onChange={e => setForm({ ...form, netto: e.target.value })}
                    placeholder="0.00"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#27ae60]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Data emissione</label>
                  <input
                    type="date" value={form.dataEmissione}
                    onChange={e => setForm({ ...form, dataEmissione: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#27ae60]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Descrizione</label>
                <input
                  type="text" value={form.descrizione}
                  onChange={e => setForm({ ...form, descrizione: e.target.value })}
                  placeholder="Busta paga ordinaria"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#27ae60]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">File PDF *</label>
                <input
                  ref={fileRef} type="file" accept="application/pdf" required
                  className="w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer border border-slate-200 rounded-lg p-1.5"
                />
              </div>

              {uploading && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Caricamento...</span><span>{progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-[#27ae60] h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              <button
                type="submit" disabled={uploading}
                className="w-full bg-[#27ae60] hover:bg-[#219a52] disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition"
              >
                {uploading ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                {uploading ? `Caricamento ${progress}%...` : 'Carica busta paga'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
