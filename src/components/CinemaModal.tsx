"use client";
import { Fragment, useEffect, useMemo, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
// đổi sang service thật của bạn
import { cinemaService, type Cinema } from "@/services";

export default function CinemaModal({
  open,
  onClose,
  mode,
  cinema,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  cinema?: Cinema;
  onSuccess?: () => void;
}) {
  const [name, setName] = useState(cinema?.name ?? "");
  const [city, setCity] = useState(cinema?.city ?? "");
  const [address, setAddress] = useState(cinema?.address ?? "");
  const [longitude, setLongitude] = useState<string>(
    cinema?.longitude != null ? String(cinema.longitude) : ""
  );
  const [latitude, setLatitude] = useState<string>(
    cinema?.latitude != null ? String(cinema.latitude) : ""
  );
  const [isActive, setIsActive] = useState<boolean>(cinema?.isActive ?? true);
  const [loading, setLoading] = useState(false);

  // validate bắt buộc
  const valid = useMemo(
    () => name.trim() && city.trim() && address.trim(),
    [name, city, address]
  );

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && cinema) {
      setName(cinema.name ?? "");
      setCity(cinema.city ?? "");
      setAddress(cinema.address ?? "");
      setLongitude(cinema.longitude != null ? String(cinema.longitude) : "");
      setLatitude(cinema.latitude != null ? String(cinema.latitude) : "");
      setIsActive(cinema.isActive ?? true);
    } else {
      setName("");
      setCity("");
      setAddress("");
      setLongitude("");
      setLatitude("");
      setIsActive(true);
    }
  }, [open, mode, cinema?.id]);

  // helper parse số hoặc null
  const toNumOrNull = (s: string) => {
    const t = s.trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  };

  async function handleSubmit() {
    if (!valid) return;
    try {
      setLoading(true);
      const payload = {
        name: name.trim(),
        city: city.trim(),
        address: address.trim(),
        longitude: toNumOrNull(longitude),
        latitude: toNumOrNull(latitude),
        isActive,
      };

      if (mode === "create") {
        await cinemaService.addCinema(payload);
      } else {
        if (!cinema?.id) throw new Error("Thiếu ID rạp");
        await cinemaService.updateCinema(cinema.id, payload);
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
                {mode === "create" ? "Thêm rạp" : "Chỉnh sửa rạp"}
              </Dialog.Title>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Tên rạp <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="VD: Cinestar Sinh Viên"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Thành phố <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="VD: Bình Dương"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Địa chỉ <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="VD: 123 Đường ABC, Phường XYZ"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Kinh độ (longitude)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={longitude}
                      disabled={mode === "edit"}
                      onChange={(e) => setLongitude(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg
                                disabled:bg-gray-50 disabled:text-gray-500
                                disabled:placeholder:text-gray-400
                                disabled:opacity-70 disabled:cursor-not-allowed"
                      placeholder="VD: 106.70098"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Vĩ độ (latitude)
                    </label>
                    <input
                      type="number"
                      step="any"
                      disabled={mode === "edit"}
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg
                                disabled:bg-gray-50 disabled:text-gray-500
                                disabled:placeholder:text-gray-400
                                disabled:opacity-70 disabled:cursor-not-allowed"
                      placeholder="VD: 10.77689"
                    />
                  </div>
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
