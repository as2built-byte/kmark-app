import { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection, query, onSnapshot, orderBy, updateDoc, doc,
} from 'firebase/firestore';
import { Check, X, Clock, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

const TIPI = {
  ferie:        { label: 'Ferie',                   color: '#10b981' },
  malattia:     { label: 'Malattia',                color: '#f43f5e' },
  permesso:     { label: 'Permessi',                color: '#f59e0b' },
  straordinari: { label: 'Straordinari',            color: '#06b6d4' },
  'mat-obb':    { label: 'Mat. Obbligatoria',       color: '#8b5cf6' },
  'mat-fac':    { label: 'Mat. Facoltativa',        color: '#a78bfa' },
  pnr:          { label: 'Perm. Non Retribuito',    color: '#94a3b8' },
  smart:        { label: 'Smart Work',              color: '#3b82f6' },
};

const TABS = [
  { key: 'in attesa', label: 'In Attesa',  color: '#b8962e' },
  { key: 'approvata', label: 'Approvate',  color: '#27ae60' },
  { key: 'rifiutata', label: 'Rifiutate',  color: '#c0392b' },
];

const GOLD = '#b8962e';

export default function AdminPresenze() {
  const [requests,    setRequests]    = useState([]);
  const [dipendenti,  setDipendenti]  = useState({});
  const [tab,         setTab]         = useState('in attesa');
  const [busy,        setBusy]        = useState({});
  const [rejectModal, setRejectModal] = useState(null); // docId
  const [rejectNote,  setRejectNote]  = useState('');
  const [expanded,    setExpanded]    = useState({});

  /* Fetch all presenze */
  useEffect(() => {
    return onSnapshot(
      query(collection(db, 'presenze'), orderBy('createdAt', 'desc')),
      snap => setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, []);

  /* Fetch dipendenti map uid → name */
  useEffect(() => {
    return onSnapshot(collection(db, 'dipendenti'), snap => {
      const m = {};
      snap.docs.forEach(d => {
        const { uid, displayName, email } = d.data();
        if (uid) m[uid] = displayName || email;
      });
      setDipendenti(m);
    });
  }, []);

  const approve = async (id) => {
    setBusy(b => ({ ...b, [id]: true }));
    await updateDoc(doc(db, 'presenze', id), {
      stato: 'approvata',
      notaAdmin: '',
      reviewedAt: new Date().toISOString(),
    });
    setBusy(b => ({ ...b, [id]: false }));
  };

  const reject = async () => {
    if (!rejectModal) return;
    setBusy(b => ({ ...b, [rejectModal]: true }));
    await updateDoc(doc(db, 'presenze', rejectModal), {
      stato: 'rifiutata',
      notaAdmin: rejectNote,
      reviewedAt: new Date().toISOString(),
    });
    setBusy(b => ({ ...b, [rejectModal]: false }));
    setRejectModal(null);
    setRejectNote('');
  };

  const filtered = requests.filter(r =>
    tab === 'in attesa' ? (!r.stato || r.stato === 'in attesa') : r.stato === tab
  );

  const counts = {
    'in attesa': requests.filter(r => !r.stato || r.stato === 'in attesa').length,
    'approvata': requests.filter(r => r.stato === 'approvata').length,
    'rifiutata': requests.filter(r => r.stato === 'rifiutata').length,
  };

  const toggleExpand = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  return (
    <div className="max-w-4xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: GOLD }}>Gestione Presenze</h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(240,236,224,0.45)' }}>
          Approva o rifiuta le richieste di assenza dei dipendenti
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={tab === t.key ? {
              background: `rgba(${t.key === 'in attesa' ? '184,150,46' : t.key === 'approvata' ? '39,174,96' : '192,57,43'},0.18)`,
              color: t.color,
              border: `1px solid ${t.color}55`,
            } : {
              background: 'rgba(255,255,255,0.04)',
              color: 'rgba(240,236,224,0.45)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {t.label}
            <span
              className="text-xs font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: tab === t.key ? t.color : 'rgba(255,255,255,0.08)', color: tab === t.key ? '#0a0a0a' : 'rgba(240,236,224,0.5)' }}
            >
              {counts[t.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Cards list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'rgba(240,236,224,0.25)' }}>
          <Clock size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nessuna richiesta</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => {
            const tipo   = TIPI[r.tipo] || { label: r.tipo, color: '#94a3b8' };
            const nome   = dipendenti[r.userId] || r.email || r.userId;
            const isOpen = expanded[r.id];

            return (
              <div
                key={r.id}
                className="rounded-2xl overflow-hidden"
                style={{
                  background: 'linear-gradient(145deg,#131313,#161616)',
                  border: `1px solid ${tab === 'in attesa' ? 'rgba(184,150,46,0.22)' : tab === 'approvata' ? 'rgba(39,174,96,0.22)' : 'rgba(192,57,43,0.22)'}`,
                }}
              >
                {/* Card header */}
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Avatar */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: 'rgba(184,150,46,0.15)', color: GOLD, border: `1px solid rgba(184,150,46,0.3)` }}
                  >
                    {nome?.[0]?.toUpperCase() || '?'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: '#f0ece0' }}>{nome}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {/* Tipo badge */}
                      <span
                        className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: `${tipo.color}22`, color: tipo.color, border: `1px solid ${tipo.color}44` }}
                      >
                        {tipo.label}
                      </span>
                      {/* Date range */}
                      <span className="text-[11px]" style={{ color: 'rgba(240,236,224,0.45)' }}>
                        {format(parseISO(r.dataInizio), 'd MMM', { locale: it })}
                        {r.dataFine && r.dataFine !== r.dataInizio && ` → ${format(parseISO(r.dataFine), 'd MMM yyyy', { locale: it })}`}
                        {(!r.dataFine || r.dataFine === r.dataInizio) && format(parseISO(r.dataInizio), ' yyyy', { locale: it })}
                      </span>
                      {/* Hours */}
                      <span className="text-[11px] font-bold" style={{ color: GOLD }}>{r.ore || 8}h</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Expand toggle for notes */}
                    {(r.note || r.notaAdmin) && (
                      <button onClick={() => toggleExpand(r.id)} className="p-1.5 rounded-lg transition" style={{ color: 'rgba(240,236,224,0.35)' }}>
                        {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </button>
                    )}

                    {tab === 'in attesa' && (
                      <>
                        <button
                          onClick={() => approve(r.id)}
                          disabled={busy[r.id]}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                          style={{ background: 'rgba(39,174,96,0.15)', color: '#27ae60', border: '1px solid rgba(39,174,96,0.3)' }}
                        >
                          <Check size={13} />
                          Approva
                        </button>
                        <button
                          onClick={() => { setRejectModal(r.id); setRejectNote(''); }}
                          disabled={busy[r.id]}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                          style={{ background: 'rgba(192,57,43,0.12)', color: '#e57373', border: '1px solid rgba(192,57,43,0.28)' }}
                        >
                          <X size={13} />
                          Rifiuta
                        </button>
                      </>
                    )}

                    {tab !== 'in attesa' && (
                      <span
                        className="text-xs font-bold px-2.5 py-1 rounded-full"
                        style={tab === 'approvata'
                          ? { background: 'rgba(39,174,96,0.15)', color: '#27ae60' }
                          : { background: 'rgba(192,57,43,0.12)', color: '#e57373' }
                        }
                      >
                        {tab === 'approvata' ? '✓ Approvata' : '✕ Rifiutata'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Expandable note section */}
                {isOpen && (
                  <div className="px-4 pb-3 pt-0 space-y-1.5" style={{ borderTop: '1px solid rgba(184,150,46,0.08)' }}>
                    {r.note && (
                      <div className="flex items-start gap-2">
                        <MessageSquare size={12} style={{ color: 'rgba(184,150,46,0.5)', marginTop: 2 }} />
                        <p className="text-xs" style={{ color: 'rgba(240,236,224,0.55)' }}>
                          <span className="font-semibold" style={{ color: GOLD }}>Nota dipendente: </span>{r.note}
                        </p>
                      </div>
                    )}
                    {r.notaAdmin && (
                      <div className="flex items-start gap-2">
                        <MessageSquare size={12} style={{ color: '#e57373', marginTop: 2 }} />
                        <p className="text-xs" style={{ color: 'rgba(240,236,224,0.55)' }}>
                          <span className="font-semibold" style={{ color: '#e57373' }}>Nota admin: </span>{r.notaAdmin}
                        </p>
                      </div>
                    )}
                    {r.reviewedAt && (
                      <p className="text-[11px]" style={{ color: 'rgba(240,236,224,0.25)' }}>
                        Revisionata il {format(parseISO(r.reviewedAt), 'd MMM yyyy HH:mm', { locale: it })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div
            className="w-full max-w-sm rounded-2xl p-6"
            style={{
              background: 'linear-gradient(145deg,#131313,#171717)',
              border: '1px solid rgba(192,57,43,0.35)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
            }}
          >
            <h3 className="font-bold text-base mb-1" style={{ color: '#e57373' }}>Rifiuta Richiesta</h3>
            <p className="text-xs mb-4" style={{ color: 'rgba(240,236,224,0.4)' }}>Aggiungi una motivazione (opzionale)</p>

            <textarea
              value={rejectNote}
              onChange={e => setRejectNote(e.target.value)}
              rows={3}
              placeholder="Es: Periodo già occupato, ferie non disponibili..."
              className="w-full rounded-xl px-3 py-2.5 text-sm resize-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(192,57,43,0.3)', color: '#f0ece0', outline: 'none' }}
            />

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setRejectModal(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(240,236,224,0.6)' }}
              >
                Annulla
              </button>
              <button
                onClick={reject}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: 'rgba(192,57,43,0.2)', color: '#e57373', border: '1px solid rgba(192,57,43,0.4)' }}
              >
                Conferma Rifiuto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
