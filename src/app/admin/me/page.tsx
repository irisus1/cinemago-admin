"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import Dialog from "@/components/ConfirmDialog";
import SuccessDialog from "@/components/SuccessDialog";
import RefreshLoader from "@/components/Loading";
import { cn } from "@/lib/utils";

// ====== Services (điều chỉnh theo project) ======
import { getMe } from "@/services/UserService";
import { changePassword } from "@/services/AuthService";

// ====== Types ======
type Me = {
  id: string;
  email: string;
  fullname: string; // BE trả "fullname"
  gender: "MALE" | "FEMALE" | "OTHER" | string | null;
  role: string;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

// ====== Helpers ======
type GenderVN = "Nam" | "Nữ" | "Khác" | "—";
const isGenderVN = (x: string): x is Exclude<GenderVN, "—"> =>
  x === "Nam" || x === "Nữ" || x === "Khác";

const mapGender = (v: unknown): GenderVN => {
  if (v == null) return "—";
  const s = String(v).trim();
  if (!s) return "—";
  const key = s.normalize("NFC").toLowerCase();
  if (["male", "m", "nam"].includes(key)) return "Nam";
  if (["female", "f", "nu", "nữ"].includes(key)) return "Nữ";
  if (["other", "khac", "khác"].includes(key)) return "Khác";
  if (isGenderVN(s)) return s;
  return "Khác";
};

const normalizeGenderToEnum = (v: GenderVN): "MALE" | "FEMALE" | "OTHER" => {
  if (v === "Nam") return "MALE";
  if (v === "Nữ") return "FEMALE";
  return "OTHER";
};

// đánh giá độ mạnh mật khẩu (0–4)
function passwordScore(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}
const scoreLabel = ["Rất yếu", "Yếu", "Khá", "Mạnh", "Rất mạnh"];

// ====== Page ======
export default function ProfilePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(false);

  // form info
  const [fullName, setFullName] = useState("");
  const [genderVN, setGenderVN] = useState<GenderVN>("—");

  // change password
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [cfPw, setCfPw] = useState("");
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [show3, setShow3] = useState(false);
  const pwScore = useMemo(() => passwordScore(newPw), [newPw]);

  // dialogs
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMessage, setDialogMessage] = useState<React.ReactNode>("");

  // fetch profile
  const load = async () => {
    setLoading(true);
    try {
      const res = await getMe();
      const data = (res.data?.data ?? res.data) as Me;
      const user: Me = {
        id: data.id,
        email: data.email,
        fullname: data.fullname,
        gender: data.gender,
        role: data.role,
        avatarUrl: data.avatarUrl,
        isActive: data.isActive,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
      setMe(user);
      setFullName(user.fullname ?? "");
      setGenderVN(mapGender(user.gender));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // save profile info
  const handleSaveInfo = async () => {
    //   if (!me) return;
    //   setLoading(true);
    //   try {
    //     await updateMe({
    //       fullName: fullName.trim(),
    //       gender: normalizeGenderToEnum(genderVN),
    //     });
    //     setDialogTitle("Đã lưu");
    //     setDialogMessage("Thông tin cá nhân đã được cập nhật.");
    //     setIsSuccessDialogOpen(true);
    //     await load();
    //   } catch (e) {
    //     alert("Cập nhật thất bại");
    //     console.error(e);
    //   } finally {
    //     setLoading(false);
    //   }
  };

  // change password
  const handleChangePassword = async () => {
    if (!newPw || newPw !== cfPw) {
      alert("Mật khẩu xác nhận không khớp.");
      return;
    }
    if (passwordScore(newPw) < 2) {
      alert(
        "Mật khẩu mới quá yếu. Vui lòng dùng tối thiểu 8 ký tự, có chữ hoa, chữ thường, số."
      );
      return;
    }
    setLoading(true);
    try {
      await changePassword({ oldPassword: curPw, newPassword: newPw });
      setCurPw("");
      setNewPw("");
      setCfPw("");
      setDialogTitle("Đổi mật khẩu thành công");
      setDialogMessage(
        "Bạn đã đổi mật khẩu. Hãy dùng mật khẩu mới cho lần đăng nhập tiếp theo."
      );
      setIsSuccessDialogOpen(true);
    } catch (e) {
      alert("Đổi mật khẩu thất bại. Kiểm tra lại mật khẩu hiện tại.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

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
                  <div className="h-16 w-16 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
                    {me.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={me.avatarUrl}
                        alt="avatar"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ShieldCheck className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
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
                  Tạo lúc: {new Date(me.createdAt).toLocaleString("vi-VN")}
                  <br />
                  Cập nhật: {new Date(me.updatedAt).toLocaleString("vi-VN")}
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
                      className="h-10 rounded-md border px-3"
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
                    onClick={handleSaveInfo}
                    disabled={loading || !fullName.trim()}
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
                  type={show1 ? "text" : "password"}
                  value={curPw}
                  onChange={(e) => setCurPw(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
                  onClick={() => setShow1((s) => !s)}
                  aria-label="toggle current password"
                >
                  {show1 ? (
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
                  type={show2 ? "text" : "password"}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="Tối thiểu 8 ký tự"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
                  onClick={() => setShow2((s) => !s)}
                  aria-label="toggle new password"
                >
                  {show2 ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {/* strength bar */}
              <div className="h-1 rounded bg-muted">
                <div
                  className={cn(
                    "h-1 rounded",
                    pwScore <= 1
                      ? "bg-red-500"
                      : pwScore === 2
                      ? "bg-yellow-500"
                      : "bg-green-500"
                  )}
                  style={{ width: `${(pwScore / 4) * 100}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground">
                {scoreLabel[pwScore]}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nhập lại mật khẩu mới</Label>
              <div className="relative">
                <Input
                  type={show3 ? "text" : "password"}
                  value={cfPw}
                  onChange={(e) => setCfPw(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
                  onClick={() => setShow3((s) => !s)}
                  aria-label="toggle confirm password"
                >
                  {show3 ? (
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
              onClick={handleChangePassword}
              disabled={loading || !curPw || !newPw || newPw !== cfPw}
            >
              Đổi mật khẩu
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Success dialog + loader */}
      <SuccessDialog
        isOpen={isSuccessDialogOpen}
        onClose={() => setIsSuccessDialogOpen(false)}
        title={dialogTitle}
        message={dialogMessage}
      />
      <RefreshLoader isOpen={loading} />
    </div>
  );
}
