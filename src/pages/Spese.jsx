import { useState, useEffect, useRef } from 'react';
import { db, storage } from '../firebase';
import { useAuth } from '../context/AuthContext';
import {
  collection, addDoc, query, where, orderBy, onSnapshot, Timestamp, deleteDoc, doc
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Receipt, Plus, X, Loader2, Camera, CheckCircle2, Trash2, Download } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const MESI_LABEL = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

const CATEGORIES = ['Trasporto', 'Alloggio', 'Pasti', 'Carburante', 'Materiali', 'Altro'];
const STATUS_STYLES = {
  inviata:   { cls: 'bg-yellow-100 text-yellow-700', label: '⏳ In attesa' },
  approvata: { cls: 'bg-green-100 text-green-700',  label: '✓ Approvata'  },
  rifiutata: { cls: 'bg-red-100 text-red-700',      label: '✕ Rifiutata'  },
};

export default function Spese() {
  const { user } = useAuth();
  const [spese, setSpese] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const fileRef = useRef();

  const [form, setForm] = useState({
    descrizione: '',
    importo: '',
    categoria: 'Trasporto',
    data: format(new Date(), 'yyyy-MM-dd'),
    note: '',
  });

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'spese'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setSpese(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user]);

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.descrizione || !form.importo) {
      setError('Descrizione e importo sono obbligatori.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      let photoUrl = null;
      if (photoFile) {
        const storageRef = ref(storage, `spese/${user.uid}/${Date.now()}_${photoFile.name}`);
        const task = uploadBytesResumable(storageRef, photoFile);
        await new Promise((resolve, reject) => {
          task.on('state_changed', null, reject, resolve);
        });
        photoUrl = await getDownloadURL(task.snapshot.ref);
      }
      await addDoc(collection(db, 'spese'), {
        ...form,
        importo: parseFloat(form.importo),
        userId: user.uid,
        email: user.email,
        photoUrl,
        stato: 'inviata',
        createdAt: Timestamp.now(),
      });
      setSuccess(true);
      setShowForm(false);
      setForm({ descrizione: '', importo: '', categoria: 'Trasporto', data: format(new Date(), 'yyyy-MM-dd'), note: '' });
      setPhotoFile(null);
      setPhotoPreview(null);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      setError('Errore durante l\'invio: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Eliminare questa nota spese?')) return;
    await deleteDoc(doc(db, 'spese', id));
  };

  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(now.getMonth());
  const [filterYear,  setFilterYear]  = useState(now.getFullYear());

  const speseMese = spese.filter(s => {
    if (!s.data) return false;
    const d = new Date(s.data);
    return d.getMonth() === filterMonth && d.getFullYear() === filterYear;
  });

  const totaleMese    = speseMese.reduce((a, s) => a + (s.importo || 0), 0);
  const totaleApprova = speseMese.filter(s => s.stato === 'approvata').reduce((a, s) => a + (s.importo || 0), 0);
  const totalePending = spese.filter(s => s.stato === 'inviata').reduce((a, s) => a + (s.importo || 0), 0);

  const exportCSV = () => {
    const rows = [['Data','Descrizione','Categoria','Importo','Stato'],
      ...speseMese.map(s => [s.data, s.descrizione, s.categoria, s.importo, s.stato])];
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `spese_${filterYear}_${String(filterMonth+1).padStart(2,'0')}.csv`; a.click();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Spese e Rimborsi</h1>
          <p className="text-slate-500 text-sm mt-0.5">Gestisci le note spese</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-[#27ae60] hover:bg-[#219a52] text-white px-4 py-2 rounded-xl text-sm font-medium shadow transition"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Annulla' : '+ Nuova'}
        </button>
      </div>

      {/* Month selector + Totale (DipendentyCloud style) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs text-slate-400 mb-1">Totale {MESI_LABEL[filterMonth]} {filterYear}</p>
            <p className="text-4xl font-bold text-[#c0392b]">€ {totaleMese.toLocaleString('it-IT', { minimumFractionDigits: 0 })}</p>
            <div className="flex gap-4 mt-2">
              <div className="text-xs text-slate-500">Approvate <span className="font-bold text-green-600">€ {totaleApprova.toFixed(0)}</span></div>
              <div className="text-xs text-slate-500">In attesa <span className="font-bold text-blue-600">€ {totalePending.toFixed(0)}</span></div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#c0392b] bg-white">
              {MESI_LABEL.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#c0392b] bg-white">
              {[now.getFullYear()-1, now.getFullYear(), now.getFullYear()+1].map(y => <option key={y}>{y}</option>)}
            </select>
            <button onClick={exportCSV}
              className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 transition">
              <Download size={14} /> Esporta
            </button>
          </div>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">
          <CheckCircle2 size={16} />
          Nota spese inviata con successo!
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="font-semibold text-slate-700 text-sm">Nuova nota spese</h2>
          </div>
          <form onSubmit={handleSubmit} className="p-4 space-y-3">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{error}</div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Descrizione *</label>
                <input
                  type="text"
                  value={form.descrizione}
                  onChange={e => setForm({ ...form, descrizione: e.target.value })}
                  placeholder="es. Trasferta Milano"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#c0392b] focus:ring-1 focus:ring-[#c0392b]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Importo (€) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.importo}
                  onChange={e => setForm({ ...form, importo: e.target.value })}
                  placeholder="0.00"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#c0392b] focus:ring-1 focus:ring-[#c0392b]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Data</label>
                <input
                  type="date"
                  value={form.data}
                  onChange={e => setForm({ ...form, data: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#c0392b] focus:ring-1 focus:ring-[#c0392b]"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Categoria</label>
                <select
                  value={form.categoria}
                  onChange={e => setForm({ ...form, categoria: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#c0392b] focus:ring-1 focus:ring-[#c0392b]"
                >
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Note aggiuntive</label>
                <textarea
                  value={form.note}
                  onChange={e => setForm({ ...form, note: e.target.value })}
                  rows={2}
                  placeholder="Dettagli aggiuntivi..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-[#c0392b] focus:ring-1 focus:ring-[#c0392b]"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Ricevuta / Scontrino</label>
                <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={handlePhoto} className="hidden" />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 border border-dashed border-slate-300 hover:border-[#c0392b] rounded-lg px-4 py-2 text-sm text-slate-500 hover:text-[#c0392b] transition"
                >
                  <Camera size={15} />
                  {photoFile ? photoFile.name : 'Allega foto o PDF'}
                </button>
                {photoPreview && (
                  <img src={photoPreview} alt="preview" className="mt-2 h-24 rounded-lg object-cover border border-slate-200" />
                )}
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#27ae60] hover:bg-[#219a52] disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition"
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              {loading ? 'Invio...' : 'Invia Nota Spese'}
            </button>
          </form>
        </div>
      )}

      {/* Expense list table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt size={16} className="text-slate-400" />
            <h2 className="font-semibold text-slate-700 text-sm">
              Note spese — {MESI_LABEL[filterMonth]} {filterYear}
            </h2>
          </div>
          <span className="text-xs text-slate-400">{speseMese.length} voci</span>
        </div>
        {speseMese.length === 0 ? (
          <div className="text-center py-12">
            <Receipt size={40} className="text-slate-200 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">Nessuna spesa per questo mese</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Descrizione</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Data</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Categoria</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Stato</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Costo</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {speseMese.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3 font-medium text-slate-800">{s.descrizione}</td>
                  <td className="px-4 py-3 text-slate-500">{s.data}</td>
                  <td className="px-4 py-3 text-slate-500">{s.categoria}</td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${(STATUS_STYLES[s.stato] || STATUS_STYLES.inviata).cls}`}>
                        {(STATUS_STYLES[s.stato] || STATUS_STYLES.inviata).label}
                      </span>
                      {s.stato === 'rifiutata' && s.notaAdmin && (
                        <p className="text-[11px] text-red-500 italic pl-1">{s.notaAdmin}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800">€ {(s.importo || 0).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    {s.stato === 'inviata' && (
                      <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
