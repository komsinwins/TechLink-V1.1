import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "distinguished-flames-qd2jw",
  appId: "1:388761887892:web:14befa5ba5c74ea9924081",
  apiKey: "AIzaSyDQQM_Izz_2QL2OpJpZwvXj_mXgUvCNJ8c",
  authDomain: "distinguished-flames-qd2jw.firebaseapp.com",
  storageBucket: "distinguished-flames-qd2jw.firebasestorage.app",
  messagingSenderId: "388761887892"
};

const app = initializeApp(firebaseConfig);

// Get custom Firestore database instance
export const db = getFirestore(app, "ai-studio-wsstechlinkv11-a52a8d1d-b83c-438f-bfab-510d0ec65637");

