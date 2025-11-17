import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";
import { Modal } from "@/components/Modal";
import RefreshLoader from "@/components/Loading";
import Image from "next/image";

// ====== Services (điều chỉnh theo project) ======
import { userService, authService } from "@/services";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

type Me = {
  id: string;
  email: string;
  fullname: string; // BE trả "fullname"
  gender: "MALE" | "FEMALE" | "OTHER" | string | null;
  role: string;
  avatarUrl?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
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

export default function ProfileInfo({ onClose }: { onClose: () => void }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(false);
  const { refreshUser, user } = useAuth();

  // form info
  const [fullName, setFullName] = useState("");
  const [genderVN, setGenderVN] = useState<GenderVN>("—");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const baselineRef = useRef<{ fullName: string; genderVN: GenderVN }>({
    fullName: "",
    genderVN: "—",
  });

  // dialogs
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMessage, setDialogMessage] = useState<React.ReactNode>("");
  const [onConfirm, setOnConfirm] = useState<() => void>(() => () => {});

  // fetch profile
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const baseName = (user?.fullname ?? "").trim().replace(/\s+/g, " ");
      const baseGenderVN = mapGender(user?.gender);

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
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

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

      await userService.updateProfile(fd);

      // Cập nhật baseline sau khi lưu thành công
      baselineRef.current = {
        fullName: normalize(fullName),
        genderVN,
      };
      setAvatarFile(null);
      setAvatarPreview(null);

      await refreshUser();
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
    <div className="w-full">
      <Card className="shadow-none border-none">
        <CardContent className="space-y-8">
          {/* LAYOUT 2 CỘT */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* --- CỘT TRÁI: AVATAR --- */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Ảnh đại diện</h2>

              <div className="relative w-40 h-40">
                <label
                  htmlFor="avatar-input"
                  className="block w-full h-full rounded-full overflow-hidden border bg-gray-100 cursor-pointer ring-1 ring-gray-300 hover:ring-2 hover:ring-primary transition"
                >
                  {avatarPreview ? (
                    <Image
                      src={avatarPreview}
                      alt="avatarPreview"
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  ) : user?.avatarUrl ? (
                    <Image
                      src={user.avatarUrl}
                      alt="avatarUrl"
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShieldCheck className="h-10 w-10 text-gray-400" />
                    </div>
                  )}
                </label>

                {/* ICON CAMERA */}
                <label
                  htmlFor="avatar-input"
                  className="absolute bottom-2 right-2 bg-primary text-white p-2 rounded-full shadow cursor-pointer hover:scale-105 transition"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3l2-3h8l2 3h3a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </label>

                <input
                  id="avatar-input"
                  type="file"
                  className="hidden"
                  onChange={onPickAvatar}
                />
              </div>
            </div>

            {/* --- CỘT PHẢI: THÔNG TIN CÁ NHÂN --- */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Thông tin cá nhân</h2>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Họ và tên</Label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nhập họ tên"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    value={user?.email || ""}
                    disabled
                    className="bg-gray-100"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Giới tính</Label>
                  <select
                    className="h-10 border rounded-md px-3 w-full"
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

              {/* BUTTONS */}
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={onClose}>
                  Hủy
                </Button>

                <Button
                  onClick={onClickSave}
                  disabled={loading || !dirty || fullName.trim() === ""}
                >
                  Cập nhật hồ sơ
                </Button>
              </div>
            </div>
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
