import React from 'react';
import PropTypes from 'prop-types';

const PlantCard = ({ plant, onEdit, onDelete }) => {
  // Nomenclatura: busca imagen en public/img/plants/plant_{id}.jpg
  const imgSrc = `/img/plants/plant_${plant.id}.jpg`;
  return (
    <div className="bg-white rounded-xl shadow p-3 flex flex-col items-center border border-gray-100 hover:shadow-lg transition relative">
      <div className="w-full flex justify-center mb-2">
        <img
          src={imgSrc}
          alt={plant.name}
          onError={e => { e.target.onerror = null; e.target.src = '/img/plants/placeholder.jpg'; }}
          className="h-32 w-32 object-cover rounded-lg border border-gray-200 bg-gray-50"
        />
      </div>
      <div className="font-bold text-lg text-green-700 mb-1 text-center w-full truncate">{plant.name}</div>
      <div className="text-xs text-gray-500 mb-1 text-center w-full truncate">{plant.type}</div>
      <div className={`text-sm mb-1 w-full text-center ${Number(plant.stock) <= 1 ? 'text-red-700 font-bold' : 'text-green-800'}`}>Stock: <b>{plant.stock}</b></div>
      <div className="text-sm mb-1 w-full text-center">Venta: <b>${plant.purchasePrice}</b></div>
      <div className="flex gap-2 mt-2 w-full justify-center">
        <button className="text-blue-600 underline text-xs" onClick={() => onEdit(plant)}>Editar</button>
        <button className="text-red-600 underline text-xs" onClick={() => onDelete(plant.id)}>Eliminar</button>
      </div>
    </div>
  );
};

PlantCard.propTypes = {
  plant: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
    type: PropTypes.string,
    stock: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    purchasePrice: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    basePrice: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    purchaseDate: PropTypes.string,
    supplier: PropTypes.string
  }).isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired
};

export default PlantCard;
