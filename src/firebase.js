import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCqJwlmRzdfYb-aqxXHilLfVTaDQYD8U70",
  authDomain: "k-mark-b4509.firebaseapp.com",
  projectId: "k-mark-b4509",
  storageBucket: "k-mark-b4509.firebasestorage.app",
  messagingSenderId: "939746337624",
  appId: "1:939746337624:web:7d585c46cb80c6e8fa7b2d",
  measurementId: "G-TTRMGBSXV4"
};

const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
