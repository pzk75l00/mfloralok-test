// Utilitarios para gestión de productos - reutilizable en móvil y escritorio
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

/**
 * Crea un nuevo producto en la base de datos
 * @param {Object} productData - Datos del producto
 * @param {string} productData.name - Nombre del producto
 * @param {number} productData.purchasePrice - Precio de compra
 * @param {number} productData.basePrice - Precio base de venta
 * @param {number} productData.stock - Stock inicial
 * @param {string} productData.type - Tipo: 'producto' para venta, 'insumo' para uso interno
 * @returns {Promise<string>} - ID del producto creado
 */
export const createNewProduct = async (productData) => {
  try {
    const productDoc = {
      name: productData.name.trim(),
      purchasePrice: parseFloat(productData.purchasePrice) || 0,
      basePrice: parseFloat(productData.basePrice) || 0,
      stock: parseInt(productData.stock) || 0,
      type: productData.type || 'insumo', // Por defecto es insumo (uso interno)
      image: productData.image || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await addDoc(collection(db, 'plants'), productDoc);
    console.log('✓ Producto creado:', productDoc.name, 'con ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creando producto:', error);
    throw new Error('No se pudo crear el producto. Intenta nuevamente.');
  }
};

/**
 * Valida si un producto ya existe por nombre
 * @param {Array} plants - Lista de productos existentes
 * @param {string} productName - Nombre a validar
 * @returns {boolean} - true si existe, false si no
 */
export const productExists = (plants, productName) => {
  if (!productName || !productName.trim()) return false;
  
  const normalizedName = productName.trim().toLowerCase();
  return plants.some(plant => 
    plant.name.toLowerCase() === normalizedName
  );
};

/**
 * Busca productos similares por nombre (para sugerencias)
 * @param {Array} plants - Lista de productos existentes
 * @param {string} searchTerm - Término de búsqueda
 * @returns {Array} - Lista de productos similares
 */
export const findSimilarProducts = (plants, searchTerm) => {
  if (!searchTerm || !searchTerm.trim()) return [];
  
  const normalizedSearch = searchTerm.trim().toLowerCase();
  
  return plants.filter(plant => 
    plant.name.toLowerCase().includes(normalizedSearch)
  ).slice(0, 5); // Máximo 5 sugerencias
};

/**
 * Genera un precio base sugerido basado en el precio de compra
 * @param {number} purchasePrice - Precio de compra
 * @param {number} markup - Margen de ganancia (por defecto 2.5x)
 * @returns {number} - Precio base sugerido
 */
export const suggestBasePrice = (purchasePrice, markup = 2.5) => {
  const price = parseFloat(purchasePrice) || 0;
  return Math.round(price * markup);
};

/**
 * Valida los datos de un producto antes de crear
 * @param {Object} productData - Datos a validar
 * @returns {Object} - { isValid: boolean, errors: string[] }
 */
export const validateProductData = (productData) => {
  const errors = [];
  
  if (!productData.name || !productData.name.trim()) {
    errors.push('El nombre del producto es obligatorio');
  }
  
  if (productData.name && productData.name.trim().length < 2) {
    errors.push('El nombre debe tener al menos 2 caracteres');
  }
  
  if (productData.purchasePrice !== undefined && productData.purchasePrice < 0) {
    errors.push('El precio de compra no puede ser negativo');
  }
  
  if (productData.basePrice !== undefined && productData.basePrice < 0) {
    errors.push('El precio base no puede ser negativo');
  }
  
  if (productData.stock !== undefined && productData.stock < 0) {
    errors.push('El stock no puede ser negativo');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
