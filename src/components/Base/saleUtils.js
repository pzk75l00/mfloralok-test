// Funciones utilitarias para registrar ventas y movimientos de caja de forma consistente
import { collection, addDoc, getDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';

/**
 * Registra una venta en sales y movements, y valida stock.
 * @param {Object} params - Datos de la venta
 * @param {number} params.plantId
 * @param {number} params.quantity
 * @param {number} params.price
 * @param {string} params.paymentMethod
 * @param {string} params.date - ISO string
 * @param {string} params.location
 * @param {string} params.notes
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
export async function registrarVenta({ plantId, quantity, price, paymentMethod, date, location, notes }) {
  // Validar stock
  const plantRef = doc(db, 'producto', String(plantId));
  const plantSnap = await getDoc(plantRef);
  if (!plantSnap.exists()) {
    return { ok: false, error: 'Planta no encontrada' };
  }
  const plant = plantSnap.data();
  if (Number(quantity) > Number(plant.stock)) {
    return { ok: false, error: 'Stock insuficiente' };
  }
  // Usar los valores tal cual los ingresa el usuario
  const qty = Number(quantity);
  const unitPrice = Number(price);
  const total = Number((qty * unitPrice).toFixed(2)); // Solo forzar dos decimales si hay decimales

  // Registrar en sales
  const saleData = {
    plantId: Number(plantId),
    quantity: qty,
    salePrice: unitPrice, // Valor exacto ingresado
    paymentMethod,
    date,
    location,
    notes,
    total: total // Valor exacto calculado
  };
  await addDoc(collection(db, 'sales'), saleData);
  // Registrar en movements
  const movementData = {
    type: 'venta',
    detail: plant.name,
    plantId: Number(plantId),
    quantity: qty,
    price: unitPrice, // Valor exacto ingresado
    total: total, // Valor exacto calculado
    paymentMethod,
    date,
    location,
    notes
  };
  await addDoc(collection(db, 'movements'), movementData);
  // Actualizar stock en plants
  await updateDoc(plantRef, { stock: Number(plant.stock) - qty });
  return { ok: true };
}
