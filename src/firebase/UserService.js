import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebaseConfig';

// Servicio para manejo de usuarios
const auth = getAuth();

// Registrar usuario "funcional" (solo datos y permisos). No crea cuenta en Auth;
// el usuario debe acceder con su cuenta de Google (mismo email).
// Además deja preparado el período de prueba y metadatos de rubro/país.
export async function registerUser({
  email,
  nombre = '',
  apellido = '',
  telefono = '',
  modules = ["basico"],
  rol = "usuario",
  rubroId = null,
  paisId = null,
  tiempoPrueba = 7,
}) {
  const normalizedEmail = String(email || '').toLowerCase();
  const ref = doc(db, 'users_by_email', normalizedEmail);

  const now = new Date();
  const dias = Number.isFinite(Number(tiempoPrueba)) ? Number(tiempoPrueba) : 7;
  const fechaFin = new Date(now.getTime() + dias * 24 * 60 * 60 * 1000);


  // Nota de autoregistro para auditoría
  const notaItem = {
    ts: now.toISOString(),
    actor: 'sistema',
    accion: 'autoregistro',
    nota: 'autoregistro'
  };

  await setDoc(ref, {
    email: normalizedEmail,
    nombre: nombre || '',
    apellido: apellido || '',
    telefono: telefono || '',
    rol,
    modules,
    estado: 'pendiente',
    fechaCreacion: now.toISOString(),
    fechaModif: now.toISOString(),
    fechaFin: fechaFin.toISOString(),
    tiempoPrueba: dias,
    rubroId: rubroId || null,
    paisId: paisId || null,
    // Marca de servidor para auditoría complementaria
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ultimaNota: notaItem,
    notas: [notaItem],
  }, { merge: true });

  return normalizedEmail;
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
