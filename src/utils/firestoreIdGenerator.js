import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

/**
 * Colecciones que deben usar IDs personalizados (email, etc.) en lugar de IDs numéricos
 */
const COLLECTIONS_WITH_CUSTOM_IDS = [
  'app_config',
  'users',
  'users_by_email'
];

/**
 * Genera el siguiente ID numérico para una colección
 * @param {string} collectionName - Nombre de la colección
 * @returns {Promise<number>} - Siguiente ID numérico
 */
export async function getNextNumericId(collectionName) {
  try {
    // Obtener todos los documentos y buscar el ID máximo
    const snap = await getDocs(collection(db, collectionName));
    
    if (snap.empty) {
      return 1; // Primera inserción
    }

    // Extraer todos los IDs numéricos
    const numericIds = snap.docs
      .map(doc => {
        const docId = doc.id;
        const numId = Number(docId);
        // Validar que sea un número válido
        return !isNaN(numId) && isFinite(numId) ? numId : 0;
      })
      .filter(id => id > 0);

    if (numericIds.length === 0) {
      return 1; // No hay IDs numéricos aún
    }

    // Retornar el máximo + 1
    return Math.max(...numericIds) + 1;
  } catch (error) {
    console.error(`Error obteniendo siguiente ID para ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Verifica si una colección debe usar IDs numéricos automáticos
 * @param {string} collectionName - Nombre de la colección
 * @returns {boolean}
 */
export function shouldUseNumericId(collectionName) {
  return !COLLECTIONS_WITH_CUSTOM_IDS.includes(collectionName);
}

/**
 * Agrega una colección a la lista de excepciones (IDs personalizados)
 * @param {string} collectionName - Nombre de la colección
 */
export function addCustomIdCollection(collectionName) {
  if (!COLLECTIONS_WITH_CUSTOM_IDS.includes(collectionName)) {
    COLLECTIONS_WITH_CUSTOM_IDS.push(collectionName);
  }
}

/**
 * Obtiene la lista actual de colecciones con IDs personalizados
 * @returns {string[]}
 */
export function getCustomIdCollections() {
  return [...COLLECTIONS_WITH_CUSTOM_IDS];
}
