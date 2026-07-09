import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, setDoc, doc } from 'firebase/firestore';

const oldConfig = {
  projectId: "distinguished-flames-qd2jw",
  appId: "1:388761887892:web:14befa5ba5c74ea9924081",
  apiKey: "AIzaSyDQQM_Izz_2QL2OpJpZwvXj_mXgUvCNJ8c",
  authDomain: "distinguished-flames-qd2jw.firebaseapp.com",
  storageBucket: "distinguished-flames-qd2jw.firebasestorage.app",
  messagingSenderId: "388761887892"
};

const newConfig = {
  apiKey: "AIzaSyAxtZwzUGkaVMqB4x6LGLtNq5RAtlf0eqc",
  authDomain: "techlinkver11.firebaseapp.com",
  projectId: "techlinkver11",
  storageBucket: "techlinkver11.firebasestorage.app",
  messagingSenderId: "558599261303",
  appId: "1:558599261303:web:5f0494286651bc69450a72"
};

const oldApp = initializeApp(oldConfig, "old");
const newApp = initializeApp(newConfig, "new");

const oldDb = getFirestore(oldApp, "ai-studio-wsstechlinkv11-a52a8d1d-b83c-438f-bfab-510d0ec65637");
const newDb = getFirestore(newApp);

const collectionsToMigrate = ['customers', 'onsiteJobs', 'oncallJobs', 'claims'];

async function migrate() {
  console.log('Starting migration from old project to new project...');
  for (const collName of collectionsToMigrate) {
    console.log(`Migrating collection: ${collName}`);
    try {
        const snapshot = await getDocs(collection(oldDb, collName));
        console.log(`Found ${snapshot.docs.length} documents in ${collName}`);
        for (const d of snapshot.docs) {
          await setDoc(doc(newDb, collName, d.id), d.data());
        }
        console.log(`Finished ${collName}`);
    } catch (e) {
        console.error(`Error migrating ${collName}:`, e.message);
    }
  }
  console.log('Done migrating all collections!');
  process.exit(0);
}

migrate().catch(console.error);
