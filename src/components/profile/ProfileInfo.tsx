import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ShieldCheck, CheckCircle2, AlertCircle, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import RefreshLoader from "@/components/Loading";
import Image from "next/image";

// ====== Services ======
import { userService } from "@/services";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

type Me = {
  id: string;
  email: string;
  fullname: string;
  gender: "MALE" | "FEMALE" | "OTHER" | string | null;
  role: string;
  avatarUrl?: string;
  isActive: boolean;
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

export default function ProfileInfo({
  onClose,
}: {
  onClose: () => void;
}) {
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

  // dialogs state
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMessage, setDialogMessage] = useState<React.ReactNode>("");


  // fetch profile
  const load = useCallback(async () => {
    // Không set loading ở đây để tránh nháy giao diện khi user data đã có
    if (!user) return;

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
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  // check form changed
  const normalize = (s: string) => s.trim().replace(/\s+/g, " ");

  const dirty = useMemo(() => {
    const base = baselineRef.current;
    const nameChanged = normalize(fullName) !== normalize(base.fullName);
    const genderChanged = genderVN !== base.genderVN;
    const avatarChanged = !!avatarFile;
    return nameChanged || genderChanged || avatarChanged;
  }, [fullName, genderVN, avatarFile]);

  const onPickAvatar: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.currentTarget.files?.[0] ?? null;
    if (!file) return;
    const MAX_MB = 3;
    const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

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
    const url = URL.createObjectURL(file);
    setAvatarFile(file);
    setAvatarPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
  };

  const executeSave = async () => {
    setLoading(true);
    try {
      const fd = new FormData();
      fd.set("fullname", normalize(fullName));
      fd.set("gender", genderVN);
      if (avatarFile) fd.set("avatar", avatarFile);

      await userService.updateProfile(fd);

      baselineRef.current = {
        fullName: normalize(fullName),
        genderVN,
      };
      setAvatarFile(null);
      setAvatarPreview(null);

      await refreshUser();

      // Mở dialog success -> ProfileModal vẫn ẩn
      setDialogTitle("Lưu thay đổi thành công");
      setDialogMessage("Thông tin cá nhân đã được cập nhật.");
      setIsSuccessDialogOpen(true);
    } catch (e) {
      setDialogTitle("Lưu thay đổi thất bại");
      setDialogMessage(String((e as Error)?.message || "Đã có lỗi xảy ra"));
      setIsSuccessDialogOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const onClickSave = (e: React.MouseEvent) => {
    e.preventDefault(); // Chặn hành vi mặc định
    if (!dirty) return;
    setDialogTitle("Xác nhận lưu thay đổi");
    setDialogMessage(<>Bạn có chắc muốn lưu các thay đổi chứ?</>);
    setIsConfirmDialogOpen(true); // Modal Confirm sẽ hiện đè lên ProfileModal
  };

  const onConfirmAction = async () => {
    setIsConfirmDialogOpen(false);
    await executeSave();
  };

  // Xử lý khi bấm nút "Hủy" trong Modal Confirm
  const onCancelConfirm = () => {
    setIsConfirmDialogOpen(false);
    // -> State thay đổi -> useEffect chạy -> onChildModalChange(false) -> ProfileModal hiện lại.
  };

  return (
    <div className="w-full">
      <Card className="shadow-none border-none">
        <CardContent className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* AVATAR COLUMN */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Ảnh đại diện</h2>
              <div className="relative w-40 h-40">
                <label
                  htmlFor="avatar-input"
                  className="block w-full h-full rounded-full overflow-hidden border bg-gray-100 cursor-pointer ring-1 ring-gray-300 hover:ring-2 hover:ring-primary transition"
                >
                  {avatarPreview ? (
                    <Image src={avatarPreview} alt="Preview" width={160} height={160} className="w-full h-full object-cover" />
                  ) : user?.avatarUrl ? (
                    <Image src={user.avatarUrl} alt="Avatar" width={160} height={160} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShieldCheck className="h-10 w-10 text-gray-400" />
                    </div>
                  )}
                </label>
                <input
                  id="avatar-input"
                  type="file"
                  accept="image/jpeg, image/png, image/webp"
                  className="hidden"
                  onChange={onPickAvatar}
                />
              </div>
            </div>

            {/* INFO COLUMN */}
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
                  <Input value={user?.email || ""} disabled className="bg-gray-100" />
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

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" type="button" onClick={onClose}>
                  Hủy
                </Button>
                <Button
                  type="button" // QUAN TRỌNG: Ngăn chặn reload form
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


      {/* CONFIRM DIALOG */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white rounded-3xl shadow-2xl">
          <div className="p-8 text-center relative">
            <button
              onClick={onCancelConfirm}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
            <div className="w-20 h-20 bg-blue-50 border-4 border-blue-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-blue-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Xác nhận lưu thay đổi</h2>
            <div className="text-gray-600 mb-6 leading-relaxed">
              {dialogMessage}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onCancelConfirm}
                className="w-full py-3.5 px-6 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl transition-all duration-200"
              >
                Hủy
              </button>
              <button
                onClick={onConfirmAction}
                className="w-full py-3.5 px-6 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* SUCCESS DIALOG */}
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

            <h2 className="text-2xl font-bold text-gray-900 mb-3">{dialogTitle}</h2>
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