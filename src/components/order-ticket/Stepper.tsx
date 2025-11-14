import React from "react";
export default function Stepper({ step }: { step: 1 | 2 | 3 | 4 | 5 | 6 }) {
  return (
    <div className="flex items-center gap-2 text-sm mb-4">
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <div
          key={n}
          className={`px-2 py-1 rounded ${
            step === n ? "bg-black text-white" : "bg-gray-200"
          }`}
        >
          Step {n}
        </div>
      ))}
    </div>
  );
}
