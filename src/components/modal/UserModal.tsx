"use client";

import { Fragment, useEffect, useState } from "react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";

import {
  type User,
  type CreateUserRequest,
  cinemaService,
  type Cinema,
} from "@/services";
import { useAuth } from "@/context/AuthContext";

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
  fixedRole?: Role; // New prop
  hideCinemaSelect?: boolean; // New prop
};

export default function UserModal({
  open,
  onClose,
  mode,
  user,
  onSubmit,
  fixedRole,
  hideCinemaSelect = false,
}: UserModalProps) {
  const { user: currentUser } = useAuth();
  const [fullname, setFullname] = useState(user?.fullname ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [gender, setGender] = useState<Gender>("MALE");
  // Default to fixedRole if provided, else EMPLOYEE
  const [role, setRole] = useState<Role>(fixedRole ?? "EMPLOYEE");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Cinema selection
  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [selectedCinemaId, setSelectedCinemaId] = useState<string>("");

  useEffect(() => {
    // Only fetch if we need to show select
    if (hideCinemaSelect) return;

    const fetchCinemas = async () => {
      try {
        const res = await cinemaService.getAllCinemas({ limit: 100 });
        setCinemas(res.data || []);
      } catch (e) {
        console.error(e);
      }
    };
    fetchCinemas();
  }, [hideCinemaSelect]);

  function validatePassword(pw: string) {
    const minLength = pw.length >= 8;
    const hasNumber = /\d/.test(pw);
    const hasSpecial = /[@#$%^&*]/.test(pw);
    return {
      minLength,
      hasNumber,
      hasSpecial,
      valid: minLength && hasNumber && hasSpecial,
    };
  }

  const pwCheck = validatePassword(password);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = emailRegex.test(email);
  const showEmailError = email.length > 0 && !isEmailValid;

  const baseValid = fullname.trim().length > 0 && isEmailValid;

  // Cinema is required if role is NOT ADMIN AND not hidden
  const isCinemaRequired = role !== "ADMIN";
  const isCinemaValid =
    hideCinemaSelect ||
    !isCinemaRequired ||
    (isCinemaRequired && selectedCinemaId.length > 0);

  const valid =
    mode === "create"
      ? baseValid && pwCheck.valid && isCinemaValid
      : baseValid &&
      (password.length === 0 || pwCheck.valid) &&
      isCinemaValid;

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && user) {
      setFullname(user.fullname ?? "");
      setEmail(user.email ?? "");
      setGender((user.gender as Gender) || "MALE");
      const r = user.role as Role;
      setRole(fixedRole ?? (["ADMIN", "MANAGER", "EMPLOYEE"].includes(r) ? r : "EMPLOYEE"));
      setPassword("");
      setSelectedCinemaId(user.cinemaId || "");
    } else {
      setFullname("");
      setEmail("");
      setGender("MALE");
      setRole(fixedRole ?? "EMPLOYEE");
      setPassword("");
      setSelectedCinemaId("");
    }
  }, [open, mode, user, fixedRole]);

  async function handleSubmit() {
    if (!valid || !onSubmit) return;

    try {
      setLoading(true);

      const foundCinema = isCinemaRequired
        ? cinemas.find((c) => c.id === selectedCinemaId)
        : undefined;

      const payload: CreateUserRequest = {
        fullname: fullname.trim(),
        email: email.trim(),
        gender,
        role,
      };

      if (!hideCinemaSelect) {
        if (isCinemaRequired && foundCinema) {
          payload.cinemaId = foundCinema.id;
        } else {
          delete payload.cinemaId;
        }
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
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${(password.length > 0 && !pwCheck.valid)
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
                  {/* Password Requirements UI */}
                  {(mode === "create" || password.length > 0) && (
                    <div className="bg-gray-50 text-gray-700 text-xs p-3 rounded-lg space-y-1 mt-2 border border-gray-100">
                      <p className="font-semibold mb-1">Yêu cầu:</p>
                      <div className={`flex items-center gap-2 ${pwCheck.minLength ? "text-green-600" : "text-gray-500"}`}>
                        <span>{pwCheck.minLength ? "✔" : "•"}</span> Ít nhất 8 ký tự
                      </div>
                      <div className={`flex items-center gap-2 ${pwCheck.hasNumber ? "text-green-600" : "text-gray-500"}`}>
                        <span>{pwCheck.hasNumber ? "✔" : "•"}</span> Chứa ít nhất một số
                      </div>
                      <div className={`flex items-center gap-2 ${pwCheck.hasSpecial ? "text-green-600" : "text-gray-500"}`}>
                        <span>{pwCheck.hasSpecial ? "✔" : "•"}</span> Chứa ký tự đặc biệt (@#$%^&*)
                      </div>
                    </div>
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
                      disabled={!!fixedRole}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${fixedRole ? "bg-gray-100 cursor-not-allowed" : ""
                        }`}
                    >
                      {(currentUser?.role === "ADMIN" || currentUser?.role !== "MANAGER") && (
                        <option value="ADMIN">Quản trị viên</option>
                      )}

                      <option value="MANAGER">Quản lý rạp</option>
                      <option value="EMPLOYEE">Nhân viên bán vé</option>
                    </select>
                  </div>
                </div>

                {
                  !hideCinemaSelect && isCinemaRequired && (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Rạp chiếu phim <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedCinemaId}
                        onChange={(e) => setSelectedCinemaId(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Chọn rạp --</option>
                        {cinemas.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                }
              </div >

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
            </DialogPanel >
          </TransitionChild >
        </div >
      </Dialog >
    </Transition >
  );
}
