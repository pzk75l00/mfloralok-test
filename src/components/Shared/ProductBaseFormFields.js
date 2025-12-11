// Componente reutilizable con campos base para crear/editar productos
// Se usa en NewProductModal (caja) e InventoryView (inventario)
// SIN imagen, SIN fecha, SIN proveedor (estos son opcionales y van fuera)
import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import SmartInput from './SmartInput';
import { suggestBasePrice } from '../../utils/productManagement';

const ProductBaseFormFields = ({
  formData,
  onChange,
  productTypes = [],
  onShowTypesManager,
  disabled = false,
  context = 'general', // 'general' o 'purchase' para cambiar labels
  showStock = true,
  autoCalculatePrice = true
}) => {
  // Auto-calcular precio de venta cuando cambia precio de compra
  useEffect(() => {
    if (autoCalculatePrice && formData.basePrice && !isNaN(formData.basePrice)) {
      const suggested = suggestBasePrice(formData.basePrice);
      onChange({ target: { name: 'purchasePrice', value: suggested.toString() } });
    }
  }, [formData.basePrice, autoCalculatePrice, onChange]);

  const handleChange = (e) => {
    onChange(e);
  };

  return (
    <div className="space-y-4">
      {/* Nombre del producto */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nombre del producto *
        </label>
        <input
          type="text"
          name="name"
          value={formData.name || ''}
          onChange={handleChange}
          disabled={disabled}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="Ej: Potus Variegado"
          required
        />
      </div>

      {/* Fila 1: Tipo + Uso Interno */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Tipo de producto *
            </label>
            {onShowTypesManager && (
              <button
                type="button"
                onClick={onShowTypesManager}
                disabled={disabled}
                className="text-[11px] text-green-700 underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Gestionar tipos
              </button>
            )}
          </div>
          <select
            name="productType"
            value={formData.productType || ''}
            onChange={handleChange}
            disabled={disabled}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            required
          >
            <option value="">Seleccionar...</option>
            {productTypes.map(t => (
              <option key={t.id} value={t.name}>{t.name}</option>
            ))}
            {productTypes.length === 0 && (
              <option value="" disabled>No hay tipos configurados</option>
            )}
          </select>
        </div>

        {/* Checkbox Es Insumo */}
        <div className="flex items-center pt-2 md:pt-8">
          <input
            type="checkbox"
            id="isInsumo"
            name="isInsumo"
            checked={formData.isInsumo || false}
            onChange={(e) => handleChange({ target: { name: 'isInsumo', value: e.target.checked } })}
            disabled={disabled}
            className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <label htmlFor="isInsumo" className="ml-2 block text-sm text-gray-700">
            Es para uso interno (no se vende)
          </label>
        </div>

        {/* Stock */}
        {showStock && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {context === 'purchase' ? 'Cantidad a comprar *' : 'Stock inicial *'}
            </label>
            <SmartInput
              name="stock"
              variant="stock"
              value={formData.stock || ''}
              onChange={handleChange}
              disabled={disabled}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="0"
              required
            />
          </div>
        )}
      </div>

      {/* Fila 2: Precio Compra + Precio Venta */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Precio Compra *
          </label>
          <SmartInput
            name="basePrice"
            variant="price"
            value={formData.basePrice || ''}
            onChange={handleChange}
            disabled={disabled}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="0"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Precio Venta {autoCalculatePrice ? 'sugerido' : ''} *
          </label>
          <SmartInput
            name="purchasePrice"
            variant="price"
            value={formData.purchasePrice || ''}
            onChange={handleChange}
            disabled={disabled}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="0"
            required
          />
        </div>
      </div>
    </div>
  );
};

ProductBaseFormFields.propTypes = {
  formData: PropTypes.shape({
    name: PropTypes.string,
    productType: PropTypes.string,
    isInsumo: PropTypes.bool,
    type: PropTypes.string,
    stock: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    basePrice: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    purchasePrice: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  productTypes: PropTypes.array,
  onShowTypesManager: PropTypes.func,
  disabled: PropTypes.bool,
  context: PropTypes.oneOf(['general', 'purchase']),
  showStock: PropTypes.bool,
  autoCalculatePrice: PropTypes.bool
};

export default ProductBaseFormFields;
