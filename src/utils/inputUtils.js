// Utilidades reutilizables para inputs y formularios

/**
 * Maneja el evento onFocus para seleccionar automáticamente todo el texto
 * Útil para campos numéricos donde se quiere reemplazar el valor completamente
 * @param {Event} e - Evento del input
 */
export const handleSelectAllOnFocus = (e) => {
  e.target.select();
};

/**
 * Props comunes para inputs numéricos con auto-select
 * @param {Object} options - Opciones adicionales
 * @returns {Object} Props para el input
 */
export const getNumericInputProps = (options = {}) => {
  const {
    min = "0",
    step = "0.01",
    autoSelect = true,
    disabled = false,
    ...otherProps
  } = options;

  return {
    type: "number",
    min,
    step,
    disabled,
    ...(autoSelect && { onFocus: handleSelectAllOnFocus }),
    ...otherProps
  };
};

/**
 * Props comunes para inputs de precio
 * @param {Object} options - Opciones adicionales
 * @returns {Object} Props para el input de precio
 */
export const getPriceInputProps = (options = {}) => {
  return getNumericInputProps({
    min: "0",
    step: "0.01",
    placeholder: "0.00",
    ...options
  });
};

/**
 * Props comunes para inputs de cantidad/stock
 * @param {Object} options - Opciones adicionales
 * @returns {Object} Props para el input de cantidad
 */
export const getQuantityInputProps = (options = {}) => {
  return getNumericInputProps({
    min: "1",
    step: "1",
    placeholder: "1",
    ...options
  });
};

/**
 * Props comunes para inputs de stock
 * @param {Object} options - Opciones adicionales
 * @returns {Object} Props para el input de stock
 */
export const getStockInputProps = (options = {}) => {
  return getNumericInputProps({
    min: "0",
    step: "1",
    placeholder: "0",
    ...options
  });
};

/**
 * Valida que un valor numérico esté dentro de los límites
 * @param {number|string} value - Valor a validar
 * @param {number} min - Valor mínimo
 * @param {number} max - Valor máximo
 * @returns {Object} { isValid: boolean, error: string|null, clampedValue: number }
 */
export const validateNumericInput = (value, min = 0, max = Infinity) => {
  const numValue = parseFloat(value);
  
  if (isNaN(numValue)) {
    return {
      isValid: false,
      error: 'Debe ser un número válido',
      clampedValue: min
    };
  }
  
  if (numValue < min) {
    return {
      isValid: false,
      error: `El valor mínimo es ${min}`,
      clampedValue: min
    };
  }
  
  if (numValue > max) {
    return {
      isValid: false,
      error: `El valor máximo es ${max}`,
      clampedValue: max
    };
  }
  
  return {
    isValid: true,
    error: null,
    clampedValue: numValue
  };
};

/**
 * Formatea un número para mostrar en inputs de precio
 * @param {number|string} value - Valor a formatear
 * @returns {string} Valor formateado
 */
export const formatPriceInput = (value) => {
  const num = parseFloat(value);
  return isNaN(num) ? '' : num.toString();
};

/**
 * Formatea un número para mostrar en inputs de cantidad
 * @param {number|string} value - Valor a formatear
 * @returns {string} Valor formateado
 */
export const formatQuantityInput = (value) => {
  const num = parseInt(value);
  return isNaN(num) ? '' : num.toString();
};
