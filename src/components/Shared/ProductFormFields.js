// Campos reutilizables para formularios de productos (ventas/caja) con soporte para crear nuevos
import React from 'react';
import PropTypes from 'prop-types';
import PlantAutocomplete from './PlantAutocomplete';

const ProductFormFields = ({ 
  productForm, 
  plants, 
  handleProductFormChange, 
  onProductsUpdated 
}) => {
  const selectedPlant = plants.find(p => String(p.id) === String(productForm.plantId));
  
  return (
    <>
      <label className="text-xs font-semibold">Producto</label>
      <PlantAutocomplete
        plants={plants}
        value={productForm.plantId}
        onChange={id => handleProductFormChange({ target: { name: 'plantId', value: id } })}
        placeholder="Buscar o crear producto..."
        onProductsUpdated={onProductsUpdated}
        allowCreateNew={true}
      />
      {selectedPlant && (
        <div className="text-xs text-gray-500 mb-2">
          <div><b>Stock disponible:</b> {selectedPlant.stock ?? 0}</div>
          <div><b>Tipo:</b> {selectedPlant.type === 'insumo' ? 'Insumo (uso interno)' : 'Producto (para venta)'}</div>
          {selectedPlant.purchasePrice && (
            <div><b>Último precio de compra:</b> ${selectedPlant.purchasePrice}</div>
          )}
          {selectedPlant.lastPurchaseDate && (
            <div><b>Última compra:</b> {selectedPlant.lastPurchaseDate}</div>
          )}
        </div>
      )}
      <input
        type="number"
        name="quantity"
        min="1"
        value={productForm.quantity}
        onChange={handleProductFormChange}
        className="border rounded px-2 py-1 mb-2 w-full"
        placeholder="Cantidad"
      />
      <input
        type="number"
        name="price"
        min="0"
        value={productForm.price}
        onChange={handleProductFormChange}
        className="border rounded px-2 py-1 mb-2 w-full"
        placeholder="Precio"
      />
    </>
  );
};

ProductFormFields.propTypes = {
  productForm: PropTypes.object.isRequired,
  plants: PropTypes.array.isRequired,
  handleProductFormChange: PropTypes.func.isRequired,
  onProductsUpdated: PropTypes.func,
};

export default ProductFormFields;
