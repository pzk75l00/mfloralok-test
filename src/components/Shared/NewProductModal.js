// Modal reutilizable para crear nuevos productos - responsive móvil/escritorio
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { createNewProduct, validateProductData } from '../../utils/productManagement';
import ProductBaseFormFields from './ProductBaseFormFields';

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
    productType: '', // Categoría del producto (macetas, plantas, flores, etc.)
    isInsumo: false // Por defecto para venta, no uso interno
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState([]);
  const [productTypes, setProductTypes] = useState([]);

  // Cargar tipos de productos desde Firebase
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'productTypes'), (snapshot) => {
      const types = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProductTypes(types);
    });
    return () => unsubscribe();
  }, []);

  // Inicializar formulario cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: initialProductName || '',
        basePrice: initialPurchasePrice || '',
        purchasePrice: initialPurchasePrice ? '' : '', // Se auto-calcula en el componente
        stock: context === 'purchase' ? '1' : '0',
        productType: '', // Usuario debe seleccionar categoría
        isInsumo: false // Por defecto para venta (no uso interno)
      });
      setErrors([]);
    }
  }, [isOpen, initialProductName, initialPurchasePrice, context]);

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
        productType: formData.productType,
        isInsumo: formData.isInsumo || false,
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
          {/* Usar componente reutilizable de campos base */}
          <ProductBaseFormFields
            formData={formData}
            onChange={handleChange}
            productTypes={productTypes}
            disabled={isSubmitting}
            context={context}
            autoCalculatePrice={true}
            showStock={true}
          />

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
