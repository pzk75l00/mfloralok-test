import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { db } from '../../firebase/firebaseConfig';
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import ConfirmationModal from './ConfirmationModal';
import AlertModal from './AlertModal';

// Modal para gestionar métodos de pago disponibles
const PaymentMethodsManager = ({ isOpen, onClose }) => {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [newMethod, setNewMethod] = useState({
    name: '',
    code: '',
    icon: '💰',
    color: 'text-gray-600',
    isActive: true
  });
  const [editingMethod, setEditingMethod] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Estados para modales
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    type: 'warning'
  });
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  // Iconos disponibles para métodos de pago
  const availableIcons = [
    '💰', '📱', '🏦', '💳', '💵', '🪙', '💸', '💎', 
    '🔗', '📊', '🎯', '⭐', '🔵', '🟢', '🟡', '🔴'
  ];

  // Colores disponibles
  const availableColors = [
    { value: 'text-green-600', label: 'Verde' },
    { value: 'text-blue-600', label: 'Azul' },
    { value: 'text-purple-600', label: 'Morado' },
    { value: 'text-orange-600', label: 'Naranja' },
    { value: 'text-red-600', label: 'Rojo' },
    { value: 'text-gray-600', label: 'Gris' },
    { value: 'text-pink-600', label: 'Rosa' },
    { value: 'text-indigo-600', label: 'Índigo' }
  ];

  // Cargar métodos de pago desde Firebase
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = onSnapshot(collection(db, 'paymentMethods'), (snapshot) => {
      const methods = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPaymentMethods(methods);
    });

    return () => unsubscribe();
  }, [isOpen]);

  const handleSave = async () => {
    if (!newMethod.name.trim() || !newMethod.code.trim()) {
      setAlertModal({
        isOpen: true,
        title: 'Datos incompletos',
        message: 'Por favor complete todos los campos obligatorios (Nombre y Código).',
        type: 'error'
      });
      return;
    }

    setIsLoading(true);
    try {
      if (editingMethod) {
        // Actualizar método existente
        await updateDoc(doc(db, 'paymentMethods', editingMethod.id), {
          ...newMethod,
          updatedAt: new Date().toISOString()
        });
        
        setAlertModal({
          isOpen: true,
          title: 'Método actualizado',
          message: `El método de pago "${newMethod.name}" ha sido actualizado correctamente.`,
          type: 'success',
          autoClose: true
        });
      } else {
        // Crear nuevo método
        await addDoc(collection(db, 'paymentMethods'), {
          ...newMethod,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        
        setAlertModal({
          isOpen: true,
          title: 'Método creado',
          message: `El método de pago "${newMethod.name}" ha sido creado correctamente.`,
          type: 'success',
          autoClose: true
        });
      }

      // Resetear formulario
      setNewMethod({
        name: '',
        code: '',
        icon: '💰',
        color: 'text-gray-600',
        isActive: true
      });
      setEditingMethod(null);
    } catch (error) {
      console.error('Error guardando método de pago:', error);
      setAlertModal({
        isOpen: true,
        title: 'Error al guardar',
        message: 'Ocurrió un error al guardar el método de pago. Por favor intente nuevamente.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (method) => {
    setNewMethod({
      name: method.name,
      code: method.code,
      icon: method.icon,
      color: method.color,
      isActive: method.isActive
    });
    setEditingMethod(method);
  };

  const handleDelete = async (methodId, methodName) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar método de pago',
      message: `¿Está seguro de eliminar el método de pago "${methodName}"? Esta acción no se puede deshacer.`,
      type: 'danger',
      confirmText: 'Eliminar',
      onConfirm: () => performDelete(methodId, methodName)
    });
  };

  const performDelete = async (methodId, methodName) => {
    setIsLoading(true);
    try {
      await deleteDoc(doc(db, 'paymentMethods', methodId));
      setAlertModal({
        isOpen: true,
        title: 'Método eliminado',
        message: `El método de pago "${methodName}" ha sido eliminado correctamente.`,
        type: 'success',
        autoClose: true
      });
    } catch (error) {
      console.error('Error eliminando método de pago:', error);
      setAlertModal({
        isOpen: true,
        title: 'Error al eliminar',
        message: 'Ocurrió un error al eliminar el método de pago. Por favor intente nuevamente.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setNewMethod({
      name: '',
      code: '',
      icon: '💰',
      color: 'text-gray-600',
      isActive: true
    });
    setEditingMethod(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">
            🏦 Gestión de Métodos de Pago
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Formulario */}
            <div>
              <h3 className="text-lg font-semibold mb-4">
                {editingMethod ? 'Editar Método' : 'Nuevo Método de Pago'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={newMethod.name}
                    onChange={(e) => setNewMethod(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="ej: Mercado Pago"
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código *
                  </label>
                  <input
                    type="text"
                    value={newMethod.code}
                    onChange={(e) => setNewMethod(prev => ({ ...prev, code: e.target.value.toLowerCase() }))}
                    placeholder="ej: mercadopago"
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-400"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Solo letras minúsculas, sin espacios ni caracteres especiales
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Icono
                  </label>
                  <div className="grid grid-cols-8 gap-2">
                    {availableIcons.map(icon => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setNewMethod(prev => ({ ...prev, icon }))}
                        className={`p-2 text-xl border rounded hover:bg-gray-100 ${
                          newMethod.icon === icon ? 'bg-blue-100 border-blue-500' : ''
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color
                  </label>
                  <select
                    value={newMethod.color}
                    onChange={(e) => setNewMethod(prev => ({ ...prev, color: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-400"
                  >
                    {availableColors.map(color => (
                      <option key={color.value} value={color.value}>
                        {color.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={newMethod.isActive}
                    onChange={(e) => setNewMethod(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                    Método activo
                  </label>
                </div>

                {/* Vista previa */}
                <div className="p-3 bg-gray-50 rounded border">
                  <p className="text-sm text-gray-600 mb-2">Vista previa:</p>
                  <div className={`flex items-center gap-2 ${newMethod.color}`}>
                    <span className="text-xl">{newMethod.icon}</span>
                    <span className="font-medium">{newMethod.name || 'Nombre del método'}</span>
                  </div>
                </div>

                {/* Botones */}
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoading ? 'Guardando...' : editingMethod ? 'Actualizar' : 'Crear'}
                  </button>
                  {editingMethod && (
                    <button
                      onClick={handleCancel}
                      disabled={isLoading}
                      className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Lista de métodos existentes */}
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Métodos Existentes ({paymentMethods.length})
              </h3>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {paymentMethods.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">
                    No hay métodos de pago registrados
                  </p>
                ) : (
                  paymentMethods.map(method => (
                    <div
                      key={method.id}
                      className={`p-3 border rounded-lg ${
                        method.isActive ? 'bg-white' : 'bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className={`flex items-center gap-2 ${method.color}`}>
                          <span className="text-lg">{method.icon}</span>
                          <div>
                            <div className="font-medium">{method.name}</div>
                            <div className="text-xs text-gray-500">
                              Código: {method.code}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!method.isActive && (
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                              Inactivo
                            </span>
                          )}
                          <button
                            onClick={() => handleEdit(method)}
                            disabled={isLoading}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(method.id, method.name)}
                            disabled={isLoading}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Modales */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText || 'Confirmar'}
      />

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        autoClose={alertModal.autoClose}
      />
    </div>
  );
};

PaymentMethodsManager.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired
};

export default PaymentMethodsManager;
