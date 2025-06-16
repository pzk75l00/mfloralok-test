// Formulario de ventas para escritorio, usando componentes compartidos
import React from 'react';
import PropTypes from 'prop-types';
import ProductFormFields from '../../Shared/ProductFormFields';
import ProductTable from '../../Shared/ProductTable';

const SalesDesktopForm = ({ form, productForm, plants, handleChange, handleProductFormChange, handleAddProduct, handleRemoveProduct, ventaTotal, products, onSubmit, errorMsg }) => {
  console.log('[DEBUG][SalesDesktopForm] Render', { tipo: form.type });
  return (
    <form onSubmit={onSubmit} className="flex flex-row gap-4 items-end">
      {/* Columna izquierda: carga de datos */}
      <div className="flex flex-col gap-2 flex-1">
        <select name="type" value={form.type} onChange={e => { handleChange(e); console.log('[DEBUG][SalesDesktopForm] Tipo de movimiento seleccionado:', e.target.value); }} className="border rounded px-2 py-1 mb-2 w-full">
          <option value="venta">Venta</option>
          <option value="compra">Compra</option>
          <option value="ingreso">Ingreso</option>
          <option value="egreso">Egreso</option>
          <option value="gasto">Gasto</option>
        </select>
        {form.type === 'venta' && (
          <>
            <label htmlFor="date" className="font-semibold text-sm mb-1">Fecha y hora</label>
            <input type="datetime-local" id="date" name="date" value={form.date} onChange={handleChange} className="border border-red-500 rounded px-2 py-1 mb-2 w-full bg-yellow-50" />
          </>
        )}
        {(form.type === 'venta' || form.type === 'compra') ? (
          <>
            <ProductFormFields productForm={productForm} plants={plants} handleProductFormChange={handleProductFormChange} />
            <button type="button" onClick={handleAddProduct} className="bg-blue-500 text-white rounded px-2 py-1">Agregar producto</button>
          </>
        ) : (
          <>
            <input type="number" name="price" value={form.price} onChange={handleChange} className="border rounded px-2 py-1 mb-2 w-full" placeholder="Monto" />
            <input type="text" name="detail" value={form.detail} onChange={handleChange} className="border rounded px-2 py-1 mb-2 w-full" placeholder="Detalle" />
          </>
        )}
      </div>
      {/* Columna derecha: resumen y confirmación */}
      <div className="flex-1">
        {(form.type === 'venta' || form.type === 'compra') && (
          <>
            <ProductTable products={products} handleRemoveProduct={handleRemoveProduct} />
            <div className="font-bold text-right">Total: ${ventaTotal}</div>
          </>
        )}
        <select name="paymentMethod" value={form.paymentMethod} onChange={handleChange} className="border rounded px-2 py-1 mb-2 w-full">
          <option value="efectivo">Efectivo</option>
          <option value="mercadoPago">Mercado Pago</option>
        </select>
        {/* Proveedor solo para compra, después de método de pago y antes de notas */}
        <div style={{fontWeight:'bold', color:'#d9534f', marginBottom:8}}>Tipo actual: {form.type}</div>
        {form.type === 'compra' && (
          <div style={{ background: '#ffeeba', border: '2px solid #f0ad4e', borderRadius: 4, padding: 4, marginBottom: 8 }}>
            <input type="text" name="supplier" value={form.supplier || ''} onChange={handleChange} className="border rounded px-2 py-1 w-full" placeholder="Proveedor (opcional)" />
          </div>
        )}
        <textarea name="notes" value={form.notes} onChange={handleChange} className="border rounded px-2 py-1 mb-2 w-full" placeholder="Notas" />
        <input type="text" name="location" value={form.location} onChange={handleChange} className="border rounded px-2 py-1 mb-2 w-full" placeholder="Lugar" />
        {/* Solo mostrar la fecha aquí si NO es venta */}
        {form.type !== 'venta' && (
          <>
            <label htmlFor="date" className="font-semibold text-sm mb-1">Fecha y hora</label>
            <input type="datetime-local" id="date" name="date" value={form.date} onChange={handleChange} className="border border-red-500 rounded px-2 py-1 mb-2 w-full bg-yellow-50" />
          </>
        )}
        {errorMsg && <div className="text-red-500 text-xs">{errorMsg}</div>}
        <button
          type="submit"
          className="bg-green-600 text-white rounded px-4 py-2 font-bold"
          onClick={e => {
            if (onSubmit) onSubmit(e);
          }}
        >
          Registrar movimiento
        </button>
      </div>
    </form>
  );
};

SalesDesktopForm.propTypes = {
  form: PropTypes.object.isRequired,
  productForm: PropTypes.object.isRequired,
  plants: PropTypes.array.isRequired,
  handleChange: PropTypes.func.isRequired,
  handleProductFormChange: PropTypes.func.isRequired,
  handleAddProduct: PropTypes.func.isRequired,
  handleRemoveProduct: PropTypes.func.isRequired,
  ventaTotal: PropTypes.number.isRequired,
  products: PropTypes.array.isRequired,
  onSubmit: PropTypes.func.isRequired,
  errorMsg: PropTypes.string,
};

export default SalesDesktopForm;
