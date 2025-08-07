// Formulario de caja para escritorio, usando componentes compartidos
import React from 'react';
import PropTypes from 'prop-types';

const CashDesktopForm = ({ form, handleChange, onSubmit, errorMsg, isSubmitting }) => {
  // Calcular la fecha máxima permitida (fecha actual)
  const maxDate = new Date().toISOString().slice(0, 16);
  
  return (
    <form onSubmit={onSubmit} className="max-w-lg mx-auto">
      <div className="flex flex-col gap-4 bg-white p-6 rounded-lg shadow-md">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Detalle del movimiento</label>
          <textarea 
            name="notes" 
            value={form.notes} 
            onChange={handleChange} 
            className="border border-gray-300 rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500" 
            placeholder="Descripción del movimiento de caja" 
            rows="3"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Monto</label>
          <input 
            type="number" 
            name="price" 
            value={form.price} 
            onChange={handleChange} 
            className="border border-gray-300 rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500" 
            placeholder="Ingrese el monto" 
            step="0.01"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Método de pago</label>
          <select 
            name="paymentMethod" 
            value={form.paymentMethod} 
            onChange={handleChange} 
            className="border border-gray-300 rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="efectivo">Efectivo</option>
            <option value="mercadoPago">Mercado Pago</option>
          </select>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fecha y hora</label>
            <input 
              type="datetime-local" 
              name="date" 
              value={form.date} 
              onChange={handleChange} 
              max={maxDate}
              className="border border-gray-300 rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500" 
              title="Seleccione la fecha del movimiento (no puede ser posterior a la fecha actual)"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Lugar</label>
            <input 
              type="text" 
              name="location" 
              value={form.location} 
              onChange={handleChange} 
              className="border border-gray-300 rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500" 
              placeholder="Ubicación" 
            />
          </div>
        </div>
        
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {errorMsg}
          </div>
        )}
        
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="bg-green-600 hover:bg-green-700 text-white rounded-md px-6 py-3 font-medium w-full disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Procesando...' : 'Registrar movimiento'}
        </button>
      </div>
    </form>
  );
};

CashDesktopForm.propTypes = {
  form: PropTypes.object.isRequired,
  handleChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  errorMsg: PropTypes.string,
  isSubmitting: PropTypes.bool,
};

export default CashDesktopForm;
