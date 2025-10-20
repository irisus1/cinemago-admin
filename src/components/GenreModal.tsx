"use client";
import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { useEffect } from "react";
// đổi sang service thật của bạn
import { addGenre, updateGenre } from "@/services/MovieService";

type Genre = { id?: string; name: string; description?: string };

export default function GenreModal({
  open,
  onClose,
  mode,
  genre,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  genre?: Genre;
  onSuccess?: () => void;
}) {
  const [name, setName] = useState(genre?.name ?? "");
  const [description, setDescription] = useState(genre?.description ?? "");
  const [loading, setLoading] = useState(false);

  const valid = name.trim().length > 0;

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

  async function handleSubmit() {
    if (!valid) return;
    try {
      setLoading(true);
      if (mode === "create") {
        await addGenre({ name: name.trim(), description: description.trim() });
      } else {
        if (!genre?.id) throw new Error("Thiếu ID");
        await updateGenre(genre.id, {
          name: name.trim(),
          description: description.trim(),
        });
      }
      onSuccess?.();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        {/* Overlay */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40" />
        </Transition.Child>

        {/* Panel */}
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
              <Dialog.Title className="text-lg font-semibold mb-3">
                {mode === "create" ? "Thêm thể loại" : "Chỉnh sửa thể loại"}
              </Dialog.Title>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Tên thể loại *
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
                    Mô tả
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Mô tả ngắn (tuỳ chọn)"
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
                  disabled={!valid || loading}
                  onClick={handleSubmit}
                  className={`px-4 py-2 rounded-lg text-white ${
                    valid && !loading
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-gray-400"
                  }`}
                >
                  {mode === "create" ? "Thêm" : "Lưu"}
                </button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
