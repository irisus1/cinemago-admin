"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { toast } from "sonner";
import { userService, authService } from "@/services";
import { useAuth } from "@/context/AuthContext";

export type Me = {
  id: string;
  email: string;
  fullname: string;
  gender: "MALE" | "FEMALE" | "OTHER" | string | null;
  role: string;
  avatarUrl?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type GenderVN = "Nam" | "Nữ" | "Khác" | "—";

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

function passwordScore(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

export function useProfileLogic() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(false);
  const { refreshUser } = useAuth();

  const [fullName, setFullName] = useState("");
  const [genderVN, setGenderVN] = useState<GenderVN>("—");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const baselineRef = useRef<{ fullName: string; genderVN: GenderVN }>({
    fullName: "",
    genderVN: "—",
  });

  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [cfPw, setCfPw] = useState("");
  const [showCurPw, setShowCurPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showCfPw, setShowCfPw] = useState(false);
  const [pwTooLong, setPwTooLong] = useState(false);

  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMessage, setDialogMessage] = useState<React.ReactNode>("");
  const [onConfirm, setOnConfirm] = useState<() => void>(() => () => { });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await userService.getMe();
      const data = res;
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
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const normalize = (s: string) => s.trim().replace(/\s+/g, " ");

  const dirty = useMemo(() => {
    const base = baselineRef.current;
    const nameChanged = normalize(fullName) !== normalize(base.fullName);
    const genderChanged = genderVN !== base.genderVN;
    const avatarChanged = !!avatarFile;
    return nameChanged || genderChanged || avatarChanged;
  }, [fullName, genderVN, avatarFile]);

  const onPickAvatar: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const MAX_MB = 3;
    const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
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
    const url = URL.createObjectURL(file);
    setAvatarFile(file);
    setAvatarPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
  };

  const handleSaveInfo = async () => {
    if (!dirty) return;
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
      await load();
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
      setIsErrorDialogOpen(true);
    } finally {
      setLoading(false);
    }
  };

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

  return {
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
    isErrorDialogOpen,
    setIsErrorDialogOpen,

    dialogTitle,
    dialogMessage,
    onConfirm,

    onClickSave,
    onClickChangePassword,
  };
}
