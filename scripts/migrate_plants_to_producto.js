
require('dotenv').config();
// Script de migración: copia todos los docs de 'plants' a 'producto' con doc.id numérico consecutivo
// Uso: node scripts/migrate_plants_to_producto.js

const { db } = require('../src/firebase/admin');

async function migrate() {
  const plantsSnap = await db.collection('plants').get();
  const plants = plantsSnap.docs.map(d => ({ oldId: d.id, ...d.data() }));

  // Ordenar por campo 'id' si existe y es numérico, si no por name
  plants.sort((a, b) => {
    if (typeof a.id === 'number' && typeof b.id === 'number') return a.id - b.id;
    return String(a.name || '').localeCompare(String(b.name || ''));
  });

  let nextId = 1;
  const mapping = [];
  for (const plant of plants) {
    const newId = String(nextId).padStart(7, '0');
    const newDoc = { ...plant, id: nextId };
    delete newDoc.oldId;
    await db.collection('producto').doc(newId).set(newDoc);
    mapping.push({ oldId: plant.oldId, newId });
    nextId++;
  }

  // Guardar mapping para referencia
  await db.collection('migraciones').doc('plants_to_producto').set({ mapping, fecha: new Date() });
  console.log('Migración completa. Total:', plants.length);
}

migrate().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
