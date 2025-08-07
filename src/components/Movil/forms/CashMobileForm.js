// Formulario de caja para móvil, usando componentes compartidos
import React from 'react';
import PropTypes from 'prop-types';
import SmartInput from '../../Shared/SmartInput';

const CashMobileForm = ({ form, handleChange, onSubmit, isSubmitting, errorMsg }) => {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 items-stretch">
      <textarea name="notes" value={form.notes} onChange={handleChange} disabled={isSubmitting} className="border rounded px-2 py-1 mb-2 w-full disabled:opacity-50" placeholder="Detalle del movimiento" />
      
      <SmartInput
        variant="price"
        name="price"
        value={form.price}
        onChange={handleChange}
        disabled={isSubmitting}
        className="mb-2 w-full disabled:opacity-50"
        placeholder="Monto"
      />
      
      <select name="paymentMethod" value={form.paymentMethod} onChange={handleChange} disabled={isSubmitting} className="border rounded px-2 py-1 mb-2 w-full disabled:opacity-50">
        <option value="efectivo">Efectivo</option>
        <option value="mercadoPago">Mercado Pago</option>
      </select>
      <input type="text" name="location" value={form.location} onChange={handleChange} disabled={isSubmitting} className="border rounded px-2 py-1 mb-2 w-full disabled:opacity-50" placeholder="Notas adicionales" />
      {errorMsg && <div className="text-red-500 text-xs">{errorMsg}</div>}
      <button 
        type="submit" 
        disabled={isSubmitting}
        className="bg-green-600 text-white rounded px-4 py-2 font-bold disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Procesando...' : 'Registrar movimiento'}
      </button>
    </form>
  );
};

CashMobileForm.propTypes = {
  form: PropTypes.object.isRequired,
  handleChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  isSubmitting: PropTypes.bool,
  errorMsg: PropTypes.string,
};

export default CashMobileForm;
