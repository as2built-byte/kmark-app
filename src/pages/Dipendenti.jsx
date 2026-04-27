import { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection, addDoc, onSnapshot, orderBy, query,
  doc, updateDoc, Timestamp
} from 'firebase/firestore';
import {
  Users, Search, Plus, X, Pencil, Check, UserCircle2
} from 'lucide-react';

const REPARTI = ['Amministrazione', 'Commerciale', 'Tecnico', 'Direzione', 'Contabilità', 'Risorse Umane', 'IT', 'Altro'];

const initials = (name = '') => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
const COLORS = ['bg-blue-500','bg-violet-500','bg-rose-500','bg-amber-500','bg-emerald-500','bg-cyan-500','bg-pink-500','bg-orange-500'];
const avatarColor = (email = '') => COLORS[email.charCodeAt(0) % COLORS.length];

export default function Dipendenti() {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ displayName: '', email: '', reparto: 'Amministrazione', matricola: '', dataAssunzione: '' });

  useEffect(() => {
    const q = query(collection(db, 'dipendenti'), orderBy('matricola', 'asc'));
    return onSnapshot(q, snap => setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  const filtered = employees.filter(e =>
    e.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    e.email?.toLowerCase().includes(search.toLowerCase()) ||
    e.reparto?.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditing(null);
    setForm({ displayName: '', email: '', reparto: 'Amministrazione', matricola: String(employees.length + 1), dataAssunzione: '' });
    setShowModal(true);
  };

  const openEdit = (emp) => {
    setEditing(emp);
    setForm({ displayName: emp.displayName, email: emp.email, reparto: emp.reparto, matricola: emp.matricola, dataAssunzione: emp.dataAssunzione || '' });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editing) {
        await updateDoc(doc(db, 'dipendenti', editing.id), { ...form, updatedAt: Timestamp.now() });
      } else {
        await addDoc(collection(db, 'dipendenti'), { ...form, attivo: true, createdAt: Timestamp.now() });
      }
      setShowModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dipendenti</h1>
          <p className="text-slate-500 text-sm mt-0.5">{employees.length} dipendenti registrati</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-[#27ae60] hover:bg-[#219a52] text-white px-4 py-2 rounded-xl text-sm font-medium shadow transition">
          <Plus size={16} />
          Aggiungi dipendente
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cerca per nome, email, reparto..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#c0392b] focus:ring-1 focus:ring-[#c0392b] shadow-sm"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Dipendente</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Matricola</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Reparto</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Stato</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-14">
                    <UserCircle2 size={40} className="text-slate-200 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">
                      {search ? 'Nessun risultato trovato' : 'Nessun dipendente. Clicca "Aggiungi dipendente" per iniziare.'}
                    </p>
                  </td>
                </tr>
              ) : filtered.map(emp => (
                <tr key={emp.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full ${avatarColor(emp.email)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                        {initials(emp.displayName)}
                      </div>
                      <span className="font-medium text-slate-800">{emp.displayName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{emp.email}</td>
                  <td className="px-4 py-3">
                    <span className="bg-slate-100 text-slate-600 text-xs font-mono px-2 py-1 rounded-lg">#{emp.matricola}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{emp.reparto}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${emp.attivo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {emp.attivo ? 'Attivo' : 'Inattivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(emp)} className="p-1.5 rounded-lg text-slate-400 hover:text-[#c0392b] hover:bg-red-50 transition">
                      <Pencil size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">{editing ? 'Modifica dipendente' : 'Aggiungi dipendente'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-slate-100">
                <X size={18} className="text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Nome completo *</label>
                <input type="text" required value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#c0392b]" placeholder="Nome Cognome" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Email *</label>
                <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#c0392b]" placeholder="nome@kmark.it" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Matricola</label>
                  <input type="text" value={form.matricola} onChange={e => setForm({ ...form, matricola: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#c0392b]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Data assunzione</label>
                  <input type="date" value={form.dataAssunzione} onChange={e => setForm({ ...form, dataAssunzione: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#c0392b]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Reparto</label>
                <select value={form.reparto} onChange={e => setForm({ ...form, reparto: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#c0392b]">
                  {REPARTI.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-[#27ae60] hover:bg-[#219a52] text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 mt-2 transition">
                <Check size={15} />
                {editing ? 'Salva modifiche' : 'Aggiungi'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
