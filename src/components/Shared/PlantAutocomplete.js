// Autocompletado de productos para formularios con opción de crear nuevos
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { productExists, findSimilarProducts } from '../../utils/productManagement';
import NewProductModal from './NewProductModal';

const PlantAutocomplete = ({ 
  plants, 
  value, 
  onChange, 
  placeholder, 
  onProductsUpdated,
  allowCreateNew = true 
}) => {
  const [input, setInput] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const filtered = plants.filter(p =>
    p.name.toLowerCase().includes(input.toLowerCase())
  );
  
  // Detectar si el texto actual no existe en productos
  const inputExists = productExists(plants, input);
  const showCreateOption = allowCreateNew && input.trim().length >= 2 && !inputExists;
  
  // Sugerencias de productos similares
  const similar = showCreateOption ? findSimilarProducts(plants, input) : [];

  const handleSelect = (p) => {
    onChange(p.id);
    setInput(''); // Limpiar el input después de seleccionar
  };

  const handleCreateNew = () => {
    setShowCreateModal(true);
  };

  const handleProductCreated = (newProduct) => {
    // Agregar el nuevo producto a la lista local
    const updatedPlants = [...plants, newProduct];
    
    // Notificar al componente padre para actualizar la lista
    if (onProductsUpdated) {
      onProductsUpdated(updatedPlants);
    }
    
    // Seleccionar automáticamente el nuevo producto
    onChange(newProduct.id);
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
        <div className="border rounded bg-white max-h-40 overflow-y-auto shadow-lg">
          {/* Productos encontrados */}
          {filtered.map(p => (
            <div
              key={p.id}
              className={`px-3 py-2 cursor-pointer hover:bg-blue-100 ${value === p.id ? 'bg-blue-200' : ''} border-b border-gray-100 last:border-b-0`}
              onClick={() => handleSelect(p)}
            >
              <div className="font-medium">{p.name}</div>
              <div className="text-xs text-gray-500">
                Stock: {p.stock || 0} | Precio: ${p.basePrice || 0}
              </div>
            </div>
          ))}
          
          {/* Opción crear nuevo producto */}
          {showCreateOption && (
            <>
              {filtered.length > 0 && <div className="border-t border-gray-200"></div>}
              <div 
                className="px-3 py-2 cursor-pointer hover:bg-green-50 bg-green-25 border-l-4 border-green-400"
                onClick={handleCreateNew}
              >
                <div className="flex items-center">
                  <span className="text-green-600 mr-2">+</span>
                  <div>
                    <div className="font-medium text-green-700">
                      Crear &quot;{input}&quot;
                    </div>
                    <div className="text-xs text-green-600">
                      Agregar este producto al catálogo
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
          
          {/* Sugerencias de productos similares */}
          {showCreateOption && similar.length > 0 && (
            <>
              <div className="border-t border-gray-200"></div>
              <div className="px-3 py-1 bg-gray-50 text-xs text-gray-600 font-medium">
                ¿Buscabas alguno de estos?
              </div>
              {similar.map(p => (
                <div
                  key={`similar-${p.id}`}
                  className="px-3 py-1 cursor-pointer hover:bg-blue-50 text-sm"
                  onClick={() => handleSelect(p)}
                >
                  <span className="text-blue-600">{p.name}</span>
                </div>
              ))}
            </>
          )}
          
          {/* Sin resultados */}
          {filtered.length === 0 && !showCreateOption && (
            <div className="px-3 py-2 text-gray-400 text-center">
              Sin resultados
            </div>
          )}
        </div>
      )}
      
      {/* Modal para crear nuevo producto */}
      <NewProductModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onProductCreated={handleProductCreated}
        initialProductName={input.trim()}
      />
    </div>
  );
};

PlantAutocomplete.propTypes = {
  plants: PropTypes.array.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  onProductsUpdated: PropTypes.func,
  allowCreateNew: PropTypes.bool,
};

export default PlantAutocomplete;
