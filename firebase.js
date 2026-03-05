// firebase.js — Firebase initialization via official Firebase CDN (ESM)
// Using gstatic.com CDN ensures all sub-packages share the same internal registry
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAcv0FewVp1so5LeL9k88w3Oc_RA6wz-YI",
  authDomain: "cha-de-casa-nova-9d228.firebaseapp.com",
  projectId: "cha-de-casa-nova-9d228",
  storageBucket: "cha-de-casa-nova-9d228.firebasestorage.app",
  messagingSenderId: "560798141020",
  appId: "1:560798141020:web:84dd6ec21b631da4a7f499",
  measurementId: "G-BNEERGNX02"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export {
  auth,
  db,
  provider,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy
};
