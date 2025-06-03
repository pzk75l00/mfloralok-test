// Configuración de Firebase/Firestore
// Reemplaza los valores con los de tu proyecto de Firebase
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCK8Rmtti1TrKRCR_sUzhncm4ebk7OoUXs",
  authDomain: "mruh2-398d6.firebaseapp.com",
  databaseURL: "https://mruh2-398d6.firebaseio.com",
  projectId: "mruh2-398d6",
  storageBucket: "mruh2-398d6.firebasestorage.app",
  messagingSenderId: "274684476540",
  appId: "1:274684476540:web:5dc96795cee6e8c81d5df9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };