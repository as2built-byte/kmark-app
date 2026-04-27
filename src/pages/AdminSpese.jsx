import { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection, query, onSnapshot, orderBy, updateDoc, doc,
} from 'firebase/firestore';
import { Check, X, Clock, ChevronDown, ChevronUp, Download, Camera } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

const GOLD = '#b8962e';

const CATEGORIE_COLOR = {
  Trasporto:  '#3b82f6',
  Alloggio:   '#8b5cf6',
  Pasti:      '#f59e0b',
  Carburante: '#f43f5e',
  Materiali:  '#10b981',
  Altro:      '#94a3b8',
};

const TABS = [
  { key: 'inviata',   label: 'In Attesa',  color: GOLD },
  { key: 'approvata', label: 'Approvate',  color: '#27ae60' },
  { key: 'rifiutata', label: 'Rifiutate',  color: '#c0392b' },
];

const eur = (n) => `€ ${Number(n || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function AdminSpese() {
  const [spese,       setSpese]       = useState([]);
  const [dipendenti,  setDipendenti]  = useState({});
  const [tab,         setTab]         = useState('inviata');
  const [busy,        setBusy]        = useState({});
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectNote,  setRejectNote]  = useState('');
  const [expanded,    setExpanded]    = useState({});

  /* Fetch all spese */
  useEffect(() => {
    return onSnapshot(
      query(collection(db, 'spese'), orderBy('createdAt', 'desc')),
      snap => setSpese(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, []);

  /* Dipendenti map uid → name */
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
    await updateDoc(doc(db, 'spese', id), {
      stato: 'approvata',
      notaAdmin: '',
      reviewedAt: new Date().toISOString(),
    });
    setBusy(b => ({ ...b, [id]: false }));
  };

  const reject = async () => {
    if (!rejectModal) return;
    setBusy(b => ({ ...b, [rejectModal]: true }));
    await updateDoc(doc(db, 'spese', rejectModal), {
      stato: 'rifiutata',
      notaAdmin: rejectNote,
      reviewedAt: new Date().toISOString(),
    });
    setBusy(b => ({ ...b, [rejectModal]: false }));
    setRejectModal(null);
    setRejectNote('');
  };

  const filtered = spese.filter(s => s.stato === tab || (!s.stato && tab === 'inviata'));

  const counts = {
    inviata:   spese.filter(s => !s.stato || s.stato === 'inviata').length,
    approvata: spese.filter(s => s.stato === 'approvata').length,
    rifiutata: spese.filter(s => s.stato === 'rifiutata').length,
  };

  const totaleTab = filtered.reduce((a, s) => a + (s.importo || 0), 0);

  return (
    <div className="max-w-4xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: GOLD }}>Gestione Spese</h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(240,236,224,0.45)' }}>
          Approva o rifiuta le note spese dei dipendenti
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={tab === t.key ? {
              background: `rgba(${t.key === 'inviata' ? '184,150,46' : t.key === 'approvata' ? '39,174,96' : '192,57,43'},0.18)`,
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

        {/* Totale importo tab corrente */}
        {filtered.length > 0 && (
          <span className="ml-auto self-center text-sm font-bold" style={{ color: GOLD }}>
            Totale: {eur(totaleTab)}
          </span>
        )}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'rgba(240,236,224,0.25)' }}>
          <Clock size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nessuna nota spese</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(s => {
            const nome   = dipendenti[s.userId] || s.email || s.userId;
            const catCol = CATEGORIE_COLOR[s.categoria] || '#94a3b8';
            const isOpen = expanded[s.id];

            return (
              <div
                key={s.id}
                className="rounded-2xl overflow-hidden"
                style={{
                  background: 'linear-gradient(145deg,#131313,#161616)',
                  border: `1px solid ${tab === 'inviata' ? 'rgba(184,150,46,0.22)' : tab === 'approvata' ? 'rgba(39,174,96,0.22)' : 'rgba(192,57,43,0.22)'}`,
                }}
              >
                {/* Main row */}
                <div className="flex items-center gap-3 px-4 py-3">

                  {/* Avatar */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: 'rgba(184,150,46,0.15)', color: GOLD, border: `1px solid rgba(184,150,46,0.3)` }}
                  >
                    {nome?.[0]?.toUpperCase() || '?'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold" style={{ color: '#f0ece0' }}>{nome}</p>
                      {/* Categoria badge */}
                      <span
                        className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: `${catCol}22`, color: catCol, border: `1px solid ${catCol}44` }}
                      >
                        {s.categoria}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-sm font-bold" style={{ color: GOLD }}>{eur(s.importo)}</span>
                      <span className="text-[11px]" style={{ color: 'rgba(240,236,224,0.45)' }}>
                        {s.descrizione}
                      </span>
                      {s.data && (
                        <span className="text-[11px]" style={{ color: 'rgba(240,236,224,0.3)' }}>
                          {format(parseISO(s.data), 'd MMM yyyy', { locale: it })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Photo link */}
                    {s.photoUrl && (
                      <a
                        href={s.photoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg transition"
                        style={{ color: 'rgba(184,150,46,0.5)' }}
                        title="Vedi scontrino"
                      >
                        <Camera size={15} />
                      </a>
                    )}

                    {/* Expand toggle */}
                    {(s.note || s.notaAdmin) && (
                      <button onClick={() => setExpanded(e => ({ ...e, [s.id]: !e[s.id] }))} className="p-1.5 rounded-lg transition" style={{ color: 'rgba(240,236,224,0.35)' }}>
                        {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </button>
                    )}

                    {tab === 'inviata' && (
                      <>
                        <button
                          onClick={() => approve(s.id)}
                          disabled={busy[s.id]}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                          style={{ background: 'rgba(39,174,96,0.15)', color: '#27ae60', border: '1px solid rgba(39,174,96,0.3)' }}
                        >
                          <Check size={13} /> Approva
                        </button>
                        <button
                          onClick={() => { setRejectModal(s.id); setRejectNote(''); }}
                          disabled={busy[s.id]}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                          style={{ background: 'rgba(192,57,43,0.12)', color: '#e57373', border: '1px solid rgba(192,57,43,0.28)' }}
                        >
                          <X size={13} /> Rifiuta
                        </button>
                      </>
                    )}

                    {tab !== 'inviata' && (
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

                {/* Expanded notes */}
                {isOpen && (
                  <div className="px-4 pb-3 space-y-1.5" style={{ borderTop: '1px solid rgba(184,150,46,0.08)' }}>
                    {s.note && (
                      <p className="text-xs pt-2" style={{ color: 'rgba(240,236,224,0.55)' }}>
                        <span className="font-semibold" style={{ color: GOLD }}>Nota: </span>{s.note}
                      </p>
                    )}
                    {s.notaAdmin && (
                      <p className="text-xs" style={{ color: 'rgba(240,236,224,0.55)' }}>
                        <span className="font-semibold" style={{ color: '#e57373' }}>Motivazione rifiuto: </span>{s.notaAdmin}
                      </p>
                    )}
                    {s.reviewedAt && (
                      <p className="text-[11px]" style={{ color: 'rgba(240,236,224,0.25)' }}>
                        Revisionata il {format(parseISO(s.reviewedAt), 'd MMM yyyy HH:mm', { locale: it })}
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
            <h3 className="font-bold text-base mb-1" style={{ color: '#e57373' }}>Rifiuta Nota Spese</h3>
            <p className="text-xs mb-4" style={{ color: 'rgba(240,236,224,0.4)' }}>Aggiungi una motivazione (opzionale)</p>
            <textarea
              value={rejectNote}
              onChange={e => setRejectNote(e.target.value)}
              rows={3}
              placeholder="Es. Documentazione insufficiente, fuori budget..."
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
