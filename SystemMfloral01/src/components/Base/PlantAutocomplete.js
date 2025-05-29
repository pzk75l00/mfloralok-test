import React, { useState, useEffect, useRef } from 'react';

// Componente reutilizable de input+select sincronizados para plantas
const PlantAutocomplete = ({ plants, value, onChange, label = 'Planta', required = false, disabled = false }) => {
  const [inputValue, setInputValue] = useState('');
  const [filtered, setFiltered] = useState(plants);
  const selectRef = useRef();

  useEffect(() => {
    // Si value cambia desde fuera, actualizar inputValue
    const selected = plants.find(p => String(p.id) === String(value));
    setInputValue(selected ? selected.name : '');
  }, [value, plants]);

  useEffect(() => {
    if (inputValue === '') {
      setFiltered(plants);
    } else {
      setFiltered(
        plants.filter(p => p.name.toLowerCase().includes(inputValue.toLowerCase()))
      );
    }
  }, [inputValue, plants]);

  const handleInput = e => {
    setInputValue(e.target.value);
    // No cambiar value aún, solo filtrar
  };

  const handleSelect = e => {
    const val = e.target.value;
    onChange(val);
  };

  const handleSuggestionClick = (plant) => {
    setInputValue(plant.name);
    onChange(plant.id);
    // Opcional: enfocar el select
    selectRef.current && selectRef.current.focus();
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        type="text"
        value={inputValue}
        onChange={handleInput}
        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
        placeholder="Buscar planta..."
        disabled={disabled}
        autoComplete="off"
        required={required}
      />
      {/* Sugerencias tipo autocompletar */}
      {inputValue && filtered.length > 0 && (
        <ul className="border border-gray-200 rounded bg-white max-h-40 overflow-y-auto mt-1 absolute z-10 w-full">
          {filtered.slice(0, 8).map(plant => (
            <li
              key={plant.id}
              className="px-3 py-1 hover:bg-blue-100 cursor-pointer text-sm"
              onMouseDown={() => handleSuggestionClick(plant)}
            >
              {plant.name} (Stock: {plant.stock})
            </li>
          ))}
        </ul>
      )}
      {/* Select tradicional sincronizado */}
      <select
        ref={selectRef}
        className="mt-2 block w-full border border-gray-300 rounded-md shadow-sm p-2"
        value={value || ''}
        onChange={e => handleSelect(e)}
        required={required}
        disabled={disabled}
      >
        <option value="">Seleccionar planta</option>
        {filtered.map(plant => (
          <option key={plant.id} value={plant.id}>{plant.name} (Stock: {plant.stock})</option>
        ))}
      </select>
    </div>
  );
};

export default PlantAutocomplete;
