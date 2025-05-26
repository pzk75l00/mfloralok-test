import React, { useState, useEffect } from 'react';
import PlantAutocomplete from './PlantAutocomplete';

const SalesForm = ({ plants, onCompleteSale }) => {
  const [saleData, setSaleData] = useState({
    plantId: '',
    quantity: 1,
    salePrice: '',
    paymentMethod: 'efectivo',
    date: new Date().toISOString(),
    location: '',
    notes: ''
  });

  const [selectedPlant, setSelectedPlant] = useState(null);

  useEffect(() => {
    if (saleData.plantId) {
      const plant = plants.find(p => p.id === Number(saleData.plantId));
      setSelectedPlant(plant);
      setSaleData(prev => ({
        ...prev,
        salePrice: plant ? plant.basePrice : ''
      }));
    }
  }, [saleData.plantId, plants]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSaleData(prev => ({
      ...prev,
      [name]: name === 'quantity' || name === 'salePrice' ? Number(value) : value
    }));
  };

  const handleDateChange = (date) => {
    setSaleData(prev => ({
      ...prev,
      date: new Date(date).toISOString()
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Si el usuario selecciona una fecha (YYYY-MM-DD), forzar a medianoche de Argentina
    let dateStr = saleData.date;
    let dateArg;
    if (dateStr && dateStr.length === 10) { // Solo fecha, sin hora
      dateArg = new Date(dateStr + 'T00:00:00-03:00');
    } else if (dateStr && dateStr.length === 16) { // datetime-local (YYYY-MM-DDTHH:mm)
      dateArg = new Date(dateStr + ':00-03:00');
    } else {
      // Siempre usar la hora actual de Argentina
      const now = new Date();
      // Obtener la hora actual en Argentina (UTC-3)
      const argNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
      dateArg = argNow;
    }
    const isoArgentina = dateArg.toISOString().slice(0, 19) + '-03:00';
    onCompleteSale({
      ...saleData,
      plantId: Number(saleData.plantId),
      total: saleData.quantity * saleData.salePrice,
      date: isoArgentina
    });
    setSaleData({
      plantId: '',
      quantity: 1,
      salePrice: '',
      paymentMethod: 'efectivo',
      date: new Date().toISOString(),
      location: '',
      notes: ''
    });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Registrar Venta</h2>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Fecha</label>
              <input
                type="datetime-local"
                name="date"
                value={saleData.date.slice(0, 16)}
                onChange={(e) => handleDateChange(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Planta</label>
              {/* Reemplazo: input+select sincronizados */}
              <PlantAutocomplete
                plants={plants}
                value={saleData.plantId}
                onChange={val => setSaleData(prev => ({ ...prev, plantId: val }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Cantidad</label>
              <input
                type="number"
                name="quantity"
                min="1"
                max={selectedPlant?.stock || ''}
                value={saleData.quantity}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Precio Unitario</label>
              <input
                type="number"
                name="salePrice"
                value={saleData.salePrice}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Método de Pago</label>
              <select
                name="paymentMethod"
                value={saleData.paymentMethod}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              >
                <option value="efectivo">Efectivo (E)</option>
                <option value="mercadoPago">Mercado Pago (MP)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Lugar</label>
              <input
                type="text"
                name="location"
                value={saleData.location}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Observaciones</label>
            <textarea
              name="notes"
              value={saleData.notes}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              rows="2"
            />
          </div>

          <div className="pt-2">
            <p className="text-lg font-medium">
              Total: ${(saleData.quantity * saleData.salePrice).toFixed(2) || '0.00'}
            </p>
          </div>
        </div>
        <div className="mt-6">
          <button
            type="submit"
            className="w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
            disabled={!saleData.plantId}
          >
            Registrar Venta
          </button>
        </div>
      </form>
    </div>
  );
};

export default SalesForm;

// DONE