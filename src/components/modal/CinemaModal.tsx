"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import type { Cinema } from "@/services";
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

import { RoomLayoutModal } from "@/app/admin/rooms/RoomLayoutModal";

// Bạn nên import { SeatLayout } from "@/types/seat"; nếu có
import type { SeatCell } from "@/services";
type SeatLayout = SeatCell;

export type RoomDraft = {
  id: string;
  name: string;
  priceVIP: number;
  priceDouble: number;
  layout?: SeatLayout;
};

type CinemaFormPayload = {
  name: string;
  city: string;
  address: string;
  longitude: number | null;
  latitude: number | null;
  isActive: boolean;
  rooms: RoomDraft[];
};

type CinemaModalProps = {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  cinema?: Cinema;
  onSubmit?: (
    payload: CinemaFormPayload,
    mode: "create" | "edit",
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
  const [longitude, setLongitude] = useState<string>("");
  const [latitude, setLatitude] = useState<string>("");

  // --- STATE BƯỚC 2: DANH SÁCH PHÒNG ---
  const [rooms, setRooms] = useState<RoomDraft[]>([]);

  // [MỚI] State quản lý đóng/mở từng phòng (Accordion)
  const [openRooms, setOpenRooms] = useState<Set<string>>(new Set());

  // [MỚI] State quản lý Modal cấu hình ghế
  const [layoutModalOpen, setLayoutModalOpen] = useState(false);
  const [selectedRoomIndex, setSelectedRoomIndex] = useState<number | null>(
    null
  );

  // --- RESET KHI MỞ MODAL ---
  useEffect(() => {
    if (!open) return;
    setCurrentStep(1);

    if (mode === "edit" && cinema) {
      setName(cinema.name ?? "");
      setCity(cinema.city ?? "");
      setAddress(cinema.address ?? "");
      setLongitude(cinema.longitude != null ? String(cinema.longitude) : "");
      setLatitude(cinema.latitude != null ? String(cinema.latitude) : "");

      const found = VIETNAM_PROVINCES.find(
        (p) =>
          p.label.trim().toLowerCase() ===
          (cinema.city ?? "").trim().toLowerCase()
      );
      setCityId(found?.value ?? "");
      setRooms([]);
      setOpenRooms(new Set()); // Reset trạng thái mở
    } else {
      setName("");
      setCity("");
      setCityId("");
      setAddress("");
      setLongitude("");
      setLatitude("");
      setRooms([]);
      setOpenRooms(new Set());
    }
  }, [open, mode, cinema]);

  // --- LOGIC PHÒNG (STEP 2) ---
  const handleAddRoom = () => {
    const newId = Date.now().toString();
    const newRoom: RoomDraft = {
      id: newId,
      name: "",
      priceVIP: 0,
      priceDouble: 0,
      layout: undefined,
    };
    setRooms([...rooms, newRoom]);
    // Tự động mở phòng vừa thêm
    setOpenRooms((prev) => new Set(prev).add(newId));
  };

  const handleRemoveRoom = (id: string) => {
    setRooms(rooms.filter((r) => r.id !== id));
    // Xóa khỏi danh sách đang mở
    const newOpen = new Set(openRooms);
    newOpen.delete(id);
    setOpenRooms(newOpen);
  };

  const handleUpdateRoom = (id: string, field: keyof RoomDraft, value: any) => {
    setRooms(rooms.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  // [MỚI] Logic Toggle đóng/mở phòng
  const toggleRoom = (id: string) => {
    const newOpen = new Set(openRooms);
    if (newOpen.has(id)) {
      newOpen.delete(id);
    } else {
      newOpen.add(id);
    }
    setOpenRooms(newOpen);
  };

  // [MỚI] Mở Modal cấu hình Layout
  const handleOpenLayoutModal = (index: number) => {
    setSelectedRoomIndex(index);
    setLayoutModalOpen(true);
  };

  // [MỚI] Lưu Layout từ Modal
  const handleSaveLayout = (layout: SeatLayout) => {
    if (selectedRoomIndex !== null) {
      // Cập nhật layout vào phòng tương ứng
      const updatedRooms = [...rooms];
      updatedRooms[selectedRoomIndex] = {
        ...updatedRooms[selectedRoomIndex],
        layout: layout,
      };
      setRooms(updatedRooms);

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
    return rooms.every((r) => r.name.trim() !== "" && r.layout);
  }, [rooms]);

  const canNext = useMemo(() => {
    if (currentStep === 1) return isStep1Valid;
    if (currentStep === 2) return isStep2Valid;
    return true;
  }, [currentStep, isStep1Valid, isStep2Valid]);

  // --- SUBMIT ---
  const toNumOrNull = (s: string) => {
    const t = s.trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  };

  async function handleSubmit() {
    if (!onSubmit) return;
    const payload: CinemaFormPayload = {
      name: name.trim(),
      city: city.trim(),
      address: address.trim(),
      longitude: toNumOrNull(longitude),
      latitude: toNumOrNull(latitude),
      isActive: true,
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
                {/* HEADER: TITLE & STEPPER */}
                <div className="mb-6">
                  <DialogTitle className="text-xl font-bold text-gray-900 mb-1">
                    {mode === "create" ? "Tạo rạp mới" : "Chỉnh sửa rạp"}
                  </DialogTitle>
                  <p className="text-sm text-gray-500 mb-6">
                    {currentStep === 1 && "Bước 1 / 3: Điền thông tin rạp"}
                    {currentStep === 2 && "Bước 2 / 3: Thêm phòng"}
                    {currentStep === 3 && "Bước 3 / 3: Xem lại và tạo"}
                  </p>

                  {/* Stepper Line - Code đã sửa ở câu trước */}
                  <div className="flex items-center justify-between ">
                    {[1, 2, 3].map((step) => (
                      <div key={step} className="flex items-center flex-1">
                        <div
                          className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                            currentStep >= step
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background border-muted-foreground"
                          }`}
                        >
                          {step}
                        </div>
                        {step < 3 && (
                          <div
                            className={`flex-1 h-0.5 mx-2 ${
                              currentStep > step
                                ? "bg-primary"
                                : "bg-muted-foreground"
                            }`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-1 py-1 min-h-[300px]">
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all placeholder:text-gray-400"
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
                      <div>
                        <label className="block text-sm font-semibold mb-1.5 text-gray-800">
                          Địa chỉ <span className="text-red-500">*</span>
                        </label>
                        <input
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all placeholder:text-gray-400"
                          placeholder="Nhập địa chỉ chi tiết"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold mb-1.5 text-gray-800">
                            Kinh độ (Tùy chọn)
                          </label>
                          <input
                            type="number"
                            value={longitude}
                            onChange={(e) => setLongitude(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                            placeholder="Ví dụ: 40.7128"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold mb-1.5 text-gray-800">
                            Vĩ độ (Tùy chọn)
                          </label>
                          <input
                            type="number"
                            value={latitude}
                            onChange={(e) => setLatitude(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                            placeholder="Ví dụ: -74.0060"
                          />
                        </div>
                      </div>
                    </div>
                  )}

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
                            const isOpen = openRooms.has(room.id);
                            return (
                              <div
                                key={room.id}
                                className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden transition-all duration-200"
                              >
                                {/* HEADER CARD */}
                                <div
                                  className="flex justify-between items-center p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                                  onClick={() => toggleRoom(room.id)}
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
                                    {/* Hiển thị badge nếu đã có layout */}
                                    {room.layout && (
                                      <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100 flex items-center gap-1">
                                        <Check size={12} /> Đã cấu hình
                                      </span>
                                    )}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveRoom(room.id);
                                      }}
                                      className="text-gray-400 text-red-500 transition-colors p-1 cursor-pointer"
                                      title="Xóa phòng"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  </div>
                                </div>

                                {/* COLLAPSIBLE BODY */}
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
                                              room.id,
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
                                            value={room.priceVIP}
                                            onChange={(e) =>
                                              handleUpdateRoom(
                                                room.id,
                                                "priceVIP",
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
                                            value={room.priceDouble}
                                            onChange={(e) =>
                                              handleUpdateRoom(
                                                room.id,
                                                "priceDouble",
                                                Number(e.target.value)
                                              )
                                            }
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-slate-900 outline-none bg-white"
                                          />
                                        </div>
                                      </div>

                                      {/* NÚT CẤU HÌNH */}
                                      <button
                                        onClick={() =>
                                          handleOpenLayoutModal(index)
                                        }
                                        className={`w-full py-2.5 border rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors
                                                    ${
                                                      room.layout
                                                        ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                                                        : "border-gray-300 text-gray-700 hover:bg-white bg-white shadow-sm"
                                                    }`}
                                      >
                                        {room.layout ? (
                                          <Edit size={14} />
                                        ) : (
                                          <LayoutTemplate size={14} />
                                        )}
                                        {room.layout
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

                  {currentStep === 3 && (
                    /* --- BƯỚC 3: HIỂN THỊ TÓM TẮT --- */
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
                            rooms.map((room) => (
                              <div
                                key={room.id}
                                className="flex justify-between items-center p-3 border border-gray-100 rounded-lg bg-gray-50"
                              >
                                <div>
                                  <p className="font-semibold text-gray-800 text-sm">
                                    {room.name}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    VIP:{" "}
                                    {new Intl.NumberFormat("vi-VN").format(
                                      room.priceVIP
                                    )}{" "}
                                    đ | Đôi:{" "}
                                    {new Intl.NumberFormat("vi-VN").format(
                                      room.priceDouble
                                    )}{" "}
                                    đ
                                  </p>
                                </div>
                                <span
                                  className={`text-xs font-medium ${
                                    room.layout
                                      ? "text-green-600"
                                      : "text-gray-400"
                                  }`}
                                >
                                  {room.layout
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
                      className={`px-6 py-2.5 rounded-lg text-white font-medium transition-all shadow-sm flex items-center gap-2 ${
                        canNext
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

      {/* --- [QUAN TRỌNG] MODAL CẤU HÌNH GHẾ --- */}
      {selectedRoomIndex !== null && (
        <RoomLayoutModal
          open={layoutModalOpen}
          onOpenChange={setLayoutModalOpen}
          // Truyền tên phòng để hiển thị title
          roomName={rooms[selectedRoomIndex]?.name || "Phòng"}
          // Callback khi user bấm Save trong modal
          onSave={handleSaveLayout}
          // Truyền layout hiện tại (nếu có) để sửa
          initialLayout={rooms[selectedRoomIndex]?.layout}
        />
      )}
    </Fragment>
  );
}
