"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const [otp, setOtp] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("resetOtp", otp); // lưu OTP
    alert("OTP đã được lưu, mời nhập mật khẩu mới");
    router.push("/reset-pass"); // chuyển sang trang reset pass
  };

  return (
    <div
      style={{
        backgroundColor: "rgb(245,245,245)",
        backgroundImage: `url("/loginBG.png")`, // ảnh để trong public/
        backgroundSize: "cover",
      }}
      className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-md w-full bg-white p-6 rounded shadow">
        <h2 className="text-2xl font-bold mb-4 text-center">Nhập OTP</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Nhập mã OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
            className="w-full px-4 py-2 border rounded-md"
          />
          <button
            type="submit"
            className="w-full py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Xác nhận OTP
          </button>
        </form>
      </div>
    </div>
  );
}
