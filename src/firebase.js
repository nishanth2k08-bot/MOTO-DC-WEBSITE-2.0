import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyDfGpxwKeVwsgqoY7kBV89Ms6d28--wAHA',
  authDomain: 'moto-dc-6e049.firebaseapp.com',
  projectId: 'moto-dc-6e049',
  storageBucket: 'moto-dc-6e049.firebasestorage.app',
  messagingSenderId: '278997563172',
  appId: '1:278997563172:web:ea273440de25fcf829e5b1',
  measurementId: 'G-CQSSJ222H0'
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, 'asia-south1');
export const auth = getAuth(app);

// Admin uses a separate Firebase Auth/Firestore instance so an admin session
// can stay signed in while a customer uses the normal account session.
const adminApp = initializeApp(firebaseConfig, 'motodc-admin');
export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp, 'asia-south1');
