"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Modal } from "@/components/Modal";
import RefreshLoader from "@/components/Loading";
import { useProfileLogic, type GenderVN } from "@/hooks/useProfileLogic";

export default function ProfilePage() {
  const {
    me,
    loading,
    dirty,
    normalize,
    fullName,
    setFullName,
    genderVN,
    setGenderVN,
    avatarPreview,
    onPickAvatar,
    curPw,
    setCurPw,
    newPw,
    setNewPw,
    cfPw,
    setCfPw,
    showCurPw,
    setShowCurPw,
    showNewPw,
    setShowNewPw,
    showCfPw,
    setShowCfPw,
    pwTooLong,
    setPwTooLong,
    isSuccessDialogOpen,
    setIsSuccessDialogOpen,
    isConfirmDialogOpen,
    setIsConfirmDialogOpen,
    dialogTitle,
    dialogMessage,
    onConfirm,
    onClickSave,
    onClickChangePassword,
  } = useProfileLogic();

  return (
    <div className="space-y-6">
      {/* Profile info */}
      <Card className="shadow-sm">
        <CardHeader className="border-b">
          <CardTitle className="text-2xl">Thông tin cá nhân</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {loading && (
            <div className="text-sm text-muted-foreground">
              Đang tải dữ liệu…
            </div>
          )}

          {me && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: avatar + static */}
              <div className="lg:col-span-1 space-y-4">
                <div className="flex items-center gap-4">
                  <label
                    htmlFor="avatar-input"
                    className="h-16 w-16 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center cursor-pointer ring-1 ring-gray-200 hover:ring-2 hover:ring-primary transition"
                    title="Bấm để đổi ảnh đại diện"
                  >
                    {avatarPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarPreview}
                        alt="avatar preview"
                        className="h-full w-full object-cover"
                      />
                    ) : me?.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={me.avatarUrl}
                        alt="avatar"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ShieldCheck className="h-8 w-8 text-gray-400" />
                    )}
                  </label>

                  {/* input file ẩn */}
                  <input
                    id="avatar-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={onPickAvatar}
                  />
                  <div>
                    <div className="font-semibold">{me.email}</div>
                    <div className="text-xs text-muted-foreground">Email</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Vai trò:
                  </span>
                  <Badge variant="secondary">
                    {String(me.role).toUpperCase()}
                  </Badge>
                </div>

                <div className="text-sm text-muted-foreground">
                  Tạo lúc: {new Date(me.createdAt ?? 0).toLocaleString("vi-VN")}
                  <br />
                  Cập nhật:{" "}
                  {new Date(me.updatedAt ?? 0).toLocaleString("vi-VN")}
                </div>
              </div>

              {/* Right: editable form */}
              <div className="lg:col-span-2 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Họ tên</Label>
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Nhập họ tên"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Giới tính</Label>
                    <select
                      className="h-10 rounded-md border px-3 w-full"
                      value={genderVN}
                      onChange={(e) => setGenderVN(e.target.value as GenderVN)}
                    >
                      <option value="—">—</option>
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={onClickSave}
                    disabled={loading || !dirty || normalize(fullName) === ""}
                  >
                    Lưu thay đổi
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change password */}
      <Card className="shadow-sm">
        <CardHeader className="border-b">
          <CardTitle className="text-2xl">Đổi mật khẩu</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Mật khẩu hiện tại</Label>
              <div className="relative">
                <Input
                  type={showCurPw ? "text" : "password"}
                  value={curPw}
                  onChange={(e) => setCurPw(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
                  onClick={() => setShowCurPw((s) => !s)}
                  aria-label="toggle current password"
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
                  value={newPw}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.length > 30) {
                      setPwTooLong(true);
                      return;
                    }
                    setPwTooLong(false);
                    setNewPw(val);
                  }}
                  placeholder="Tối thiểu 8 ký tự"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
                  onClick={() => setShowNewPw((s) => !s)}
                  aria-label="toggle new password"
                >
                  {showNewPw ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {pwTooLong && (
                <div className="text-xs text-red-600">
                  Mật khẩu không được vượt quá 30 ký tự
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Nhập lại mật khẩu mới</Label>
              <div className="relative">
                <Input
                  type={showCfPw ? "text" : "password"}
                  value={cfPw}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.length > 30) {
                      setPwTooLong(true);
                      return;
                    }
                    setPwTooLong(false);
                    setCfPw(val);
                  }}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
                  onClick={() => setShowCfPw((s) => !s)}
                  aria-label="toggle confirm password"
                >
                  {showCfPw ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {cfPw && cfPw !== newPw && (
                <div className="text-xs text-red-600">
                  Mật khẩu xác nhận không khớp
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={onClickChangePassword}
              disabled={loading || !curPw || !newPw || newPw !== cfPw}
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
