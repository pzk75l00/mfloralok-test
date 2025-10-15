// Modal reutilizable para crear nuevos productos - responsive móvil/escritorio
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { createNewProduct, validateProductData, suggestBasePrice } from '../../utils/productManagement';
import SmartInput from './SmartInput';

const NewProductModal = ({ 
  isOpen, 
  onClose, 
  onProductCreated, 
  initialProductName = '',
  initialPurchasePrice = '',
  context = 'general' // 'general' o 'purchase' para cambiar labels
}) => {
  const [formData, setFormData] = useState({
    name: '',
    basePrice: '', // basePrice = precio de compra
    purchasePrice: '', // purchasePrice = precio de venta
    stock: '0',
    type: 'insumo' // Por defecto insumo (uso interno)
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState([]);

  // Inicializar formulario cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: initialProductName || '',
        basePrice: initialPurchasePrice || '', // basePrice es precio de compra
        purchasePrice: initialPurchasePrice ? suggestBasePrice(initialPurchasePrice).toString() : '', // purchasePrice es precio de venta
        stock: context === 'purchase' ? '1' : '0', // En compras, sugerir 1 unidad
        type: 'insumo'
      });
      setErrors([]);
    }
  }, [isOpen, initialProductName, initialPurchasePrice, context]);

  // Auto-calcular precio de venta cuando cambia precio de compra
  useEffect(() => {
    if (formData.basePrice && !isNaN(formData.basePrice)) {
      const suggested = suggestBasePrice(formData.basePrice);
      setFormData(prev => ({ ...prev, purchasePrice: suggested.toString() }));
    }
  }, [formData.basePrice]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Limpiar errores cuando el usuario empiece a escribir
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isSubmitting) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    // Validar datos
    const validation = validateProductData(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }
    
    setIsSubmitting(true);
    setErrors([]);
    
    try {
      // Si el contexto es compra, no persistimos el stock ingresado para evitar doble conteo.
      // Guardamos la cantidad ingresada como intendedQty para el auto-agregado del movimiento.
      const qtyToPurchase = context === 'purchase' ? (parseInt(formData.stock) || 1) : (parseInt(formData.stock) || 0);
      const creationData = context === 'purchase'
        ? { ...formData, stock: '0' }
        : formData;

      const productId = await createNewProduct(creationData);
      
      // Crear objeto producto para el callback
      const newProduct = {
        id: productId,
        name: formData.name.trim(),
        purchasePrice: parseFloat(formData.purchasePrice) || 0,
        basePrice: parseFloat(formData.basePrice) || 0,
        stock: context === 'purchase' ? 0 : (parseInt(formData.stock) || 0),
        intendedQty: context === 'purchase' ? (qtyToPurchase || 1) : undefined,
        type: formData.type,
        image: '',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Notificar al componente padre
      onProductCreated(newProduct);
      
      // Cerrar modal
      onClose();
      
    } catch (error) {
      setErrors([error.message || 'Error al crear el producto']);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Agregar Nuevo Producto
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Este producto se agregará a tu catálogo para futuras ventas
          </p>
        </div>
        
        <div className="p-4 space-y-4">
          {/* Nombre del producto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del producto *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              onKeyPress={handleKeyPress}
              disabled={isSubmitting}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Ej: Potus Variegado"
              required
            />
          </div>

          {/* Precio de compra (basePrice en tu modelo) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Precio de compra
            </label>
            <SmartInput
              name="basePrice"
              variant="price"
              value={formData.basePrice}
              onChange={handleChange}
              disabled={isSubmitting}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="0"
            />
          </div>

          {/* Precio de venta (purchasePrice en tu modelo) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Precio de venta sugerido
            </label>
            <SmartInput
              name="purchasePrice"
              variant="price"
              value={formData.purchasePrice}
              onChange={handleChange}
              disabled={isSubmitting}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="0"
            />
            <p className="text-xs text-gray-500 mt-1">
              Se calcula automáticamente con 2.5x el precio de compra
            </p>
          </div>

          {/* Stock inicial */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {context === 'purchase' ? 'Cantidad a comprar' : 'Stock inicial'}
            </label>
            <SmartInput
              name="stock"
              variant="stock"
              value={formData.stock}
              onChange={handleChange}
              disabled={isSubmitting}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="0"
            />
            <p className="text-xs text-gray-500 mt-1">
              {context === 'purchase' 
                ? 'Cantidad de unidades que estás comprando en este movimiento'
                : 'Cantidad inicial de stock para este producto'
              }
            </p>
          </div>

          {/* Tipo de producto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de producto
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              disabled={isSubmitting}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="insumo">Insumo (uso interno)</option>
              <option value="producto">Producto (para venta)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {formData.type === 'insumo' 
                ? 'Este ítem no aparecerá en ventas (ej: herramientas, bandejas)'
                : 'Este ítem estará disponible para ventas'
              }
            </p>
          </div>

          {/* Errores */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <ul className="text-sm text-red-600 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Botones */}
          <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creando...' : 'Crear Producto'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

NewProductModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onProductCreated: PropTypes.func.isRequired,
  initialProductName: PropTypes.string,
  initialPurchasePrice: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  context: PropTypes.oneOf(['general', 'purchase'])
};

export default NewProductModal;
