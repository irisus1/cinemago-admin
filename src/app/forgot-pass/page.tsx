"use client";

import { useState } from "react";
import { FaEnvelope } from "react-icons/fa";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword(email);
      toast.success("Mã xác thực đã được gửi đến email của bạn.");
      setEmail("");
      router.push("/verifyOTP");
    } catch (err) {
      alert("Không thể gửi yêu cầu, vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: "rgb(245,245,245)",
        backgroundImage: `url("/background.jpg")`, // ảnh để trong public/
        backgroundSize: "cover",
      }}
      className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-md w-full bg-white p-10 rounded-xl shadow-2xl">
        <h2 className="text-center text-2xl font-extrabold text-gray-900 mb-6">
          Quên mật khẩu
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email input */}
          <div className="relative">
            <FaEnvelope className="absolute top-3 left-3 text-gray-400" />
            <input
              type="email"
              placeholder="Nhập email của bạn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-10 py-2 border rounded-md border-gray-300"
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-[#F25019] text-white rounded-md hover:bg-[#C24014]"
          >
            {loading ? "Đang gửi..." : "Gửi link đặt lại mật khẩu"}
          </button>
        </form>

        <p className="mt-6 text-center">
          <a href="/login" className="text-black hover:underline">
            Quay lại đăng nhập
          </a>
        </p>
      </div>
    </div>
  );
}
