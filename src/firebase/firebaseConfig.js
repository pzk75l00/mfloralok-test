// Configuración de Firebase/Firestore
// Reemplaza los valores con los de tu proyecto de Firebase
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDd0MHG0qZlUu4GPC8UHA5XhDMGVw__1dc",
  authDomain: "mfloralok.firebaseapp.com",
  databaseURL: "https://mfloralok-default-rtdb.firebaseio.com",
  projectId: "mfloralok",
  storageBucket: "mfloralok.appspot.com",
  messagingSenderId: "426630649514",
  appId: "1:426630649514:web:fa3839e750d4b5230fa2d3",
  measurementId: "G-P9S4FP71WH"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };