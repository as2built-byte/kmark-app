import { useState, useEffect, useRef } from 'react';
import { db, storage } from '../firebase';
import { useAuth } from '../context/AuthContext';
import {
  collection, addDoc, query, where, orderBy, onSnapshot, Timestamp, deleteDoc, doc
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { FileText, Upload, Trash2, Download, Loader2, FilePlus } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function Documenti() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const fileInputRef = useRef();

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'documenti'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setDocuments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user]);

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
        <h1 className="text-2xl font-bold text-slate-800">Documenti</h1>
        <p className="text-slate-500 text-sm mt-0.5">Buste paga e documenti aziendali</p>
      </div>

      {/* Upload area */}
      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        className="border-2 border-dashed border-slate-300 hover:border-[#c0392b] rounded-2xl p-8 text-center cursor-pointer transition-colors bg-white group"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleUpload}
          className="hidden"
        />
        {uploading ? (
          <div className="space-y-3">
            <Loader2 size={32} className="animate-spin text-[#c0392b] mx-auto" />
            <p className="text-sm text-slate-600">Caricamento in corso... {progress}%</p>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-[#c0392b] h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <FilePlus size={32} className="text-slate-300 group-hover:text-[#c0392b] mx-auto mb-3 transition-colors" />
            <p className="font-medium text-slate-600 text-sm">Clicca per caricare un PDF</p>
            <p className="text-xs text-slate-400 mt-1">Dimensione massima: 10 MB</p>
          </>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
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
