import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBJKqkr4ltuPMzAbolCbH8u4WdPQRMMMS4",
  authDomain: "codesmanager.firebaseapp.com",
  projectId: "codesmanager",
  storageBucket: "codesmanager.firebasestorage.app",
  messagingSenderId: "821213605605",
  appId: "1:821213605605:web:b778fae8ed7dcf3972ae0c",
  measurementId: "G-LV8LFGF7QP",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
