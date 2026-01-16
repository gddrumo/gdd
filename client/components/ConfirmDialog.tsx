import React from 'react';
import { AlertTriangle, X, CheckCircle2, Info } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  variant = 'warning'
}) => {
  if (!isOpen) return null;

  const variants = {
    danger: {
      icon: <AlertTriangle size={24} className="text-red-600" />,
      buttonClass: 'bg-red-600 hover:bg-red-700',
      headerClass: 'text-red-600'
    },
    warning: {
      icon: <AlertTriangle size={24} className="text-yellow-600" />,
      buttonClass: 'bg-yellow-600 hover:bg-yellow-700',
      headerClass: 'text-yellow-600'
    },
    info: {
      icon: <Info size={24} className="text-blue-600" />,
      buttonClass: 'bg-blue-600 hover:bg-blue-700',
      headerClass: 'text-blue-600'
    }
  };

  const config = variants[variant];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-scale-in">
        <div className="flex items-center gap-3 mb-4">
          {config.icon}
          <h3 className={`text-lg font-bold ${config.headerClass}`}>{title}</h3>
          <button
            onClick={onCancel}
            className="ml-auto text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
          {message}
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onCancel(); // Close dialog after confirm
            }}
            className={`px-4 py-2 text-sm font-bold text-white rounded-lg transition-all ${config.buttonClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
