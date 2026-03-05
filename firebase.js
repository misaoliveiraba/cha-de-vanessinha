// firebase.js — Firebase initialization using ES Modules (no bundler needed)
import { initializeApp } from "https://esm.sh/firebase@10.12.2/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://esm.sh/firebase@10.12.2/auth";
import { getFirestore, collection, doc, getDocs, getDoc, setDoc, updateDoc, addDoc, deleteDoc, onSnapshot, serverTimestamp, query, orderBy } from "https://esm.sh/firebase@10.12.2/firestore";

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
