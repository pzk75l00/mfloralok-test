import React, { useState } from 'react';

const CargaMovilView = ({ plants, onQuickAddStock, onQuickSale }) => {
  const [search, setSearch] = useState('');
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [amount, setAmount] = useState(1);
  const [mode, setMode] = useState('stock'); // 'stock' o 'venta'

  const filteredPlants = plants.filter(plant =>
    plant.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (plant) => {
    setSelectedPlant(plant);
    setAmount(1);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedPlant) return;
    if (mode === 'stock') {
      onQuickAddStock(selectedPlant, amount);
    } else {
      onQuickSale(selectedPlant, amount);
    }
    setSelectedPlant(null);
    setAmount(1);
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold text-green-700 mb-2">Carga Móvil</h2>
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-lg font-semibold">{selectedPlant.name} (Stock: {selectedPlant.stock})</div>
          <div className="flex gap-2">
            <button type="button" className={`flex-1 py-2 rounded ${mode==='stock' ? 'bg-green-600 text-white' : 'bg-gray-200'}`} onClick={() => setMode('stock')}>Agregar Stock</button>
            <button type="button" className={`flex-1 py-2 rounded ${mode==='venta' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`} onClick={() => setMode('venta')}>Registrar Venta</button>
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
