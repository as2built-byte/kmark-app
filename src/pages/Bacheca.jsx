import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import {
  collection, addDoc, query, orderBy, onSnapshot, Timestamp, deleteDoc, doc
} from 'firebase/firestore';
import { Megaphone, Plus, X, Loader2, Pin, Trash2 } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

const COLORS = [
  { value: 'blue', bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-400', label: 'Info' },
  { value: 'green', bg: 'bg-green-50', border: 'border-green-200', dot: 'bg-green-400', label: 'Buone notizie' },
  { value: 'orange', bg: 'bg-orange-50', border: 'border-orange-200', dot: 'bg-orange-400', label: 'Importante' },
  { value: 'red', bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-400', label: 'Urgente' },
];

const getColor = (value) => COLORS.find(c => c.value === value) || COLORS[0];

export default function Bacheca() {
  const { user } = useAuth();
  const [annunci, setAnnunci] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ titolo: '', contenuto: '', colore: 'blue', pinned: false });
  const [error, setError] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'bacheca'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const pinned = docs.filter(d => d.pinned);
      const rest = docs.filter(d => !d.pinned);
      setAnnunci([...pinned, ...rest]);
    });
    return unsub;
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.titolo.trim() || !form.contenuto.trim()) {
      setError('Titolo e contenuto sono obbligatori.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await addDoc(collection(db, 'bacheca'), {
        ...form,
        autorEmail: user.email,
        autorUid: user.uid,
        createdAt: Timestamp.now(),
      });
      setForm({ titolo: '', contenuto: '', colore: 'blue', pinned: false });
      setShowForm(false);
    } catch (err) {
      setError('Errore: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Eliminare questo annuncio?')) return;
    await deleteDoc(doc(db, 'bacheca', id));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Bacheca</h1>
          <p className="text-slate-500 text-sm mt-0.5">Comunicazioni aziendali</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-[#27ae60] hover:bg-[#219a52] text-white px-4 py-2 rounded-xl text-sm font-medium shadow transition"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Annulla' : 'Pubblica'}
        </button>
      </div>

      {/* Post form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="font-semibold text-slate-700 text-sm">Nuovo annuncio</h2>
          </div>
          <form onSubmit={handleSubmit} className="p-4 space-y-3">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{error}</div>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Titolo *</label>
              <input
                type="text"
                value={form.titolo}
                onChange={e => setForm({ ...form, titolo: e.target.value })}
                placeholder="Oggetto dell'annuncio"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#c0392b] focus:ring-1 focus:ring-[#c0392b]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Contenuto *</label>
              <textarea
                value={form.contenuto}
                onChange={e => setForm({ ...form, contenuto: e.target.value })}
                rows={4}
                placeholder="Testo dell'annuncio..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-[#c0392b] focus:ring-1 focus:ring-[#c0392b]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-2">Categoria</label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setForm({ ...form, colore: c.value })}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                      form.colore === c.value
                        ? `${c.bg} ${c.border} text-slate-700 shadow-sm`
                        : 'border-slate-200 text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${c.dot}`} />
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={form.pinned}
                onChange={e => setForm({ ...form, pinned: e.target.checked })}
                className="w-4 h-4 rounded accent-[#c0392b]"
              />
              <Pin size={14} />
              Fissa in cima alla bacheca
            </label>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#27ae60] hover:bg-[#219a52] disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition"
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              {loading ? 'Pubblicazione...' : 'Pubblica Annuncio'}
            </button>
          </form>
        </div>
      )}

      {/* Announcements */}
      {annunci.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <Megaphone size={48} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400">Nessun annuncio pubblicato</p>
          <p className="text-xs text-slate-300 mt-1">Clicca "Pubblica" per aggiungere il primo</p>
        </div>
      ) : (
        <div className="space-y-3">
          {annunci.map((a) => {
            const color = getColor(a.colore);
            return (
              <div key={a.id} className={`rounded-2xl border p-4 shadow-sm ${color.bg} ${color.border}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {a.pinned && <Pin size={13} className="text-slate-400 flex-shrink-0" />}
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-0.5 ${color.dot}`} />
                    <h3 className="font-semibold text-slate-800 text-sm leading-tight truncate">{a.titolo}</h3>
                  </div>
                  {a.autorUid === user?.uid && (
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="p-1 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition flex-shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap leading-relaxed">{a.contenuto}</p>
                <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
                  <div className="w-5 h-5 rounded-full bg-white border border-slate-200 flex items-center justify-center font-bold text-[10px] text-slate-500">
                    {a.autorEmail?.[0]?.toUpperCase()}
                  </div>
                  <span>{a.autorEmail}</span>
                  <span>·</span>
                  <span>
                    {a.createdAt
                      ? formatDistanceToNow(a.createdAt.toDate(), { addSuffix: true, locale: it })
                      : ''}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
