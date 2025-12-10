// Utilitarios para gestión de productos - reutilizable en móvil y escritorio
import { collection, addDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

/**
 * Crea un nuevo producto en la base de datos
 * @param {Object} productData - Datos del producto
 * @param {string} productData.name - Nombre del producto
 * @param {number} productData.basePrice - Precio de compra (precio base)
 * @param {number} productData.purchasePrice - Precio de venta
 * @param {number} productData.stock - Stock inicial
 * @param {string} productData.type - Tipo: 'producto' para venta, 'insumo' para uso interno
 * @returns {Promise<string>} - ID del producto creado
 */
export const createNewProduct = async (productData) => {
  try {
    const productDoc = {
      name: productData.name.trim(),
      basePrice: parseFloat(productData.basePrice) || 0, // precio de compra
      purchasePrice: parseFloat(productData.purchasePrice) || 0, // precio de venta
      stock: parseInt(productData.stock) || 0,
      type: productData.type || 'insumo', // Por defecto es insumo (uso interno)
      image: productData.image || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await addDoc(collection(db, 'producto'), productDoc);
    console.log('✓ Producto creado:', productDoc.name, 'con ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creando producto:', error);
    throw new Error('No se pudo crear el producto. Intenta nuevamente.');
  }
};

// Verifica duplicados permitiendo excluir un ID en edición
export const isDuplicateProductName = (plants, productName, currentId = null) => {
  if (!productName || !productName.trim()) return false;
  const normalizedName = productName.trim().toLowerCase();
  return plants.some(plant => {
    const sameName = (plant.name || '').trim().toLowerCase() === normalizedName;
    const sameId = String(plant.id) === String(currentId ?? '');
    return sameName && !sameId;
  });
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
 * Genera un precio de venta sugerido basado en el precio de compra
 * @param {number} basePrice - Precio de compra (basePrice en tu modelo)
 * @param {number} markup - Margen de ganancia (por defecto 2.5x)
 * @returns {number} - Precio de venta sugerido (purchasePrice en tu modelo)
 */
export const suggestBasePrice = (basePrice, markup = 2.5) => {
  const price = parseFloat(basePrice) || 0;
  return Math.round(price * markup);
};

/**
 * Valida los datos de un producto antes de crear
 * @param {Object} productData - Datos a validar
 * @returns {Object} - { isValid: boolean, errors: string[] }
 */
export const validateProductData = (productData) => {
  const errors = [];
  // Normalizar a números para evitar comparaciones lexicográficas entre strings
  const base = productData.basePrice !== undefined && productData.basePrice !== ''
    ? parseFloat(productData.basePrice)
    : 0;
  const sale = productData.purchasePrice !== undefined && productData.purchasePrice !== ''
    ? parseFloat(productData.purchasePrice)
    : 0;
  
  if (!productData.name || !productData.name.trim()) {
    errors.push('El nombre del producto es obligatorio');
  }
  
  if (productData.name && productData.name.trim().length < 2) {
    errors.push('El nombre debe tener al menos 2 caracteres');
  }
  
  if (!isNaN(base) && base < 0) {
    errors.push('El precio de compra no puede ser negativo');
  }
  
  if (!isNaN(sale) && sale < 0) {
    errors.push('El precio de venta no puede ser negativo');
  }
  
  // Validar que el precio de venta sea mayor al precio de compra
  if (!isNaN(base) && base > 0 && !isNaN(sale) && sale > 0) {
    if (sale <= base) {
      errors.push('El precio de venta debe ser mayor al precio de compra para obtener ganancia');
    }
  }
  
  const stockVal = productData.stock !== undefined && productData.stock !== ''
    ? parseInt(productData.stock)
    : 0;
  if (!isNaN(stockVal) && stockVal < 0) {
    errors.push('El stock no puede ser negativo');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Actualiza el precio de compra de un producto y mantiene historial
 * @param {string} productId - ID del producto
 * @param {number} newBasePrice - Nuevo precio de compra (basePrice en tu modelo)
 * @param {number} quantity - Cantidad comprada
 * @returns {Promise<boolean>} - true si se actualizó correctamente
 */
export const updateProductPurchasePrice = async (productId, newBasePrice, quantity = 1) => {
  try {
    const productRef = doc(db, 'producto', String(productId));
    const productSnap = await getDoc(productRef);
    
    if (!productSnap.exists()) {
      console.warn('Producto no encontrado para actualizar precio:', productId);
      return false;
    }
    
  const currentData = productSnap.data();
  const currentHistory = currentData.purchaseHistory || [];
  const currentPrice = parseFloat(newBasePrice);
    
    // Validar precio
    if (isNaN(currentPrice) || currentPrice < 0) {
      console.warn('Precio de compra inválido:', newBasePrice);
      return false;
    }
    
    // Crear entrada de historial
    const historyEntry = {
      price: currentPrice,
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
      quantity: parseInt(quantity) || 1,
      timestamp: new Date()
    };
    
    // Agregar al historial (mantener últimas 10 entradas)
    const updatedHistory = [...currentHistory, historyEntry].slice(-10);

    // Calcular nuevo basePrice:
    // - Si había stock previo, usar promedio ponderado (stock previo + compra actual)
    // - Si no había stock previo, usar directamente el precio de esta compra
    const addedQty = parseInt(quantity) || 1;
    const currentStockOnDoc = parseInt(currentData.stock) || 0; // OJO: ya incluye la compra (stock actualizado previamente)
    const previousStock = Math.max(0, currentStockOnDoc - addedQty);
    const previousBase = parseFloat(currentData.basePrice) || 0;
    let nextBasePrice = currentPrice;
    if (previousStock > 0) {
      const totalCost = previousStock * previousBase + addedQty * currentPrice;
      const totalQty = previousStock + addedQty;
      nextBasePrice = totalQty > 0 ? +(totalCost / totalQty).toFixed(2) : currentPrice;
    }
    
    // Actualizar documento
    await updateDoc(productRef, {
      basePrice: nextBasePrice, // basePrice es el costo promedio ponderado si había stock previo, o el último precio si no
      lastPurchaseDate: historyEntry.date,
      purchaseHistory: updatedHistory,
      updatedAt: new Date()
    });
    
    console.log('✓ Precio de compra actualizado:', currentData.name, `$${nextBasePrice}`);
    return true;
    
  } catch (error) {
    console.error('Error actualizando precio de compra:', error);
    return false;
  }
};

/**
 * Obtiene el historial de precios de compra de un producto
 * @param {string} productId - ID del producto
 * @returns {Promise<Array>} - Historial de compras
 */
export const getProductPurchaseHistory = async (productId) => {
  try {
    const productRef = doc(db, 'producto', String(productId));
    const productSnap = await getDoc(productRef);
    
    if (!productSnap.exists()) {
      return [];
    }
    
    const data = productSnap.data();
    return data.purchaseHistory || [];
    
  } catch (error) {
    console.error('Error obteniendo historial de compras:', error);
    return [];
  }
};

/**
 * Calcula estadísticas del historial de compras
 * @param {Array} history - Historial de compras
 * @returns {Object} - Estadísticas
 */
export const calculatePurchaseStats = (history) => {
  if (!history || history.length === 0) {
    return {
      averagePrice: 0,
      minPrice: 0,
      maxPrice: 0,
      totalQuantity: 0,
      totalPurchases: 0
    };
  }
  
  const prices = history.map(h => h.price);
  const quantities = history.map(h => h.quantity || 1);
  
  return {
    averagePrice: prices.reduce((sum, price) => sum + price, 0) / prices.length,
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices),
    totalQuantity: quantities.reduce((sum, qty) => sum + qty, 0),
    totalPurchases: history.length
  };
};
