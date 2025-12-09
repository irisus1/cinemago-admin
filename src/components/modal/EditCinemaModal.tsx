"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import type { Cinema, CinemaFormPayload } from "@/services";
import { VIETNAM_PROVINCES } from "@/constants/vnProvinces";
import {
  SearchableCombobox,
  type SelectOption,
} from "@/components/SearchableCombobox";

type CinemaModalProps = {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  cinema?: Cinema;
  // page xử lý confirm + call API
  onSubmit?: (
    payload: CinemaFormPayload,
    mode: "create" | "edit",
    cinema?: Cinema
  ) => void | Promise<void>;
};

export default function EditCinemaModal({
  open,
  onClose,
  mode,
  cinema,
  onSubmit,
}: CinemaModalProps) {
  const [name, setName] = useState(cinema?.name ?? "");
  const [city, setCity] = useState(cinema?.city ?? "");
  const [cityId, setCityId] = useState<string>(""); // id tỉnh/thành được chọn
  const [address, setAddress] = useState(cinema?.address ?? "");
  const [longitude, setLongitude] = useState<string>(
    cinema?.longitude != null ? String(cinema.longitude) : ""
  );
  const [latitude, setLatitude] = useState<string>(
    cinema?.latitude != null ? String(cinema.latitude) : ""
  );
  const [isActive, setIsActive] = useState<boolean>(cinema?.isActive ?? true);

  const valid = useMemo(
    () => Boolean(name.trim() && city.trim() && address.trim()),
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

      // map city hiện tại -> option trong VIETNAM_PROVINCES
      const found = VIETNAM_PROVINCES.find(
        (p) =>
          p.label.trim().toLowerCase() ===
          (cinema.city ?? "").trim().toLowerCase()
      );
      setCityId(found?.value ?? "");
    } else {
      setName("");
      setCity("");
      setCityId("");
      setAddress("");
      setLongitude("");
      setLatitude("");
      setIsActive(true);
    }
  }, [open, mode, cinema]);

  const toNumOrNull = (s: string) => {
    const t = s.trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  };

  async function handleSubmit() {
    if (!valid || !onSubmit) return;

    const payload: CinemaFormPayload = {
      name: name.trim(),
      city: city.trim(),
      address: address.trim(),
      longitude: toNumOrNull(longitude),
      latitude: toNumOrNull(latitude),
      rooms: [],
    };

    await onSubmit(payload, mode, cinema);
  }

  const disableLongitude = mode === "edit" && cinema?.longitude != null;
  const disableLatitude = mode === "edit" && cinema?.latitude != null;

  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        {/* Overlay */}
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

        {/* Panel */}
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
                {mode === "create" ? "Thêm rạp" : "Chỉnh sửa rạp"}
              </DialogTitle>

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

                {/* Thành phố: dùng combobox */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Thành phố <span className="text-red-500">*</span>
                  </label>
                  <SearchableCombobox
                    options={VIETNAM_PROVINCES}
                    value={cityId}
                    onChange={(id) => {
                      setCityId(id);
                      const province = VIETNAM_PROVINCES.find(
                        (p) => p.value === id
                      );
                      setCity(province?.label ?? "");
                    }}
                    placeholder="Chọn tỉnh / thành phố"
                    searchPlaceholder="Tìm theo tên tỉnh / thành phố..."
                    widthClass="w-full"
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
                      disabled={disableLongitude}
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
                      disabled={disableLatitude}
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
                  disabled={!valid}
                  onClick={handleSubmit}
                  className={`px-4 py-2 rounded-lg text-white ${
                    valid ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400"
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
