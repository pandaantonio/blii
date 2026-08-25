import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getAuth,
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getDatabase,
  Database,
  ref,
  get,
  set,
  update,
  remove,
  onValue,
  query,
  orderByChild,
  equalTo,
  push,
  child,
} from "firebase/database";
import {
  getStorage,
  FirebaseStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const auth: Auth = getAuth(app);
const db: Database = getDatabase(app);
const storage: FirebaseStorage = getStorage(app);

export {
  app,
  auth,
  db,
  storage,
  // Database
  ref,
  get,
  set,
  update,
  remove,
  onValue,
  query,
  orderByChild,
  equalTo,
  push,
  child,
  // Auth
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  // Storage
  storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
};