"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, CheckCircle2, AlertCircle, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import RefreshLoader from "@/components/Loading";

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

export default function ProfilePassword({
  onClose,
  onChildModalChange,
}: {
  onClose: () => void;
  onChildModalChange?: (hidden: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);

  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [cfPw, setCfPw] = useState("");
  const [showCurPw, setShowCurPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showCfPw, setShowCfPw] = useState(false);
  const pwCheck = validatePassword(newPw);

  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMessage, setDialogMessage] = useState<React.ReactNode>("");
  const [onConfirm, setOnConfirm] = useState<() => void>(() => () => {});

  useEffect(() => {
    onChildModalChange?.(isConfirmDialogOpen || isSuccessDialogOpen);
  }, [isConfirmDialogOpen, isSuccessDialogOpen, onChildModalChange]);

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
        "Bạn đã đổi mật khẩu. Hãy dùng mật khẩu mới cho lần đăng nhập tiếp theo.",
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
    action: () => void,
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
      },
    );
  };

  return (
    <div className="w-full">
      <Card className="shadow-none border-none">
        <CardContent className=" space-y-8">
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

      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white rounded-3xl shadow-2xl">
          <div className="p-8 text-center relative">
            <button
              onClick={() => setIsConfirmDialogOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
            <div className="w-20 h-20 bg-blue-50 border-4 border-blue-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-blue-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Xác nhận đổi mật khẩu
            </h2>
            <div className="text-gray-600 mb-6 leading-relaxed">
              {dialogMessage}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setIsConfirmDialogOpen(false)}
                className="w-full py-3.5 px-6 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl transition-all duration-200"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  setIsConfirmDialogOpen(false);
                }}
                className="w-full py-3.5 px-6 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isSuccessDialogOpen} onOpenChange={setIsSuccessDialogOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white rounded-3xl shadow-2xl">
          <div className="p-8 text-center relative">
            <button
              onClick={() => setIsSuccessDialogOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>

            {dialogTitle.includes("thất bại") ? (
              <div className="w-20 h-20 bg-red-50 border-4 border-red-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
            ) : (
              <div className="w-20 h-20 bg-green-50 border-4 border-green-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
            )}

            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              {dialogTitle}
            </h2>
            <div className="text-gray-600 mb-6 leading-relaxed">
              {dialogMessage}
            </div>

            <button
              onClick={() => setIsSuccessDialogOpen(false)}
              className={`w-full py-3.5 px-6 ${dialogTitle.includes("thất bại") ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"} text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl`}
            >
              Đóng
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <RefreshLoader isOpen={loading} />
    </div>
  );
}
