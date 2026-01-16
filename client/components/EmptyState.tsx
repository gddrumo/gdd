import React from 'react';
import { LucideIcon, Inbox, Search, Filter } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  type?: 'default' | 'search' | 'filter';
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  type = 'default'
}) => {
  // Define icon baseado no tipo se não for fornecido
  const DefaultIcon = Icon || (
    type === 'search' ? Search :
    type === 'filter' ? Filter :
    Inbox
  );

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <DefaultIcon size={32} className="text-gray-400" />
      </div>

      <h3 className="text-lg font-bold text-gray-800 mb-2 text-center">
        {title}
      </h3>

      <p className="text-sm text-gray-500 text-center max-w-md mb-6">
        {description}
      </p>

      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-2.5 bg-[#003A70] hover:bg-blue-900 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
