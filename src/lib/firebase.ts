// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";


const firebaseConfig = {
    apiKey: "AIzaSyB8MhmgReuul8G-afA4prOG01pTaLnkIlA",
    authDomain: "poll-app1366.firebaseapp.com",
    projectId: "poll-app1366",
    storageBucket: "poll-app1366.firebasestorage.app",
    messagingSenderId: "806315458366",
    appId: "1:806315458366:web:b51cfe7717ceb586e1366f",
    measurementId: "G-FS45HXP73K"
  };
  

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
