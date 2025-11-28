"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { Modal } from "@/components/Modal";
import RefreshLoader from "@/components/Loading";

// ====== Services (điều chỉnh theo project) ======
import { authService } from "@/services";
import { toast } from "sonner";

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

export default function ProfilePassword({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false);

  // change password
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [cfPw, setCfPw] = useState("");
  const [showCurPw, setShowCurPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showCfPw, setShowCfPw] = useState(false);
  const pwCheck = validatePassword(newPw);

  // dialogs
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMessage, setDialogMessage] = useState<React.ReactNode>("");
  const [onConfirm, setOnConfirm] = useState<() => void>(() => () => {});

  // change password
  const handleChangePassword = async () => {
    setLoading(true);
    try {
      await authService.changePassword({
        oldPassword: curPw,
        newPassword: newPw,
      });
      setCurPw("");
      setNewPw("");
      setCfPw("");
      setDialogTitle("Đổi mật khẩu thành công");
      setDialogMessage(
        "Bạn đã đổi mật khẩu. Hãy dùng mật khẩu mới cho lần đăng nhập tiếp theo."
      );
      setIsSuccessDialogOpen(true);
    } catch (e) {
      toast.error("Đổi mật khẩu thất bại. Kiểm tra lại mật khẩu hiện tại.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openConfirm = (
    title: string,
    message: React.ReactNode,
    action: () => void
  ) => {
    setDialogTitle(title);
    setDialogMessage(message);
    setOnConfirm(() => action);
    setIsConfirmDialogOpen(true);
  };

  const onClickChangePassword = () => {
    openConfirm(
      "Xác nhận đổi mật khẩu",
      <>Bạn có chắc chắn muốn đổi mật khẩu?</>,
      async () => {
        setIsConfirmDialogOpen(false);
        await handleChangePassword();
      }
    );
  };

  return (
    <div className="w-full">
      <Card className="shadow-none border-none">
        <CardContent className=" space-y-8">
          {/* --- MẬT KHẨU HIỆN TẠI --- */}
          <div className="space-y-1">
            <Label>Mật khẩu hiện tại</Label>
            <div className="relative">
              <Input
                type={showCurPw ? "text" : "password"}
                placeholder="Nhập mật khẩu hiện tại của bạn"
                value={curPw}
                maxLength={30}
                onChange={(e) => setCurPw(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2"
                onClick={() => setShowCurPw((s) => !s)}
              >
                {showCurPw ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* --- MẬT KHẨU MỚI --- */}
          <div className="space-y-2">
            <Label>Mật khẩu mới</Label>
            <div className="relative">
              <Input
                type={showNewPw ? "text" : "password"}
                placeholder="Nhập mật khẩu mới của bạn"
                value={newPw}
                maxLength={30}
                onChange={(e) => setNewPw(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2"
                onClick={() => setShowNewPw((s) => !s)}
              >
                {showNewPw ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* --- XÁC NHẬN --- */}
          <div className="space-y-2">
            <Label>Xác nhận mật khẩu mới</Label>
            <div className="relative">
              <Input
                type={showCfPw ? "text" : "password"}
                placeholder="Xác nhận mật khẩu mới của bạn"
                value={cfPw}
                maxLength={30}
                onChange={(e) => setCfPw(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2"
                onClick={() => setShowCfPw((s) => !s)}
              >
                {showCfPw ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* --- YÊU CẦU MẬT KHẨU (THEO MẪU) --- */}
          <div className="bg-gray-100 text-gray-700 text-sm p-4 rounded-lg space-y-2">
            <p className="font-semibold">Yêu cầu mật khẩu:</p>
            <ul className="space-y-1">
              <li
                className={
                  pwCheck.minLength ? "text-green-600" : "text-gray-700"
                }
              >
                {pwCheck.minLength ? "✔" : "•"} Ít nhất 8 ký tự
              </li>
              <li
                className={
                  pwCheck.hasNumber ? "text-green-600" : "text-gray-700"
                }
              >
                {pwCheck.hasNumber ? "✔" : "•"} Chứa ít nhất một số
              </li>
              <li
                className={
                  pwCheck.hasSpecial ? "text-green-600" : "text-gray-700"
                }
              >
                {pwCheck.hasSpecial ? "✔" : "•"} Chứa ít nhất một ký tự đặc biệt
                (@#$%^&*)
              </li>
            </ul>
          </div>

          {/* --- BUTTONS --- */}
          <div className="flex justify-end gap-3 ">
            <Button variant="outline" onClick={onClose}>
              Hủy
            </Button>

            <Button
              disabled={
                loading || !curPw || !newPw || newPw !== cfPw || !pwCheck.valid
              }
              onClick={onClickChangePassword}
            >
              Đổi mật khẩu
            </Button>
          </div>
        </CardContent>
      </Card>

      <Modal
        isOpen={isConfirmDialogOpen}
        onClose={() => setIsConfirmDialogOpen(false)}
        type="info"
        title={dialogTitle}
        message={dialogMessage}
        onCancel={() => setIsConfirmDialogOpen(false)}
        cancelText="Hủy"
        onConfirm={() => {
          onConfirm();
          setIsConfirmDialogOpen(false);
        }}
        confirmText="Xác nhận"
      />

      <Modal
        isOpen={isSuccessDialogOpen}
        onClose={() => setIsSuccessDialogOpen(false)}
        type="success"
        title={dialogTitle}
        message={dialogMessage}
        confirmText="Đóng"
      />

      <RefreshLoader isOpen={loading} />
    </div>
  );
}
