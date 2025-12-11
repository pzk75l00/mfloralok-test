import React, { useState, useContext } from 'react';
import PropTypes from 'prop-types';
import { UserContext } from '../../App';
import UserRegisterForm from '../UserRegisterForm';
import UserListPanel from '../Admin/UserListPanel';
import ErrorModal from '../Shared/ErrorModal';
import SuccessModal from '../Shared/SuccessModal';

const UsersMovilView = ({ activeTab: controlledActiveTab, setActiveTab: controlledSetActiveTab }) => {
  const { userData } = useContext(UserContext);
  const [internalActiveTab, setInternalActiveTab] = useState(null); // fallback sin control externo
  const activeTab = controlledActiveTab !== undefined ? controlledActiveTab : internalActiveTab;
  const setActiveTab = controlledSetActiveTab || setInternalActiveTab;
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [errorModal, setErrorModal] = useState({ open: false, message: '' });
  const [successModal, setSuccessModal] = useState({ open: false, message: '' });

  // Validar permisos de admin
  if (!userData || (userData.rol !== 'admin' && userData.rol !== 'owner')) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-4">
          <h2 className="text-xl font-bold text-red-600 mb-2">Acceso Denegado</h2>
          <p className="text-gray-700">Solo administradores pueden acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  const handleUserCreated = () => {
    setSuccessModal({ open: true, message: 'Usuario registrado correctamente.' });
    setRefreshTrigger(prev => prev + 1);
    // Cambiar a la pestaña de usuarios para ver el nuevo
    setTimeout(() => setActiveTab('list'), 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Panel de administración con dos botones al estilo Home */}
      {activeTab === null && (
        <div className="px-4 mt-3">
          <h2 className="text-lg font-bold text-green-700 mb-3">Panel de administración</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              className="flex flex-col items-center justify-center rounded-xl shadow-md border border-gray-100 p-5 bg-green-100 hover:scale-102 transition-transform active:scale-98"
              onClick={() => setActiveTab('register')}
            >
              <span className="text-3xl mb-2">📝</span>
              <span className="text-base font-medium text-gray-700 text-center">Registrar Usuario</span>
            </button>
            <button
              className="flex flex-col items-center justify-center rounded-xl shadow-md border border-gray-100 p-5 bg-blue-100 hover:scale-102 transition-transform active:scale-98"
              onClick={() => setActiveTab('list')}
            >
              <span className="text-3xl mb-2">👥</span>
              <span className="text-base font-medium text-gray-700 text-center">Usuarios Registrados</span>
            </button>
          </div>
        </div>
      )}

      {/* Contenido */}
      <div className="p-4">
        {activeTab === 'register' && (
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h2 className="text-lg font-bold text-green-700 mb-4">Registrar Nuevo Usuario</h2>
            <UserRegisterForm
              onUserCreated={handleUserCreated}
              isAdmin={userData?.rol === 'admin' || userData?.rol === 'owner'}
            />
          </div>
        )}

        {activeTab === 'list' && (
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h2 className="text-lg font-bold text-green-700 mb-4">Usuarios Registrados</h2>
            <UserListPanel
              isAdmin={userData?.rol === 'admin' || userData?.rol === 'owner'}
              refreshTrigger={refreshTrigger}
              isMobile={true}
            />
          </div>
        )}
      </div>

      <ErrorModal
        open={errorModal.open}
        message={errorModal.message}
        onClose={() => setErrorModal({ open: false, message: '' })}
      />
      <SuccessModal
        open={successModal.open}
        message={successModal.message}
        onClose={() => setSuccessModal({ open: false, message: '' })}
      />
    </div>
  );
};

UsersMovilView.propTypes = {
  activeTab: PropTypes.string,
  setActiveTab: PropTypes.func,
};

export default UsersMovilView;
