import React, { useState } from 'react';

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
    onCompletePurchase({
      ...form,
      plantId: isNaN(Number(form.plantId)) ? form.plantId : Number(form.plantId),
      quantity: Number(form.quantity),
      purchasePrice: Number(form.purchasePrice),
      paymentMethod: form.paymentMethod,
      date: new Date().toISOString(),
    });
    setForm({ plantId: '', quantity: 1, purchasePrice: '', paymentMethod: 'efectivo' });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Planta</label>
        <select
          name="plantId"
          value={form.plantId}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          required
        >
          <option value="">Selecciona una planta</option>
          {plants.slice().sort((a, b) => a.name.localeCompare(b.name)).map((plant) => (
            <option key={plant.id} value={plant.id}>{plant.name}</option>
          ))}
        </select>
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