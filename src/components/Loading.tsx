"use client";

import type { FC } from "react";
import { AiOutlineLoading3Quarters } from "react-icons/ai";

type RefreshLoaderProps = {
  isOpen: boolean;
};

const RefreshLoader: FC<RefreshLoaderProps> = ({ isOpen }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-label="Loading"
    >
      <div className="bg-white p-8 rounded-lg shadow-xl flex flex-col items-center">
        <AiOutlineLoading3Quarters className="text-4xl animate-spin" />
        <p className="mt-4 text-gray-700 font-medium">Loading...</p>
      </div>
    </div>
  );
};

export default RefreshLoader;
