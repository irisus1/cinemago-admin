"use client";

import { useEffect, useMemo, useState, useRef } from "react";
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
import { getMe, updateProfile } from "@/services/UserService";
import { changePassword } from "@/services/AuthService";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { set } from "date-fns";

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
  const { userDetail, setUserDetail } = useAuth();

  // form info
  const [fullName, setFullName] = useState("");
  const [genderVN, setGenderVN] = useState<GenderVN>("—");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const baselineRef = useRef<{ fullName: string; genderVN: GenderVN }>({
    fullName: "",
    genderVN: "—",
  });

  // change password
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [cfPw, setCfPw] = useState("");
  const [showCurPw, setShowCurPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showCfPw, setShowCfPw] = useState(false);
  const pwScore = useMemo(() => passwordScore(newPw), [newPw]);

  // dialogs
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMessage, setDialogMessage] = useState<React.ReactNode>("");
  const [onConfirm, setOnConfirm] = useState<() => void>(() => () => {});

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
      setUserDetail(user); // Cập nhật thông tin người dùng vào context AuthContext
      const baseName = (user.fullname ?? "").trim().replace(/\s+/g, " ");
      const baseGenderVN = mapGender(user.gender);

      setFullName(baseName);
      setGenderVN(baseGenderVN);
      setAvatarFile(null);
      setAvatarPreview(null);

      baselineRef.current = {
        fullName: baseName,
        genderVN: baseGenderVN,
      };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    // cleanup object URL
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  //check form changed
  const normalize = (s: string) => s.trim().replace(/\s+/g, " ");

  const dirty = useMemo(() => {
    const base = baselineRef.current;
    const nameChanged = normalize(fullName) !== normalize(base.fullName);
    const genderChanged = genderVN !== base.genderVN; // so sánh cùng format VN
    const avatarChanged = !!avatarFile;
    return nameChanged || genderChanged || avatarChanged;
  }, [fullName, genderVN, avatarFile]);

  //upload avatar
  const MAX_MB = 3;
  const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

  const onPickAvatar: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.currentTarget.files?.[0] ?? null;
    if (!file) return;

    if (!ACCEPTED.includes(file.type)) {
      toast.warning("Chỉ chấp nhận JPG/PNG/WebP");
      e.currentTarget.value = "";
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.warning(`Kích thước tối đa ${MAX_MB}MB`);
      e.currentTarget.value = "";
      return;
    }
    // tạo preview và lưu file
    const url = URL.createObjectURL(file);
    setAvatarFile(file);
    setAvatarPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
  };

  // save profile info
  const handleSaveInfo = async () => {
    if (!dirty) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.set("fullname", normalize(fullName));
      fd.set("gender", genderVN);
      if (avatarFile) fd.set("avatar", avatarFile);

      await updateProfile(fd);

      // Cập nhật baseline sau khi lưu thành công
      baselineRef.current = {
        fullName: normalize(fullName),
        genderVN,
      };
      setAvatarFile(null);
      setAvatarPreview(null);

      await load();
      // Hiện dialog thành công
      setDialogTitle("Lưu thay đổi thành công");
      setDialogMessage("Thông tin cá nhân đã được cập nhật.");
      setIsSuccessDialogOpen(true);
    } catch (e) {
      setDialogTitle("Lưu thay đổi thất bại");
      setDialogMessage(
        <>
          Không thể cập nhật thông tin. Vui lòng thử lại sau.
          <br />
          <small className="text-muted">
            {String((e as Error)?.message || "")}
          </small>
        </>
      );
      setIsSuccessDialogOpen(true);
    } finally {
      setLoading(false);
    }
  };

  // change password
  const handleChangePassword = async () => {
    if (!newPw || newPw !== cfPw) {
      toast.warning("Mật khẩu xác nhận không khớp.");
      return;
    }
    if (passwordScore(newPw) < 2) {
      toast.warning(
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

  const onClickSave = () => {
    if (!dirty) return;
    openConfirm(
      "Xác nhận lưu thay đổi",
      <>Bạn có chắc muốn lưu các thay đổi chứ?</>,
      async () => {
        setIsConfirmDialogOpen(false);
        await handleSaveInfo();
      }
    );
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
                  <label
                    htmlFor="avatar-input"
                    className="h-16 w-16 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center cursor-pointer ring-1 ring-gray-200 hover:ring-2 hover:ring-primary transition"
                    title="Bấm để đổi ảnh đại diện"
                  >
                    {/* Ưu tiên preview nếu người dùng vừa chọn ảnh */}
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

                  {/* input file ẩn, click vào label ở trên sẽ kích hoạt */}
                  <input
                    id="avatar-input"
                    type="file"
                    accept={ACCEPTED.join(",")}
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
                    onClick={onClickSave}
                    disabled={loading || !dirty || normalize(fullName) === ""}
                    className=""
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
                  onChange={(e) => setNewPw(e.target.value)}
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
                  type={showCfPw ? "text" : "password"}
                  value={cfPw}
                  onChange={(e) => setCfPw(e.target.value)}
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

      <Dialog
        isOpen={isConfirmDialogOpen}
        onClose={() => setIsConfirmDialogOpen(false)}
        onConfirm={onConfirm}
        title={dialogTitle}
        message={dialogMessage}
      />

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
