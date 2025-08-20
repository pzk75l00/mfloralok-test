// Componente de input reutilizable con funcionalidades comunes
import React from 'react';
import PropTypes from 'prop-types';
import { 
  handleSelectAllOnFocus, 
  getPriceInputProps, 
  getQuantityInputProps, 
  getStockInputProps 
} from '../../utils/inputUtils';

/**
 * Input reutilizable con diferentes tipos predefinidos
 */
const SmartInput = ({
  type = 'text',
  variant = 'default', // 'price', 'quantity', 'stock', 'default'
  value,
  onChange,
  name,
  placeholder,
  disabled = false,
  required = false,
  className = '',
  autoSelect = true,
  ...otherProps
}) => {
  // Determinar las props según el variant
  const getVariantProps = () => {
    switch (variant) {
      case 'price':
        return getPriceInputProps({ autoSelect, disabled, ...otherProps });
      case 'quantity':
        return getQuantityInputProps({ autoSelect, disabled, ...otherProps });
      case 'stock':
        return getStockInputProps({ autoSelect, disabled, ...otherProps });
      default:
        return {
          type,
          disabled,
          ...(autoSelect && type === 'number' && { onFocus: handleSelectAllOnFocus }),
          ...otherProps
        };
    }
  };

  const variantProps = getVariantProps();
  
  // Clases base comunes
  const baseClasses = 'border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500';
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : '';
  const finalClassName = `${baseClasses} ${disabledClasses} ${className}`.trim();

  return (
    <input
      {...variantProps}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      className={finalClassName}
    />
  );
};

SmartInput.propTypes = {
  type: PropTypes.string,
  variant: PropTypes.oneOf(['default', 'price', 'quantity', 'stock']),
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func.isRequired,
  name: PropTypes.string.isRequired,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool,
  required: PropTypes.bool,
  className: PropTypes.string,
  autoSelect: PropTypes.bool
};

export default SmartInput;
