// Componente reutilizable con campos base para crear/editar productos
// Se usa en NewProductModal (caja) e InventoryView (inventario)
// SIN imagen, SIN fecha, SIN proveedor (estos son opcionales y van fuera)
import React, { useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import SmartInput from './SmartInput';
import { suggestBasePrice } from '../../utils/productManagement';

const ProductBaseFormFields = ({
  formData,
  onChange,
  productTypes = [],
  onShowTypesManager,
  disabled = false,
  context = 'general',
  showStock = true,
  autoCalculatePrice = true,
  layout = 'stack'
}) => {
  const handlePriceChange = useCallback(() => {
    if (autoCalculatePrice && formData.basePrice && !isNaN(formData.basePrice)) {
      const suggested = suggestBasePrice(formData.basePrice);
      onChange({ target: { name: 'purchasePrice', value: suggested.toString() } });
    }
  }, [autoCalculatePrice, formData.basePrice, onChange]);

  useEffect(() => {
    handlePriceChange();
  }, [formData.basePrice, autoCalculatePrice]);
  const handleChange = (e) => {
    onChange(e);
  };

  // Modo inline: una sola fila (cada celda con label+input compacto)
  if (layout === 'inline') {
    return (
      <>
        {/* Nombre: 2 col */}
        <div className="col-span-2">
          <label className="block text-[11px] font-semibold text-gray-700">Nombre</label>
          <input
            type="text"
            name="name"
            value={formData.name || ''}
            onChange={onChange}
            disabled={disabled}
            className="w-full h-[26px] border border-gray-300 rounded px-1.5 py-0.5 text-[11px]"
            placeholder="Ej: Potus"
            required
          />
        </div>

        {/* Tipo: 1 col */}
        <div className="col-span-1">
          <div className="flex items-center justify-between gap-0.5 mb-0.5">
            <label className="block text-[11px] font-semibold text-gray-700">Tipo</label>
            {onShowTypesManager && (
              <button
                type="button"
                onClick={onShowTypesManager}
                disabled={disabled}
                className="text-[9px] text-green-700 underline whitespace-nowrap hover:text-green-800 flex-shrink-0"
                title="Gestionar"
              >
                Gestionar
              </button>
            )}
          </div>
          <div className="flex items-center h-[26px] relative">
            <select
              name="productType"
              value={formData.productType || ''}
              onChange={onChange}
              disabled={disabled}
              className="w-full h-[26px] border border-gray-300 rounded px-1.5 py-0.5 text-[11px] leading-none"
              required
            >
              <option value="">Seleccionar...</option>
              {productTypes.map(t => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Stock: 1 col */}
        {showStock && (
          <div className="col-span-1">
            <label className="block text-[11px] font-semibold text-gray-700">Stock</label>
            <SmartInput
              name="stock"
              variant="stock"
              value={formData.stock || ''}
              onChange={onChange}
              disabled={disabled}
              className="w-full h-[26px] border border-gray-300 rounded px-1.5 py-0.5 text-[11px]"
              placeholder="0"
              required
            />
          </div>
        )}

        {/* Precio Compra: 1 col */}
        <div className="col-span-1">
          <label className="block text-[11px] font-semibold text-gray-700">Precio Compra</label>
          <SmartInput
            name="basePrice"
            variant="price"
            value={formData.basePrice || ''}
            onChange={onChange}
            disabled={disabled}
            className="w-full h-[26px] border border-gray-300 rounded px-1.5 py-0.5 text-[11px]"
            placeholder="0"
            required
          />
        </div>

        {/* Precio Venta: 1 col */}
        <div className="col-span-1">
          <label className="block text-[11px] font-semibold text-gray-700">Precio Venta</label>
          <SmartInput
            name="purchasePrice"
            variant="price"
            value={formData.purchasePrice || ''}
            onChange={onChange}
            disabled={disabled}
            className="w-full h-[26px] border border-gray-300 rounded px-1.5 py-0.5 text-[11px]"
            placeholder="0"
            required
          />
        </div>
      </>
    );
  }

  // Modo stack: estructura vertical para móvil/modal
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nombre del producto *
        </label>
        <input
          type="text"
          name="name"
          value={formData.name || ''}
          onChange={onChange}
          disabled={disabled}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          placeholder="Ej: Potus Variegado"
          required
        />
      </div>

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
                className="text-[11px] text-green-700 underline"
              >
                Gestionar tipos
              </button>
            )}
          </div>
          <select
            name="productType"
            value={formData.productType || ''}
            onChange={onChange}
            disabled={disabled}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            required
          >
            <option value="">Seleccionar...</option>
            {productTypes.map(t => (
              <option key={t.id} value={t.name}>{t.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center pt-2 md:pt-8">
          <input
            type="checkbox"
            id="isInsumo"
            name="isInsumo"
            checked={formData.isInsumo || false}
            onChange={(e) => onChange({ target: { name: 'isInsumo', value: e.target.checked } })}
            disabled={disabled}
            className="h-4 w-4 text-green-600"
          />
          <label htmlFor="isInsumo" className="ml-2 block text-sm text-gray-700">
            Es para uso interno (no se vende)
          </label>
        </div>
      </div>

      {showStock && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {context === 'purchase' ? 'Cantidad a comprar *' : 'Stock inicial *'}
          </label>
          <SmartInput
            name="stock"
            variant="stock"
            value={formData.stock || ''}
            onChange={onChange}
            disabled={disabled}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            placeholder="0"
            required
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Precio Compra *
          </label>
          <SmartInput
            name="basePrice"
            variant="price"
            value={formData.basePrice || ''}
            onChange={onChange}
            disabled={disabled}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
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
            onChange={onChange}
            disabled={disabled}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
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
  layout: PropTypes.oneOf(['stack', 'inline']),
  showStock: PropTypes.bool,
  autoCalculatePrice: PropTypes.bool
};

export default ProductBaseFormFields;
