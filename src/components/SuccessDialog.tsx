"use client";

import type { ReactNode } from "react";
import { FiCheck } from "react-icons/fi";

type SuccessDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: ReactNode;
};

const SuccessDialog = ({
  isOpen,
  onClose,
  title,
  message,
}: SuccessDialogProps) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="success-dialog-title"
      aria-describedby="success-dialog-desc"
    >
      <div className="bg-white rounded-lg p-4 max-w-sm w-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-lg">
        <div className="flex items-start mb-4">
          <div className="text-green-600 flex-shrink-0 mt-5">
            <FiCheck className="w-5 h-5" />
          </div>
          <div className="ml-3 w-full">
            <h3
              id="success-dialog-title"
              className="text-lg font-semibold text-gray-900"
            >
              {title}
            </h3>
            <div
              id="success-dialog-desc"
              className="mt-1 text-sm text-gray-600"
            >
              {message}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700"
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessDialog;
