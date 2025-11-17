import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

// Servicio para manejo de usuarios
const auth = getAuth();

// Registrar usuario "funcional" (solo datos y permisos). No crea cuenta en Auth;
// el usuario debe acceder con su cuenta de Google (mismo email).
export async function registerUser({ email, nombre, apellido, telefono, modules = ["basico"], rol = "usuario" }) {
  const ref = doc(db, 'users_by_email', email.toLowerCase());
  await setDoc(ref, {
    email: email.toLowerCase(),
    nombre,
    apellido,
    telefono,
    rol,
    modules,
    estado: 'pendiente',
    creado: new Date().toISOString()
  }, { merge: true });
  return email.toLowerCase();
}

// Login de usuario
export async function loginUser(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

// Obtener datos de usuario
export async function getUserData(uid) {
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (userDoc.exists()) {
    return userDoc.data();
  }
  return null;
}

// Verificar si el usuario es admin
export async function isAdmin(uid) {
  const user = await getUserData(uid);
  return user && user.rol === 'admin';
}
