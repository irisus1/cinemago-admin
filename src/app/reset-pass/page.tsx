"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function ForgotPasswordPage() {
  const [password, setPassword] = useState("");
  const { resetPassword } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = localStorage.getItem("resetEmail");
    const otp = localStorage.getItem("resetOtp");

    if (!email || !otp) {
      alert("Thiếu email hoặc OTP. Vui lòng thực hiện lại từ đầu.");
      router.push("/forgot-password");
      return;
    }
    try {
      await resetPassword(email, otp, password);
      alert("Đặt lại mật khẩu thành công!");
      localStorage.removeItem("resetEmail");
      localStorage.removeItem("resetOtp");
      router.replace("/login");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Có lỗi xảy ra khi reset mật khẩu";

      if (/invalid|expired otp/i.test(msg)) {
        alert("Mã OTP không hợp lệ hoặc đã hết hạn. Vui lòng lấy mã mới.");
        localStorage.removeItem("resetEmail");
        localStorage.removeItem("resetOtp");
        router.replace("/forgot-pass");
        return;
      }

      alert(msg);
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
      <div className="max-w-md w-full bg-white p-6 rounded shadow">
        <h2 className="text-2xl font-bold mb-4 text-center">
          Đặt lại mật khẩu
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="Mật khẩu mới"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-2 border rounded-md"
          />
          <button
            type="submit"
            className="w-full py-2 bg-[#F25019] text-white rounded-md hover:bg-[#C24014]"
          >
            Đổi mật khẩu
          </button>
        </form>
      </div>
    </div>
  );
}
