// Autocompletado de productos para formularios con opción de crear nuevos
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { isDuplicateProductName, findSimilarProducts } from '../../utils/productManagement';
import NewProductModal from './NewProductModal';

const PlantAutocomplete = ({ 
  plants, 
  value, 
  onChange, 
  placeholder, 
  onProductsUpdated,
  onCreateAndAdd,
  allowCreateNew = true,
  movementType = 'venta' // Nuevo prop para determinar qué precio mostrar
}) => {
  const [input, setInput] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const filtered = plants.filter(p =>
    p.name.toLowerCase().includes(input.toLowerCase())
  );
  
  // Detectar si el texto actual no existe en productos
  const inputExists = isDuplicateProductName(plants, input);
  const showCreateOption = allowCreateNew && input.trim().length >= 2 && !inputExists;
  
  // Sugerencias de productos similares
  const similar = showCreateOption ? findSimilarProducts(plants, input) : [];

  // Función para obtener el precio correcto según el tipo de movimiento
  const getDisplayPrice = (plant) => {
    if (movementType === 'compra') {
      return plant.basePrice || plant.purchasePrice || 0; // Para compras: basePrice (precio de compra)
    } else {
      return plant.purchasePrice || plant.basePrice || 0; // Para ventas: purchasePrice (precio de venta)
    }
  };

  const handleSelect = (p) => {
    onChange(p.id);
    setInput(''); // Limpiar el input después de seleccionar
  };

  const handleSelectChange = (e) => {
    const selectedId = e.target.value;
    if (selectedId) {
      onChange(selectedId);
      setInput(''); // Limpiar el autocomplete cuando se selecciona del dropdown
    }
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

    // Solicitar al padre que lo agregue automáticamente al movimiento actual (si corresponde)
    if (typeof onCreateAndAdd === 'function') {
      onCreateAndAdd(newProduct);
    }
  };

  // Obtener el producto seleccionado para mostrar información
  const selectedProduct = plants.find(p => String(p.id) === String(value));

  return (
    <div className="mb-2">
      {/* Autocomplete para búsqueda rápida */}
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder={placeholder || 'Buscar producto...'}
        className="border rounded px-2 py-1 w-full mb-2"
      />
      
      {/* Select tradicional para ver todos los productos */}
      <select 
        value={value || ''} 
        onChange={handleSelectChange}
        className="border rounded px-2 py-1 w-full mb-1"
      >
        <option value="">-- Seleccionar de la lista --</option>
        {plants.map(p => (
          <option key={p.id} value={p.id}>
            {p.name} | Stock: {p.stock || 0} | ${getDisplayPrice(p)}
          </option>
        ))}
      </select>
      
      {/* Información del producto seleccionado */}
      {selectedProduct && (
        <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded mb-2">
          <strong>Seleccionado:</strong> {selectedProduct.name}<br />
          <strong>Stock:</strong> {selectedProduct.stock || 0} | 
          <strong> Precio {movementType === 'compra' ? 'de compra' : 'de venta'}:</strong> ${getDisplayPrice(selectedProduct)} |
          <strong> Tipo:</strong> {selectedProduct.type === 'insumo' ? 'Insumo' : 'Producto'}
        </div>
      )}
      
      {/* Dropdown de resultados del autocomplete */}
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
                Stock: {p.stock || 0} | Precio: ${getDisplayPrice(p)}
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
        context={movementType === 'compra' ? 'purchase' : 'general'}
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
  onCreateAndAdd: PropTypes.func,
  allowCreateNew: PropTypes.bool,
  movementType: PropTypes.oneOf(['venta', 'compra']),
};

export default PlantAutocomplete;
