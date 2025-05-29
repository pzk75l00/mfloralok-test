import React, { useState, useEffect } from 'react';
import PlantAutocomplete from './PlantAutocomplete';
import { toZonedTime } from 'date-fns-tz';

// Helper: Convert 'YYYY-MM-DDTHH:mm' (local Argentina) to UTC ISO string
function argentinaLocalToUTCISOString(localDateTimeStr) {
  // Interpreta el string como hora de Argentina y lo convierte a UTC ISO
  // 1. Interpreta el string como si fuera en la zona de Argentina
  const zoned = toZonedTime(localDateTimeStr, 'America/Argentina/Buenos_Aires');
  // 2. Obtiene los componentes de la fecha en la zona
  const year = zoned.getFullYear();
  const month = zoned.getMonth();
  const day = zoned.getDate();
  const hour = zoned.getHours();
  const minute = zoned.getMinutes();
  // 3. Crea un Date en UTC con esos componentes
  const utcDate = new Date(Date.UTC(year, month, day, hour, minute));
  return utcDate.toISOString();
}

const getArgentinaNowForInput = () => {
  // Returns 'YYYY-MM-DDTHH:mm' for datetime-local input, in Argentina time
  const now = new Date();
  const argNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
  const yyyy = argNow.getFullYear();
  const mm = String(argNow.getMonth() + 1).padStart(2, '0');
  const dd = String(argNow.getDate()).padStart(2, '0');
  const hh = String(argNow.getHours()).padStart(2, '0');
  const min = String(argNow.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
};

const SalesForm = ({ plants, onCompleteSale }) => {
  const [saleData, setSaleData] = useState({
    plantId: '',
    quantity: 1,
    salePrice: '',
    paymentMethod: 'efectivo',
    date: getArgentinaNowForInput(),
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
      date // keep as 'YYYY-MM-DDTHH:mm'
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Convert local Argentina input to UTC ISO string
    const utcISOString = argentinaLocalToUTCISOString(saleData.date);
    onCompleteSale({
      ...saleData,
      plantId: Number(saleData.plantId),
      total: saleData.quantity * saleData.salePrice,
      date: utcISOString
    });
    setSaleData({
      plantId: '',
      quantity: 1,
      salePrice: '',
      paymentMethod: 'efectivo',
      date: getArgentinaNowForInput(),
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
                value={saleData.date}
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