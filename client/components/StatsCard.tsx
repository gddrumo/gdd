import React from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'blue' | 'green' | 'yellow' | 'red';
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, subtitle, color = 'blue' }) => {
  // Using arbitrary values to ensure exact match with Rumo Palette
  const colorClasses = {
    blue: 'border-l-[#004A8F] text-[#004A8F]',
    green: 'border-l-[#32A6E6] text-[#32A6E6]', // Updated to #32A6E6 (Light background rule)
    yellow: 'border-l-[#F58220] text-[#F58220]', // Using Orange for Yellow/Alert context
    red: 'border-l-red-500 text-red-600',
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm p-6 border-l-4 ${colorClasses[color]} transition-transform hover:scale-[1.02]`}>
      <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">{title}</h3>
      <div className="flex items-baseline">
        <span className="text-3xl font-bold text-gray-800">{value}</span>
      </div>
      {subtitle && <p className="text-sm text-gray-400 mt-2">{subtitle}</p>}
    </div>
  );
};

export default StatsCard;