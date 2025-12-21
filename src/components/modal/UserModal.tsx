"use client";

import { Fragment, useEffect, useState } from "react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";

import { type User, type CreateUserRequest, cinemaService, type Cinema } from "@/services";

type Gender = "MALE" | "FEMALE" | "OTHER";
type Role = "ADMIN" | "MANAGER" | "EMPLOYEE";

type UserModalProps = {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  user?: User;
  onSubmit?: (
    payload: CreateUserRequest,
    mode: "create" | "edit",
    user?: User
  ) => void | Promise<void>;
};

export default function UserModal({
  open,
  onClose,
  mode,
  user,
  onSubmit,
}: UserModalProps) {
  const [fullname, setFullname] = useState(user?.fullname ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [gender, setGender] = useState<Gender>("MALE");
  // Default to EMPLOYEE instead of ADMIN for safety, or ADMIN if that's the only other option? 
  // Requirement: "ADMIN, MANAGER, EMPLOYEE". Default to EMPLOYEE is safer.
  const [role, setRole] = useState<Role>("EMPLOYEE");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Cinema selection
  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [selectedCinemaId, setSelectedCinemaId] = useState<string>("");

  useEffect(() => {
    // Fetch cinemas when modal opens or on mount
    const fetchCinemas = async () => {
      try {
        const res = await cinemaService.getAllCinemas({ limit: 100 });
        setCinemas(res.data || []);
      } catch (e) {
        console.error(e);
      }
    }
    fetchCinemas();
  }, []);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z]).{8,}$/;

  const isEmailValid = emailRegex.test(email);
  const isPasswordValid = passwordRegex.test(password);

  const showEmailError = email.length > 0 && !isEmailValid;
  const showPasswordError = password.length > 0 && !isPasswordValid;

  const baseValid = fullname.trim().length > 0 && isEmailValid;

  // Cinema is required if role is NOT ADMIN
  const isCinemaRequired = role !== "ADMIN";
  const isCinemaValid = !isCinemaRequired || (isCinemaRequired && selectedCinemaId.length > 0);

  const valid =
    mode === "create"
      ? baseValid && isPasswordValid && isCinemaValid
      : baseValid && (password.length === 0 || isPasswordValid) && isCinemaValid;

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && user) {
      setFullname(user.fullname ?? "");
      setEmail(user.email ?? "");
      setGender((user.gender as Gender) || "MALE");
      // Cast role strictly
      const r = (user.role as Role);
      setRole((["ADMIN", "MANAGER", "EMPLOYEE"].includes(r) ? r : "EMPLOYEE") as Role);
      setPassword("");
      setSelectedCinemaId(user.cinemaId || "");
    } else {
      setFullname("");
      setEmail("");
      setGender("MALE");
      setRole("EMPLOYEE");
      setPassword("");
      setSelectedCinemaId("");
    }
  }, [open, mode, user]);

  async function handleSubmit() {
    if (!valid || !onSubmit) return;

    try {
      setLoading(true);

      const foundCinema = isCinemaRequired ? cinemas.find(c => c.id === selectedCinemaId) : undefined;

      // Type assertion or update service types if needed
      const payload: any = {
        fullname: fullname.trim(),
        email: email.trim(),
        gender,
        role,
      };

      if (isCinemaRequired && foundCinema) {
        payload.cinemaId = foundCinema.id;
        payload.cinemaName = foundCinema.name;
      } else {
        payload.cinemaId = null;
        payload.cinemaName = null;
      }

      if (mode === "create") {
        payload.password = password.trim();
      } else if (password.trim()) {
        payload.password = password.trim();
      }

      await onSubmit(payload, mode, user);
    } finally {
      setLoading(false);
    }
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
            <DialogPanel className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
              <DialogTitle className="text-lg font-semibold mb-3">
                {mode === "create" ? "Thêm người dùng" : "Chỉnh sửa người dùng"}
              </DialogTitle>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Họ tên <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={fullname}
                    onChange={(e) => setFullname(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nhập họ tên"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${showEmailError
                      ? "border-red-500 focus:ring-red-500"
                      : "focus:ring-blue-500"
                      }`}
                    placeholder="Nhập email"
                    type="email"
                  />
                  {showEmailError && (
                    <p className="text-red-500 text-xs mt-1">
                      Email không đúng định dạng.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Mật khẩu{" "}
                    {mode === "create" && (
                      <span className="text-red-500">*</span>
                    )}
                  </label>
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${showPasswordError
                      ? "border-red-500 focus:ring-red-500"
                      : "focus:ring-blue-500"
                      }`}
                    type="password"
                    placeholder={
                      mode === "create"
                        ? "Nhập mật khẩu"
                        : "Để trống nếu không đổi mật khẩu"
                    }
                  />
                  {showPasswordError && (
                    <p className="text-red-500 text-xs mt-1">
                      Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa và chữ
                      thường.
                    </p>
                  )}
                  {mode === "create" && password.length === 0 && (
                    <p className="text-gray-500 text-xs mt-1">
                      Yêu cầu: 8+ ký tự, 1 chữ hoa, 1 chữ thường.
                    </p>
                  )}
                </div>

                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">
                      Giới tính
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as Gender)}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="MALE">Nam</option>
                      <option value="FEMALE">Nữ</option>
                      <option value="OTHER">Khác</option>
                    </select>
                  </div>

                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">
                      Vai trò
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as Role)}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ADMIN">Quản trị viên</option>
                      <option value="MANAGER">Quản lý rạp</option>
                      <option value="EMPLOYEE">Nhân viên bán vé</option>
                    </select>
                  </div>
                </div>

                {isCinemaRequired && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Rạp chiếu phim <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedCinemaId}
                      onChange={e => setSelectedCinemaId(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Chọn rạp --</option>
                      {cinemas.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}
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
                  className={`px-4 py-2 rounded-lg text-white transition-colors ${valid && !loading
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-gray-400 cursor-not-allowed"
                    }`}
                >
                  {mode === "create"
                    ? loading
                      ? "Đang tạo..."
                      : "Thêm"
                    : loading
                      ? "Đang lưu..."
                      : "Lưu"}
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
