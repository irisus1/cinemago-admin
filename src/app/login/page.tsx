"use client";

import { useState, useEffect } from "react"; // Thêm useEffect
import {
  FaEnvelope,
  FaLock,
  FaSpinner,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const ROLE_REDIRECTS = {
  EMPLOYEE: "/admin/ticket",
  MANAGER: "/admin/manager-dashboard",
  ADMIN: "/admin/dashboard",
  // Bạn có thể thêm role mới dễ dàng ở đây mà không cần sửa logic code
};

export default function LoginPage() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    router.prefetch("/admin/dashboard");
  }, [router]);

  const validateForm = () => {
    if (!formData.username || !formData.password) {
      toast.warning("Không được để trống!");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    try {
      await login(formData.username, formData.password);
      const stored = localStorage.getItem("user");
      const user = stored ? JSON.parse(stored) : null;

      if (user && !Object.keys(ROLE_REDIRECTS).includes(user.role)) {
        toast.error("Bạn không có quyền truy cập trang quản trị!");
        setLoading(false);
        return;
      }

      toast.success("Đăng nhập thành công!");

      const destination =
        ROLE_REDIRECTS[user.role as keyof typeof ROLE_REDIRECTS] ||
        "/admin/dashboard";
      router.replace(destination);
    } catch (error) {
      toast.error("Đăng nhập thất bại!");
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: "rgb(245,245,245)",
        backgroundImage: `url("/background.jpg")`,
        backgroundSize: "cover",
      }}
      className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-2xl">
        <h2 className="text-center text-3xl font-extrabold text-gray-900">
          Đăng nhập
        </h2>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* Username */}
          <div className="relative">
            <FaEnvelope className="absolute top-3 left-3 text-gray-400" />
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
              className="w-full px-10 py-2 border rounded-md border-gray-300"
              placeholder="Nhập tài khoản hoặc email"
            />
          </div>

          {/* Password */}
          <div className="relative mt-4">
            <FaLock className="absolute top-3 left-3 text-gray-400" />
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="w-full px-10 py-2 border rounded-md border-gray-300"
              placeholder="Nhập mật khẩu..."
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute top-2 right-3 text-gray-400"
            >
              {showPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
            </button>
          </div>

          <p className="text-right">
            <a href="/forgot-pass" className="text-black hover:underline">
              Quên mật khẩu?
            </a>
          </p>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 text-white rounded-md flex items-center justify-center transition-all ${
              loading
                ? "bg-indigo-400 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {loading ? (
              <>
                <FaSpinner className="animate-spin text-xl mr-2" />
                {/* Thay đổi text để user biết đang chuyển trang */}
                <span>Đang chuyển hướng...</span>
              </>
            ) : (
              "Đăng nhập"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
