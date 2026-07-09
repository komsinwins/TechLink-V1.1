import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, setDoc, doc } from 'firebase/firestore';

const newConfig = {
  apiKey: "AIzaSyAxtZwzUGkaVMqB4x6LGLtNq5RAtlf0eqc",
  authDomain: "techlinkver11.firebaseapp.com",
  projectId: "techlinkver11",
  storageBucket: "techlinkver11.firebasestorage.app",
  messagingSenderId: "558599261303",
  appId: "1:558599261303:web:5f0494286651bc69450a72"
};

const newApp = initializeApp(newConfig);
const newDb = getFirestore(newApp);

async function check() {
  try {
    await setDoc(doc(newDb, "customers", "test-doc"), { a: 1 });
    console.log("Write success!");
  } catch (e) {
    console.log("Write failed:", e.message);
  }
  process.exit(0);
}
check();
