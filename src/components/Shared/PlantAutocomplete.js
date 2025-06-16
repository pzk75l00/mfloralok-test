// Autocompletado de productos para formularios
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import PlantFormModal from './PlantFormModal'; // Asegúrate de importar el modal

const PlantAutocomplete = ({ plants, value, onChange, placeholder }) => {
  const [input, setInput] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [pendingName, setPendingName] = useState('');
  const filtered = plants.filter(p =>
    p.name.toLowerCase().includes(input.toLowerCase())
  );

  const handleSelect = (p) => {
    onChange(p.id);
    setInput('');
  };

  const handleAddNew = () => {
    setShowModal(true);
    setPendingName(input);
  };

  const handleCreate = (plant) => {
    // Emitir el nuevo producto al padre
    onChange({ newPlant: plant });
    setShowModal(false);
    setInput('');
  };

  return (
    <div className="mb-2">
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder={placeholder || 'Buscar producto...'}
        className="border rounded px-2 py-1 w-full mb-1"
      />
      {input && (
        <div className="border rounded bg-white max-h-32 overflow-y-auto">
          {filtered.map(p => (
            <div
              key={p.id}
              className={`px-2 py-1 cursor-pointer hover:bg-blue-100 ${value === p.id ? 'bg-blue-200' : ''}`}
              onClick={() => handleSelect(p)}
            >
              {p.name}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-2 py-1 text-gray-400 flex justify-between items-center">
              Sin resultados
              <button className="ml-2 text-blue-600 underline text-xs" onClick={handleAddNew} type="button">Agregar &quot;{input}&quot;</button>
            </div>
          )}
        </div>
      )}
      {showModal && (
        <PlantFormModal initialName={pendingName} onCreate={handleCreate} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
};

PlantAutocomplete.propTypes = {
  plants: PropTypes.array.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
};

export default PlantAutocomplete;
