"use client";

import type { ReactNode } from "react";
import { FiAlertCircle } from "react-icons/fi";

type FailedDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: ReactNode;
};

const FailedDialog = ({
  isOpen,
  onClose,
  title,
  message,
}: FailedDialogProps) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="failed-dialog-title"
      aria-describedby="failed-dialog-desc"
    >
      <div className="bg-white rounded-lg p-4 max-w-sm w-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-lg">
        <div className="flex items-start mb-4">
          <div className="text-red-600 flex-shrink-0 mt-5">
            <FiAlertCircle className="w-5 h-5" />
          </div>
          <div className="ml-3 w-full">
            <h3
              id="failed-dialog-title"
              className="text-lg font-semibold text-gray-900"
            >
              {title}
            </h3>
            <div id="failed-dialog-desc" className="mt-1 text-sm text-gray-600">
              {message}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-white bg-yellow-600 rounded-lg hover:bg-yellow-700"
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
};

export default FailedDialog;
