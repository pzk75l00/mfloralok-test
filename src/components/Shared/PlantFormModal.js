import React, { useState } from 'react';
import PropTypes from 'prop-types';
import SmartInput from './SmartInput';

const PlantFormModal = ({ initialName, onCreate, onClose }) => {
  const [name, setName] = useState(initialName || '');
  const [type, setType] = useState('Otros');
  const [price, setPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [supplier, setSupplier] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation && e.stopPropagation();
    if (!name.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    if (!price || isNaN(price) || Number(price) <= 0) {
      setError('El precio de compra debe ser mayor a 0');
      return;
    }
    if (!salePrice || isNaN(salePrice) || Number(salePrice) <= 0) {
      setError('El precio de venta debe ser mayor a 0');
      return;
    }
    if (!quantity || isNaN(quantity) || Number(quantity) <= 0) {
      setError('La cantidad inicial debe ser mayor a 0');
      return;
    }
    onCreate({ name: name.trim(), type, price: Number(price), salePrice: Number(salePrice), quantity: Number(quantity), supplier: supplier.trim() });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded shadow-lg p-6 w-full max-w-xs relative">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-red-500">&times;</button>
        <h2 className="text-lg font-bold mb-4">Agregar nuevo producto</h2>
        <div autoComplete="off">
          <label className="block text-sm mb-1">Nombre</label>
          <input className="border rounded px-2 py-1 mb-2 w-full" value={name} onChange={e => setName(e.target.value)} autoFocus autoComplete="off" />
          <label className="block text-sm mb-1">Tipo</label>
          <input className="border rounded px-2 py-1 mb-2 w-full" value={type} onChange={e => setType(e.target.value)} autoComplete="off" />
          <label className="block text-sm mb-1">Cantidad inicial</label>
          <SmartInput 
            variant="quantity" 
            value={quantity} 
            onChange={e => setQuantity(e.target.value)} 
            className="border rounded px-2 py-1 mb-2 w-full" 
            autoComplete="off" 
          />
          <label className="block text-sm mb-1">Precio de compra</label>
          <SmartInput 
            variant="price" 
            value={price} 
            onChange={e => setPrice(e.target.value)} 
            className="border rounded px-2 py-1 mb-2 w-full" 
            autoComplete="off" 
          />
          <label className="block text-sm mb-1">Precio de venta</label>
          <SmartInput 
            variant="price" 
            value={salePrice} 
            onChange={e => setSalePrice(e.target.value)} 
            className="border rounded px-2 py-1 mb-2 w-full" 
            autoComplete="off" 
          />
          <label className="block text-sm mb-1">Proveedor</label>
          <input className="border rounded px-2 py-1 mb-2 w-full" value={supplier} onChange={e => setSupplier(e.target.value)} autoComplete="off" />
          {error && <div className="text-red-500 text-xs mb-2">{error}</div>}
          <button
            className="bg-green-600 text-white rounded px-4 py-2 font-bold w-full"
            onClick={handleSubmit}
          >Crear producto</button>
        </div>
      </div>
    </div>
  );
};

PlantFormModal.propTypes = {
  initialName: PropTypes.string,
  onCreate: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default PlantFormModal;
