import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user,     setUser]     = useState(null);
  const [userRole, setUserRole] = useState('user');
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const snap = await getDocs(
            query(collection(db, 'dipendenti'), where('uid', '==', currentUser.uid))
          );
          setUserRole(!snap.empty ? (snap.docs[0].data().role || 'user') : 'user');
        } catch {
          setUserRole('user');
        }
      } else {
        setUserRole('user');
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login  = (email, password) => signInWithEmailAndPassword(auth, email, password);
  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, userRole, loading, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
