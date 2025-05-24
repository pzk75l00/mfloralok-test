import React, { useState } from 'react';

const CargaMovilView = ({ plants, onQuickAddStock, onQuickSale, onQuickMovement }) => {
  const [mode, setMode] = useState(null); // null, 'plant', 'caja'
  // --- PLANTAS ---
  const [search, setSearch] = useState('');
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [amount, setAmount] = useState(1);
  const [plantMode, setPlantMode] = useState('stock'); // 'stock' o 'venta'
  // --- CAJA ---
  const [movement, setMovement] = useState({
    type: 'ingreso',
    detail: '',
    total: '',
    paymentMethod: 'efectivo',
  });

  // --- PLANTAS ---
  const filteredPlants = plants.filter(plant =>
    plant.name.toLowerCase().includes(search.toLowerCase())
  );
  const handleSelect = (plant) => {
    setSelectedPlant(plant);
    setAmount(1);
  };
  const handlePlantSubmit = (e) => {
    e.preventDefault();
    if (!selectedPlant) return;
    if (plantMode === 'stock') {
      onQuickAddStock(selectedPlant, amount);
    } else {
      onQuickSale(selectedPlant, amount);
    }
    setSelectedPlant(null);
    setAmount(1);
  };

  // --- CAJA ---
  const handleMovementChange = e => {
    const { name, value } = e.target;
    setMovement(m => ({ ...m, [name]: value }));
  };
  const handleMovementSubmit = e => {
    e.preventDefault();
    if (!movement.total || isNaN(Number(movement.total))) return;
    onQuickMovement({ ...movement, total: Number(movement.total) });
    setMovement({ type: 'ingreso', detail: '', total: '', paymentMethod: 'efectivo' });
  };

  if (!mode) {
    return (
      <div className="p-4 space-y-6">
        <h2 className="text-xl font-bold text-green-700 mb-4">Carga Móvil</h2>
        <button className="w-full py-6 bg-blue-600 text-white rounded-lg text-xl font-semibold mb-4" onClick={() => setMode('caja')}>Carga de Caja</button>
        <button className="w-full py-6 bg-green-600 text-white rounded-lg text-xl font-semibold" onClick={() => setMode('plant')}>Carga de Plantas</button>
      </div>
    );
  }

  if (mode === 'caja') {
    return (
      <div className="p-4 space-y-4">
        <button className="mb-2 text-blue-600 underline" onClick={() => setMode(null)}>← Volver</button>
        <h2 className="text-lg font-bold mb-2">Carga rápida de Caja</h2>
        <form onSubmit={handleMovementSubmit} className="space-y-4">
          <select name="type" value={movement.type} onChange={handleMovementChange} className="w-full border rounded p-2">
            <option value="ingreso">Ingreso</option>
            <option value="egreso">Egreso</option>
            <option value="venta">Venta</option>
            <option value="compra">Compra</option>
          </select>
          <input name="detail" value={movement.detail} onChange={handleMovementChange} className="w-full border rounded p-2" placeholder="Detalle" />
          <input name="total" type="number" min="0" value={movement.total} onChange={handleMovementChange} className="w-full border rounded p-2" placeholder="Monto" required />
          <select name="paymentMethod" value={movement.paymentMethod} onChange={handleMovementChange} className="w-full border rounded p-2">
            <option value="efectivo">Efectivo</option>
            <option value="mercadoPago">Mercado Pago</option>
          </select>
          <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-lg text-lg font-semibold">Registrar</button>
        </form>
      </div>
    );
  }

  // --- PLANTAS ---
  return (
    <div className="p-4 space-y-4">
      <button className="mb-2 text-blue-600 underline" onClick={() => setMode(null)}>← Volver</button>
      <h2 className="text-lg font-bold mb-2">Carga rápida de Plantas</h2>
      <input
        type="text"
        placeholder="Buscar planta..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-lg mb-2"
      />
      {!selectedPlant ? (
        <div className="space-y-2">
          {filteredPlants.slice(0, 10).map(plant => (
            <button
              key={plant.id}
              className="w-full text-left bg-white border rounded-lg p-3 shadow hover:bg-green-50 text-lg flex justify-between items-center"
              onClick={() => handleSelect(plant)}
            >
              <span>{plant.name}</span>
              <span className="text-gray-500 text-base">Stock: {plant.stock}</span>
            </button>
          ))}
          {filteredPlants.length === 0 && <div className="text-gray-400 text-center">No hay resultados</div>}
        </div>
      ) : (
        <form onSubmit={handlePlantSubmit} className="space-y-4">
          <div className="text-lg font-semibold">{selectedPlant.name} (Stock: {selectedPlant.stock})</div>
          <div className="flex gap-2">
            <button type="button" className={`flex-1 py-2 rounded ${plantMode==='stock' ? 'bg-green-600 text-white' : 'bg-gray-200'}`} onClick={() => setPlantMode('stock')}>Agregar Stock</button>
            <button type="button" className={`flex-1 py-2 rounded ${plantMode==='venta' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`} onClick={() => setPlantMode('venta')}>Registrar Venta</button>
          </div>
          <input
            type="number"
            min="1"
            value={amount}
            onChange={e => setAmount(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-lg"
            required
          />
          <div className="flex gap-2">
            <button type="button" className="flex-1 py-2 rounded bg-gray-300 text-gray-800" onClick={() => setSelectedPlant(null)}>Cancelar</button>
            <button type="submit" className="flex-1 py-2 rounded bg-green-600 text-white">Confirmar</button>
          </div>
        </form>
      )}
    </div>
  );
};

export default CargaMovilView;
