import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  type?: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: React.ReactNode;
  confirmText?: string;
}

export const Modal = ({
  isOpen,
  onClose,
  type = 'success',
  title,
  message,
  confirmText = 'Đóng'
}: ModalProps) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const config = {
    success: {
      icon: CheckCircle2,
      bgColor: 'bg-green-50',
      iconColor: 'text-green-500',
      borderColor: 'border-green-200',
      buttonColor: 'bg-green-500 hover:bg-green-600'
    },
    error: {
      icon: AlertCircle,
      bgColor: 'bg-red-50',
      iconColor: 'text-red-500',
      borderColor: 'border-red-200',
      buttonColor: 'bg-red-500 hover:bg-red-600'
    },
    warning: {
      icon: AlertCircle,
      bgColor: 'bg-amber-50',
      iconColor: 'text-amber-500',
      borderColor: 'border-amber-200',
      buttonColor: 'bg-amber-500 hover:bg-amber-600'
    },
    info: {
      icon: AlertCircle,
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-500',
      borderColor: 'border-blue-200',
      buttonColor: 'bg-blue-500 hover:bg-blue-600'
    }
  };

  const { icon: Icon, bgColor, iconColor, borderColor, buttonColor } = config[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>

        <div className="p-8 text-center">
          <div className={`w-20 h-20 ${bgColor} border-4 ${borderColor} rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-300 delay-100`}>
            <Icon className={`w-10 h-10 ${iconColor}`} />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            {title}
          </h2>

          {message && (
            <p className="text-gray-600 mb-6 leading-relaxed">
              {message}
            </p>
          )}

          <button
            onClick={onClose}
            className={`w-full py-3.5 px-6 ${buttonColor} text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
