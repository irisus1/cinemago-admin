"use client";

import { Fragment, useEffect, useState } from "react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import type { Genre } from "@/services";

type GenreFormPayload = {
  name: string;
  description: string;
};

type GenreModalProps = {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  genre?: Genre;
  onSubmit?: (
    payload: GenreFormPayload,
    mode: "create" | "edit",
    genre?: Genre
  ) => void | Promise<void>;
};

export default function GenreModal({
  open,
  onClose,
  mode,
  genre,
  onSubmit,
}: GenreModalProps) {
  const [name, setName] = useState(genre?.name ?? "");
  const [description, setDescription] = useState(genre?.description ?? "");

  const valid = name.trim().length > 0 && description.trim().length > 0;

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && genre) {
      setName(genre.name ?? "");
      setDescription(genre.description ?? "");
    } else {
      setName("");
      setDescription("");
    }
  }, [open, mode, genre]);

  const handleSubmit = async () => {
    if (!valid || !onSubmit) return;

    const payload: GenreFormPayload = {
      name: name.trim(),
      description: description.trim(),
    };

    await onSubmit(payload, mode, genre);
  };

  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40" />
        </TransitionChild>

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <DialogPanel className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
              <DialogTitle className="text-lg font-semibold mb-3">
                {mode === "create" ? "Thêm thể loại" : "Chỉnh sửa thể loại"}
              </DialogTitle>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Tên thể loại <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="VD: Hành động"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Mô tả <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Mô tả ngắn"
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800"
                >
                  Hủy
                </button>
                <button
                  disabled={!valid}
                  onClick={handleSubmit}
                  className={`px-4 py-2 rounded-lg text-white ${valid ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400"
                    }`}
                >
                  {mode === "create" ? "Thêm" : "Lưu"}
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
