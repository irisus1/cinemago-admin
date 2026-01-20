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
import LocationPicker from "@/components/LocationPicker";

type CinemaModalProps = {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  cinema?: Cinema;
  onSubmit?: (
    payload: CinemaFormPayload,
    mode: "create" | "edit",
    cinema?: Cinema,
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
  const [cityId, setCityId] = useState<string>("");
  const [address, setAddress] = useState(cinema?.address ?? "");

  const [longitude, setLongitude] = useState<number | null>(
    cinema?.longitude ?? null,
  );
  const [latitude, setLatitude] = useState<number | null>(
    cinema?.latitude ?? null,
  );
  const [isActive, setIsActive] = useState<boolean>(cinema?.isActive ?? true);

  const valid = useMemo(
    () => Boolean(name.trim() && city.trim() && address.trim()),
    [name, city, address],
  );

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && cinema) {
      setName(cinema.name ?? "");
      setCity(cinema.city ?? "");
      setAddress(cinema.address ?? "");
      setLongitude(cinema.longitude ?? null);
      setLatitude(cinema.latitude ?? null);
      setIsActive(cinema.isActive ?? true);

      const found = VIETNAM_PROVINCES.find(
        (p) =>
          p.label.trim().toLowerCase() ===
          (cinema.city ?? "").trim().toLowerCase(),
      );
      setCityId(found?.value ?? "");
    } else {
      setName("");
      setCity("");
      setCityId("");
      setAddress("");
      setLongitude(null);
      setLatitude(null);
      setIsActive(true);
    }
  }, [open, mode, cinema]);

  async function handleSubmit() {
    if (!valid || !onSubmit) return;

    const payload: CinemaFormPayload = {
      name: name.trim(),
      city: city.trim(),
      address: address.trim(),
      longitude: longitude,
      latitude: latitude,
      rooms: [],
    };

    await onSubmit(payload, mode, cinema);
  }

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
            <DialogPanel className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl max-h-[90vh] overflow-y-auto">
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
                        (p) => p.value === id,
                      );
                      setCity(province?.label ?? "");
                    }}
                    placeholder="Chọn tỉnh / thành phố"
                    searchPlaceholder="Tìm theo tên tỉnh / thành phố..."
                    widthClass="w-full"
                  />
                </div>

                <div>
                  <LocationPicker
                    address={address}
                    latitude={latitude}
                    longitude={longitude}
                    onLocationChange={({ address, latitude, longitude }) => {
                      setAddress(address);
                      setLatitude(latitude);
                      setLongitude(longitude);
                    }}
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
