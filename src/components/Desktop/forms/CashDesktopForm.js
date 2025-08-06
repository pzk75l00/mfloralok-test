// Formulario de caja para escritorio, usando componentes compartidos
import React from 'react';
import PropTypes from 'prop-types';

const CashDesktopForm = ({ form, handleChange, onSubmit, errorMsg, isSubmitting }) => {
  // Calcular la fecha máxima permitida (fecha actual)
  const maxDate = new Date().toISOString().slice(0, 16);
  
  return (
    <form onSubmit={onSubmit} className="flex flex-row gap-4 items-end">
      <div className="flex flex-col gap-2 flex-1">
        <textarea name="notes" value={form.notes} onChange={handleChange} className="border rounded px-2 py-1 mb-2 w-full" placeholder="Detalle del movimiento" />
        <input type="number" name="price" value={form.price} onChange={handleChange} className="border rounded px-2 py-1 mb-2 w-full" placeholder="Monto" />
        <select name="paymentMethod" value={form.paymentMethod} onChange={handleChange} className="border rounded px-2 py-1 mb-2 w-full">
          <option value="efectivo">Efectivo</option>
          <option value="mercadoPago">Mercado Pago</option>
        </select>
        <div className="flex flex-col">
          <label className="text-xs font-medium text-gray-700 mb-1">Fecha y hora del movimiento</label>
          <input 
            type="datetime-local" 
            name="date" 
            value={form.date} 
            onChange={handleChange} 
            max={maxDate}
            className="border rounded px-2 py-1 mb-2 w-full text-sm" 
            title="Seleccione la fecha del movimiento (no puede ser posterior a la fecha actual)"
          />
        </div>
        <input type="text" name="location" value={form.location} onChange={handleChange} className="border rounded px-2 py-1 mb-2 w-full" placeholder="Lugar" />
        {errorMsg && <div className="text-red-500 text-xs">{errorMsg}</div>}
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="bg-green-600 text-white rounded px-4 py-2 font-bold disabled:bg-gray-400 disabled:cursor-not-allowed"
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
