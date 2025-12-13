"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function VerifyOTPAndResetPage() {
  const { resetPassword, forgotPassword } = useAuth();
  const router = useRouter();

  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const [timeLeft, setTimeLeft] = useState(300);

  useEffect(() => {
    const email = localStorage.getItem("resetEmail");
    if (!email) {
      toast.error("Không tìm thấy email yêu cầu. Vui lòng thử lại.");
      router.push("/forgot-password");
    }
  }, [router]);

  useEffect(() => {
    if (timeLeft <= 0) return;

    const intervalId = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleResendOtp = async () => {
    const email = localStorage.getItem("resetEmail");

    if (!email) {
      toast.error(
        "Không tìm thấy email. Vui lòng quay lại trang quên mật khẩu."
      );
      router.push("/forgot-password");
      return;
    }

    setIsResending(true);
    try {
      await forgotPassword(email);

      toast.success("Mã OTP mới đã được gửi tới email của bạn!");

      setTimeLeft(300);
      setOtp("");
    } catch (error) {
      toast.error("Gửi lại thất bại. Vui lòng thử lại sau.");
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.warning("Mật khẩu xác nhận không khớp!");
      return;
    }

    if (password.length < 6) {
      toast.warning("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    setLoading(true);
    const email = localStorage.getItem("resetEmail");

    if (!email) {
      toast.error("Lỗi: Thiếu email. Vui lòng thực hiện lại.");
      router.push("/forgot-password");
      return;
    }

    try {
      await resetPassword(email, otp, password);

      localStorage.removeItem("resetEmail");
      router.replace("/login");
    } catch {
      const msg = "Có lỗi xảy ra";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: "rgb(245,245,245)",
        backgroundImage: `url("/loginBG.png")`,
        backgroundSize: "cover",
      }}
      className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-2xl">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-900">
          Xác thực & Đổi mật khẩu
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Khu vực OTP và Timer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mã OTP
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Nhập mã OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                className="flex-1 px-4 py-2 border rounded-md border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <div
                className={`flex items-center justify-center px-4 py-2 rounded-md font-mono font-bold border ${
                  timeLeft > 0
                    ? "bg-gray-100 text-indigo-600 border-gray-300"
                    : "bg-red-50 text-red-600 border-red-200"
                }`}
                style={{ minWidth: "80px" }}
              >
                {timeLeft > 0 ? formatTime(timeLeft) : "00:00"}
              </div>
            </div>
            {timeLeft === 0 && (
              <p className="text-xs text-red-500 mt-1">
                Mã OTP đã hết hạn. Vui lòng gửi lại yêu cầu.
              </p>
            )}
          </div>

          <div className="border-t border-gray-200 my-4"></div>

          {/* Mật khẩu mới */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mật khẩu mới
            </label>
            <input
              type="password"
              placeholder="Nhập mật khẩu mới"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border rounded-md border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Xác nhận mật khẩu */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Xác nhận mật khẩu
            </label>
            <input
              type="password"
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className={`w-full px-4 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 ${
                confirmPassword && password !== confirmPassword
                  ? "border-red-500 focus:border-red-500"
                  : "border-gray-300"
              }`}
            />
          </div>

          {/* Nút Submit */}
          <button
            type="submit"
            disabled={loading || timeLeft === 0}
            className="w-full py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? "Đang xử lý..." : "Xác nhận & Đổi mật khẩu"}
          </button>
        </form>

        {/* Nút Gửi lại mã OTP */}
        <div className="mt-4 text-center">
          <button
            type="button" // Quan trọng: type button để không kích hoạt submit form
            onClick={handleResendOtp}
            disabled={isResending}
            className={`text-sm underline ${
              isResending
                ? "text-gray-400 cursor-wait"
                : "text-gray-500 hover:text-indigo-600 cursor-pointer"
            }`}
          >
            {isResending
              ? "Đang gửi lại..."
              : "Bạn chưa nhận được mã? Gửi lại OTP"}
          </button>
        </div>
      </div>
    </div>
  );
}
