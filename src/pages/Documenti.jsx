import { useState, useEffect, useRef } from 'react';
import { db, storage } from '../firebase';
import { useAuth } from '../context/AuthContext';
import {
  collection, addDoc, query, where, orderBy, onSnapshot, Timestamp, deleteDoc, doc
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { FileText, Trash2, Download, Loader2, FilePlus, Users, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const GOLD = '#b8962e';

export default function Documenti() {
  const { user, userRole } = useAuth();
  const isAdmin = userRole === 'admin';

  const [documents,    setDocuments]    = useState([]);
  const [uploading,    setUploading]    = useState(false);
  const [progress,     setProgress]     = useState(0);
  const [error,        setError]        = useState('');
  const fileInputRef = useRef();

  /* Admin: upload for employee */
  const [dipendenti,   setDipendenti]   = useState([]);
  const [selEmp,       setSelEmp]       = useState('');
  const [adminUploading, setAdminUploading] = useState(false);
  const [adminProgress,  setAdminProgress]  = useState(0);
  const [adminError,   setAdminError]   = useState('');
  const adminFileRef = useRef();

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'documenti'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, snap => setDocuments(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [user]);

  /* Admin: load employee list */
  useEffect(() => {
    if (!isAdmin) return;
    return onSnapshot(
      query(collection(db, 'dipendenti'), orderBy('displayName')),
      snap => setDipendenti(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, [isAdmin]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setError('Solo file PDF sono accettati.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Il file supera i 10 MB.');
      return;
    }
    setError('');
    setUploading(true);
    setProgress(0);
    const storageRef = ref(storage, `documenti/${user.uid}/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);
    uploadTask.on(
      'state_changed',
      (snap) => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      (err) => { setError('Errore upload: ' + err.message); setUploading(false); },
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        await addDoc(collection(db, 'documenti'), {
          userId: user.uid,
          email: user.email,
          name: file.name,
          url,
          storagePath: storageRef.fullPath,
          createdAt: Timestamp.now(),
          size: file.size,
        });
        setUploading(false);
        setProgress(0);
        fileInputRef.current.value = '';
      }
    );
  };

  /* Admin: upload PDF for a specific employee */
  const handleAdminUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!selEmp) { setAdminError('Seleziona un dipendente.'); return; }
    if (file.type !== 'application/pdf') { setAdminError('Solo file PDF sono accettati.'); return; }
    if (file.size > 10 * 1024 * 1024) { setAdminError('Il file supera i 10 MB.'); return; }
    const emp = dipendenti.find(d => d.uid === selEmp);
    if (!emp) { setAdminError('Dipendente non trovato.'); return; }
    setAdminError('');
    setAdminUploading(true);
    setAdminProgress(0);
    const storageRef = ref(storage, `documenti/${emp.uid}/${Date.now()}_${file.name}`);
    const task = uploadBytesResumable(storageRef, file);
    task.on(
      'state_changed',
      snap => setAdminProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      err => { setAdminError('Errore: ' + err.message); setAdminUploading(false); },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        await addDoc(collection(db, 'documenti'), {
          userId: emp.uid,
          email: emp.email,
          name: file.name,
          url,
          storagePath: storageRef.fullPath,
          createdAt: Timestamp.now(),
          size: file.size,
          uploadedByAdmin: user.uid,
        });
        setAdminUploading(false);
        setAdminProgress(0);
        adminFileRef.current.value = '';
      }
    );
  };

  const handleDelete = async (doc_) => {
    if (!confirm(`Eliminare "${doc_.name}"?`)) return;
    try {
      await deleteObject(ref(storage, doc_.storagePath));
    } catch {}
    await deleteDoc(doc(db, 'documenti', doc_.id));
  };

  const formatBytes = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: GOLD }}>Documenti</h1>
        <p className="text-sm mt-0.5" style={{ color: 'rgba(240,236,224,0.45)' }}>I tuoi documenti aziendali</p>
      </div>

      {/* ── Admin: upload for employee ────────────────────────────────── */}
      {isAdmin && (
        <div
          className="rounded-2xl p-5 space-y-4"
          style={{
            background: 'linear-gradient(145deg,#131313,#161616)',
            border: `1px solid rgba(184,150,46,0.28)`,
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          }}
        >
          <div className="flex items-center gap-2">
            <Users size={16} style={{ color: GOLD }} />
            <h2 className="text-sm font-bold" style={{ color: GOLD }}>Carica documento per dipendente</h2>
          </div>

          {/* Employee selector */}
          <div className="relative">
            <select
              value={selEmp}
              onChange={e => setSelEmp(e.target.value)}
              className="w-full rounded-xl px-4 py-2.5 text-sm appearance-none pr-8"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(184,150,46,0.22)', color: selEmp ? '#f0ece0' : 'rgba(240,236,224,0.35)', outline:'none' }}
            >
              <option value="">Seleziona dipendente...</option>
              {dipendenti.filter(d => d.uid).map(d => (
                <option key={d.id} value={d.uid}>{d.displayName || d.email}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: GOLD }} />
          </div>

          {/* Drop zone */}
          <div
            onClick={() => !adminUploading && selEmp && adminFileRef.current?.click()}
            className="border-2 border-dashed rounded-xl p-6 text-center transition-all"
            style={{
              borderColor: selEmp ? 'rgba(184,150,46,0.4)' : 'rgba(255,255,255,0.08)',
              cursor: selEmp && !adminUploading ? 'pointer' : 'default',
              opacity: selEmp ? 1 : 0.5,
            }}
          >
            <input ref={adminFileRef} type="file" accept="application/pdf" onChange={handleAdminUpload} className="hidden" />
            {adminUploading ? (
              <div className="space-y-2">
                <Loader2 size={28} className="animate-spin mx-auto" style={{ color: GOLD }} />
                <p className="text-xs" style={{ color: 'rgba(240,236,224,0.5)' }}>Caricamento {adminProgress}%</p>
                <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div className="h-1.5 rounded-full transition-all" style={{ width: `${adminProgress}%`, background: GOLD }} />
                </div>
              </div>
            ) : (
              <>
                <FilePlus size={28} className="mx-auto mb-2" style={{ color: selEmp ? GOLD : 'rgba(255,255,255,0.2)' }} />
                <p className="text-xs" style={{ color: 'rgba(240,236,224,0.5)' }}>{selEmp ? 'Clicca per selezionare un PDF' : 'Seleziona prima un dipendente'}</p>
              </>
            )}
          </div>
          {adminError && <p className="text-xs" style={{ color: '#e57373' }}>{adminError}</p>}
        </div>
      )}

      {/* ── My upload area ───────────────────────────────────────────────── */}
      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        className="rounded-2xl p-7 text-center cursor-pointer transition-all"
        style={{
          background: 'linear-gradient(145deg,#131313,#161616)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <input ref={fileInputRef} type="file" accept="application/pdf" onChange={handleUpload} className="hidden" />
        {uploading ? (
          <div className="space-y-3">
            <Loader2 size={28} className="animate-spin mx-auto" style={{ color: GOLD }} />
            <p className="text-sm" style={{ color: 'rgba(240,236,224,0.55)' }}>Caricamento in corso... {progress}%</p>
            <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div className="h-1.5 rounded-full transition-all" style={{ width: `${progress}%`, background: GOLD }} />
            </div>
          </div>
        ) : (
          <>
            <FilePlus size={28} className="mx-auto mb-2" style={{ color: 'rgba(184,150,46,0.5)' }} />
            <p className="text-sm font-medium" style={{ color: 'rgba(240,236,224,0.6)' }}>Carica il tuo documento PDF</p>
            <p className="text-xs mt-1" style={{ color: 'rgba(240,236,224,0.3)' }}>Dimensione massima: 10 MB</p>
          </>
        )}
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.3)', color: '#e57373' }}>
          {error}
        </div>
      )}

      {/* Document list */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <FileText size={16} className="text-slate-400" />
          <h2 className="font-semibold text-slate-700 text-sm">I miei documenti ({documents.length})</h2>
        </div>
        {documents.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={40} className="text-slate-200 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">Nessun documento caricato</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {documents.map((d) => (
              <li key={d.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                  <FileText size={20} className="text-[#c0392b]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{d.name}</p>
                  <p className="text-xs text-slate-400">
                    {d.createdAt ? format(d.createdAt.toDate(), 'd MMM yyyy', { locale: it }) : ''} · {formatBytes(d.size)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg text-slate-400 hover:text-[#c0392b] hover:bg-red-50 transition"
                  >
                    <Download size={16} />
                  </a>
                  <button
                    onClick={() => handleDelete(d)}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
