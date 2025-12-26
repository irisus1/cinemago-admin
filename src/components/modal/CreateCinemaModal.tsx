"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import type {
  Cinema,
  CinemaFormPayload,
  RoomCreate,
  SeatCell,
} from "@/services";
import { VIETNAM_PROVINCES } from "@/constants/vnProvinces";
import { SearchableCombobox } from "@/components/SearchableCombobox";
import {
  Check,
  ChevronRight,
  Plus,
  Trash2,
  ChevronDown,
  LayoutTemplate,
  Edit,
} from "lucide-react";

import { RoomLayoutModal } from "@/components/modal/RoomLayoutModal";
import LocationPicker from "@/components/LocationPicker";

// Định nghĩa lại Type SeatLayout cho khớp (nếu cần)
type SeatLayout = SeatCell[];

type CinemaModalProps = {
  open: boolean;
  onClose: () => void;
  mode: "create";
  cinema?: Cinema;
  onSubmit?: (
    payload: CinemaFormPayload,
    mode: "create",
    cinema?: Cinema
  ) => void | Promise<void>;
};

export default function CinemaModal({
  open,
  onClose,
  mode,
  cinema,
  onSubmit,
}: CinemaModalProps) {
  // --- STATE QUẢN LÝ BƯỚC ---
  const [currentStep, setCurrentStep] = useState(1);
  const TOTAL_STEPS = 3;

  // --- STATE BƯỚC 1: THÔNG TIN RẠP ---
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [cityId, setCityId] = useState<string>("");
  const [address, setAddress] = useState("");
  const [longitude, setLongitude] = useState<number | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);

  // --- STATE BƯỚC 2: DANH SÁCH PHÒNG ---
  const [rooms, setRooms] = useState<RoomCreate[]>([]);

  // [MỚI] State quản lý đóng/mở từng phòng (Dùng index làm key cho Set)
  const [openRoomIndices, setOpenRoomIndices] = useState<Set<number>>(
    new Set()
  );

  // [MỚI] State quản lý Modal cấu hình ghế
  const [layoutModalOpen, setLayoutModalOpen] = useState(false);
  const [selectedRoomIndex, setSelectedRoomIndex] = useState<number | null>(
    null
  );

  // --- RESET KHI MỞ MODAL ---
  useEffect(() => {
    if (!open) return;
    setCurrentStep(1);

    setName("");
    setCity("");
    setCityId("");
    setAddress("");
    setLongitude(null);
    setLatitude(null);
    setRooms([]);
    setOpenRoomIndices(new Set());
  }, [open]);

  // --- LOGIC PHÒNG (STEP 2) ---
  const handleAddRoom = () => {
    const newRoom: RoomCreate = {
      name: "",
      vipPrice: 0,
      couplePrice: 0,
      seatLayout: undefined,
    };

    setRooms((prev) => {
      const newRooms = [...prev, newRoom];
      // Tự động mở phòng mới nhất (index cuối cùng)
      setOpenRoomIndices((prevOpen) =>
        new Set(prevOpen).add(newRooms.length - 1)
      );
      return newRooms;
    });
  };

  const handleRemoveRoom = (indexToRemove: number) => {
    setRooms((prev) => prev.filter((_, index) => index !== indexToRemove));

    // Cập nhật lại danh sách index đang mở vì index các phần tử phía sau sẽ bị thay đổi
    setOpenRoomIndices((prev) => {
      const newSet = new Set<number>();
      prev.forEach((idx) => {
        if (idx < indexToRemove) newSet.add(idx); // Giữ nguyên index trước đó
        if (idx > indexToRemove) newSet.add(idx - 1); // Giảm index các phần tử sau đó
      });
      return newSet;
    });
  };

  const handleUpdateRoom = <K extends keyof RoomCreate>(
    indexToUpdate: number,
    field: K,
    value: RoomCreate[K]
  ) => {
    setRooms((prev) =>
      prev.map((r, index) =>
        index === indexToUpdate ? { ...r, [field]: value } : r
      )
    );
  };

  const toggleRoom = (index: number) => {
    setOpenRoomIndices((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // --- MODAL LAYOUT ---
  const handleOpenLayoutModal = (index: number) => {
    setSelectedRoomIndex(index);
    setLayoutModalOpen(true);
  };

  const handleSaveLayout = (layout: SeatLayout) => {
    if (selectedRoomIndex !== null) {
      setRooms((prev) => {
        const newRooms = [...prev];
        newRooms[selectedRoomIndex] = {
          ...newRooms[selectedRoomIndex],
          seatLayout: layout,
        };
        return newRooms;
      });

      setLayoutModalOpen(false);
      setSelectedRoomIndex(null);
    }
  };

  // --- VALIDATION ---
  const isStep1Valid = useMemo(
    () => Boolean(name.trim() && city.trim() && address.trim()),
    [name, city, address]
  );

  const isStep2Valid = useMemo(() => {
    if (rooms.length === 0) return false;
    // Check trường seatLayout
    return rooms.every((r) => r.name.trim() !== "" && r.seatLayout);
  }, [rooms]);

  const canNext = useMemo(() => {
    if (currentStep === 1) return isStep1Valid;
    if (currentStep === 2) return isStep2Valid;
    return true;
  }, [currentStep, isStep1Valid, isStep2Valid]);

  // --- SUBMIT ---


  async function handleSubmit() {
    if (!onSubmit) return;

    const payload: CinemaFormPayload = {
      name: name.trim(),
      city: city.trim(),
      address: address.trim(),
      longitude: longitude,
      latitude: latitude,
      rooms: rooms,
    };
    await onSubmit(payload, mode, cinema);
  }

  // --- RENDER ---
  return (
    <Fragment>
      <Transition show={open} as={Fragment}>
        <Dialog onClose={onClose} className="relative z-50">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          </TransitionChild>

          <div className="fixed inset-0 flex items-center justify-center p-4">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95 translate-y-4"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 translate-y-4"
            >
              <DialogPanel className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl flex flex-col max-h-[90vh]">
                {/* HEADER */}
                <div className="mb-6">
                  <DialogTitle className="text-xl font-bold text-gray-900 mb-1">
                    {mode === "create" ? "Tạo rạp mới" : "Chỉnh sửa rạp"}
                  </DialogTitle>
                  <p className="text-sm text-gray-500 mb-6">
                    {currentStep === 1 && "Bước 1 / 3: Điền thông tin rạp"}
                    {currentStep === 2 && "Bước 2 / 3: Thêm phòng"}
                    {currentStep === 3 && "Bước 3 / 3: Xem lại và tạo"}
                  </p>

                  {/* STEPPER */}
                  <div className="flex items-center justify-between px-10 relative">
                    <div className="absolute left-10 right-10 top-1/2 h-0.5 bg-gray-200 -z-10" />
                    <div
                      className="absolute left-10 top-1/2 h-0.5 bg-slate-900 -z-10 transition-all duration-300"
                      style={{
                        width: `calc(${(currentStep - 1) / (TOTAL_STEPS - 1)
                          } * (100% - 80px))`,
                      }}
                    />
                    {[1, 2, 3].map((step) => (
                      <div
                        key={step}
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-colors duration-300 z-10
                          ${currentStep >= step
                            ? "bg-slate-900 border-slate-900 text-white"
                            : "bg-white border-gray-300 text-gray-400"
                          }`}
                      >
                        {step}
                      </div>
                    ))}
                  </div>
                </div>

                {/* BODY */}
                <div className="flex-1 overflow-y-auto px-1 py-1 min-h-[300px]">
                  {/* BƯỚC 1: GIỮ NGUYÊN */}
                  {currentStep === 1 && (
                    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-1">
                          <label className="block text-sm font-semibold mb-1.5 text-gray-800">
                            Tên rạp <span className="text-red-500">*</span>
                          </label>
                          <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                            placeholder="Nhập tên rạp"
                            autoFocus
                          />
                        </div>
                        <div className="col-span-1">
                          <label className="block text-sm font-semibold mb-1.5 text-gray-800">
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
                            placeholder="Chọn thành phố"
                          />
                        </div>
                      </div>

                      <div className="pt-2">
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
                  )}

                  {/* BƯỚC 2: CẬP NHẬT DÙNG INDEX */}
                  {currentStep === 2 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-gray-800">
                          Phòng
                        </h3>
                        <button
                          onClick={handleAddRoom}
                          className="flex items-center gap-1.5 bg-slate-900 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-all shadow-sm"
                        >
                          <Plus size={16} /> Thêm phòng
                        </button>
                      </div>

                      <div className="space-y-3">
                        {rooms.length === 0 ? (
                          <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 text-gray-400">
                            Chưa có phòng nào được thêm.
                          </div>
                        ) : (
                          rooms.map((room, index) => {
                            const isOpen = openRoomIndices.has(index);
                            return (
                              <div
                                key={index}
                                className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden transition-all duration-200"
                              >
                                {/* HEADER CARD */}
                                <div
                                  className="flex justify-between items-center p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                                  onClick={() => toggleRoom(index)}
                                >
                                  <div className="flex items-center gap-3">
                                    {isOpen ? (
                                      <ChevronDown
                                        size={18}
                                        className="text-gray-500"
                                      />
                                    ) : (
                                      <ChevronRight
                                        size={18}
                                        className="text-gray-500"
                                      />
                                    )}
                                    <span className="font-semibold text-gray-800">
                                      {room.name || `Room ${index + 1}`}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    {room.seatLayout && (
                                      <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100 flex items-center gap-1">
                                        <Check size={12} /> Đã cấu hình
                                      </span>
                                    )}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveRoom(index);
                                      }}
                                      className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                      title="Xóa phòng"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  </div>
                                </div>

                                {/* BODY */}
                                {isOpen && (
                                  <div className="p-4 pt-0 border-t border-gray-100 bg-gray-50/50 animate-in slide-in-from-top-2 duration-200">
                                    <div className="space-y-4 mt-4">
                                      <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">
                                          Tên phòng
                                        </label>
                                        <input
                                          value={room.name}
                                          onChange={(e) =>
                                            handleUpdateRoom(
                                              index,
                                              "name",
                                              e.target.value
                                            )
                                          }
                                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-slate-900 outline-none bg-white"
                                          placeholder="Nhập tên phòng"
                                        />
                                      </div>
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <label className="block text-xs font-medium text-gray-500 mb-1">
                                            Giá ghế VIP (VND)
                                          </label>
                                          <input
                                            type="number"
                                            value={room.vipPrice}
                                            onChange={(e) =>
                                              handleUpdateRoom(
                                                index,
                                                "vipPrice",
                                                Number(e.target.value)
                                              )
                                            }
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-slate-900 outline-none bg-white"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-medium text-gray-500 mb-1">
                                            Giá ghế đôi (VND)
                                          </label>
                                          <input
                                            type="number"
                                            value={room.couplePrice}
                                            onChange={(e) =>
                                              handleUpdateRoom(
                                                index,
                                                "couplePrice",
                                                Number(e.target.value)
                                              )
                                            }
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-slate-900 outline-none bg-white"
                                          />
                                        </div>
                                      </div>

                                      {/* BUTTON CONFIG LAYOUT */}
                                      <button
                                        onClick={() =>
                                          handleOpenLayoutModal(index)
                                        }
                                        className={`w-full py-2.5 border rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors
                                        ${room.seatLayout
                                            ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                                            : "border-gray-300 text-gray-700 hover:bg-white bg-white shadow-sm"
                                          }`}
                                      >
                                        {room.seatLayout ? (
                                          <Edit size={14} />
                                        ) : (
                                          <LayoutTemplate size={14} />
                                        )}
                                        {room.seatLayout
                                          ? "Chỉnh sửa bố cục"
                                          : "Cấu hình bố cục phòng"}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {/* BƯỚC 3: CẬP NHẬT HIỂN THỊ */}
                  {currentStep === 3 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm">
                        <h4 className="text-gray-900 font-semibold mb-4">
                          Thông tin rạp
                        </h4>
                        <div className="space-y-2 text-sm text-gray-700">
                          <div className="grid grid-cols-[120px_1fr]">
                            <span className="text-gray-500">Tên:</span>
                            <span className="font-medium">{name}</span>
                          </div>
                          <div className="grid grid-cols-[120px_1fr]">
                            <span className="text-gray-500">Thành phố:</span>
                            <span className="font-medium">{city}</span>
                          </div>
                          <div className="grid grid-cols-[120px_1fr]">
                            <span className="text-gray-500">Địa chỉ:</span>
                            <span className="font-medium">{address}</span>
                          </div>
                        </div>
                      </div>

                      <div className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm">
                        <h4 className="text-gray-900 font-semibold mb-4">
                          Phòng ({rooms.length})
                        </h4>
                        <div className="space-y-3">
                          {rooms.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">
                              Không có phòng nào.
                            </p>
                          ) : (
                            rooms.map((room, index) => (
                              <div
                                key={index}
                                className="flex justify-between items-center p-3 border border-gray-100 rounded-lg bg-gray-50"
                              >
                                <div>
                                  <p className="font-semibold text-gray-800 text-sm">
                                    {room.name}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    VIP:{" "}
                                    {new Intl.NumberFormat("vi-VN").format(
                                      room.vipPrice
                                    )}{" "}
                                    đ | Đôi:{" "}
                                    {new Intl.NumberFormat("vi-VN").format(
                                      room.couplePrice
                                    )}{" "}
                                    đ
                                  </p>
                                </div>
                                <span
                                  className={`text-xs font-medium ${room.seatLayout
                                      ? "text-green-600"
                                      : "text-gray-400"
                                    }`}
                                >
                                  {room.seatLayout
                                    ? "Bố cục đã cấu hình"
                                    : "Chưa có bố cục"}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* FOOTER */}
                <div className=" flex justify-end gap-3 pt-4 border-t border-gray-100">
                  {currentStep === 1 ? (
                    <button
                      onClick={onClose}
                      className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                    >
                      Hủy
                    </button>
                  ) : (
                    <button
                      onClick={() => setCurrentStep((p) => p - 1)}
                      className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                    >
                      Trước
                    </button>
                  )}
                  {currentStep < TOTAL_STEPS ? (
                    <button
                      onClick={() => setCurrentStep((p) => p + 1)}
                      disabled={!canNext}
                      className={`px-6 py-2.5 rounded-lg text-white font-medium transition-all shadow-sm flex items-center gap-2 ${canNext
                          ? "bg-slate-900 hover:bg-slate-800"
                          : "bg-gray-300 cursor-not-allowed"
                        }`}
                    >
                      Tiếp
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmit}
                      className="px-6 py-2.5 rounded-lg text-white font-medium bg-slate-900 hover:bg-slate-800 transition-all shadow-sm"
                    >
                      Tạo rạp
                    </button>
                  )}
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </Dialog>
      </Transition>

      {/* MODAL CẤU HÌNH GHẾ */}
      {selectedRoomIndex !== null && (
        <RoomLayoutModal
          open={layoutModalOpen}
          onOpenChange={setLayoutModalOpen}
          roomName={
            rooms[selectedRoomIndex]?.name || `Room ${selectedRoomIndex + 1}`
          }
          onSave={handleSaveLayout}
          initialLayout={rooms[selectedRoomIndex]?.seatLayout}
        />
      )}
    </Fragment>
  );
}
