import React, { useState } from 'react';
import PlantAutocomplete from './PlantAutocomplete';

const PurchasesForm = ({ plants, onCompletePurchase }) => {
  const [form, setForm] = useState({
    plantId: '',
    quantity: 1,
    purchasePrice: '',
    paymentMethod: 'efectivo',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.plantId || !form.quantity || !form.purchasePrice) return;
    // Ajustar fecha a hora local de Argentina (UTC-3)
    let localDate = form.date ? new Date(form.date) : new Date();
    const offset = -3 * 60; // minutos
    const tzDate = new Date(localDate.getTime() - (localDate.getTimezoneOffset() - offset) * 60000);
    const isoArgentina = tzDate.toISOString().slice(0, 19) + '-03:00';
    onCompletePurchase({
      ...form,
      plantId: isNaN(Number(form.plantId)) ? form.plantId : Number(form.plantId),
      quantity: Number(form.quantity),
      purchasePrice: Number(form.purchasePrice),
      paymentMethod: form.paymentMethod,
      date: isoArgentina,
    });
    setForm({ plantId: '', quantity: 1, purchasePrice: '', paymentMethod: 'efectivo' });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        {/* Reemplazo: input+select sincronizados */}
        <PlantAutocomplete
          plants={plants}
          value={form.plantId}
          onChange={val => setForm(f => ({ ...f, plantId: val }))}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Cantidad</label>
          <input
            type="number"
            name="quantity"
            min="1"
            value={form.quantity}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Precio de compra</label>
          <input
            type="number"
            name="purchasePrice"
            min="0"
            step="0.01"
            value={form.purchasePrice}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            required
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Método de Pago</label>
        <select
          name="paymentMethod"
          value={form.paymentMethod}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
        >
          <option value="efectivo">Efectivo (E)</option>
          <option value="mercadoPago">Mercado Pago (MP)</option>
        </select>
      </div>
      <button
        type="submit"
        className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 transition"
      >
        Registrar compra
      </button>
    </form>
  );
};

export default PurchasesForm;