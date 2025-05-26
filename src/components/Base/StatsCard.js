import React from 'react';

const StatsCard = ({ title, value, icon, color, comparison, secondaryValue }) => {
  const colorClasses = {
    green: 'bg-green-50 text-green-700',
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    purple: 'bg-purple-50 text-purple-700'
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center">
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          {icon}
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-semibold">{value}</p>
          {secondaryValue && (
            <p className="text-lg font-medium">{secondaryValue}</p>
          )}
          {comparison && (
            <p className="text-xs text-gray-500 mt-1">{comparison}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatsCard;