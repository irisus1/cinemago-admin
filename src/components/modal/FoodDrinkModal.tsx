"use client";

import * as React from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FoodDrink } from "@/services";
import { toast } from "sonner";

type FormDataFood = {
  name: string;
  description: string;
  price: string;
  type: "SNACK" | "DRINK" | "COMBO";
  file?: File | null;
};

export default function FoodDrinkModal({
  open,
  onClose,
  editData,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  editData?: FoodDrink | null;
  onSubmit?: (
    data: FormDataFood,
    mode: "create" | "edit",
    original?: FoodDrink | null
  ) => void | Promise<void>;
}) {
  const [name, setName] = React.useState("");
  const [desc, setDesc] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [type, setType] = React.useState<"SNACK" | "DRINK" | "COMBO">("SNACK");
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const toastRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (editData) {
      setName(editData.name);
      setDesc(editData.description);
      setPrice(String(editData.price));
      setType(editData.type as "SNACK" | "DRINK" | "COMBO");
      setPreview(editData.image ?? null);
      setFile(null);
    } else {
      setName("");
      setDesc("");
      setPrice("");
      setType("SNACK");
      setFile(null);
      setPreview(null);
    }
  }, [editData, open]);

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = () => {
    if (!name || !desc || !price) {
      if (!toastRef.current) {
        const id = toast.warning("Vui lòng nhập đầy đủ thông tin", {
          onDismiss: () => (toastRef.current = null),
        });
        toastRef.current = id.toString();
      }
      return;
    }

    const mode: "create" | "edit" = editData ? "edit" : "create";

    onSubmit?.(
      {
        name,
        description: desc,
        price,
        type,
        file,
      },
      mode,
      editData ?? null
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[850px] p-8 rounded-xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold tracking-wide">
            {editData ? "Chỉnh sửa món" : "Thêm món mới"}
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground leading-relaxed">
            {editData
              ? "Cập nhật thông tin món ăn, thức uống hoặc combo trong hệ thống."
              : "Nhập thông tin chi tiết để thêm món mới vào danh sách thực đơn."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-10 py-4">
          <div className="flex flex-col items-center gap-4">
            <div
              className="relative w-[280px] h-[360px] border-2 border-gray-200 rounded-lg overflow-hidden bg-muted cursor-pointer group shadow-md hover:shadow-lg transition-all"
              title="Bấm để đổi ảnh"
              onClick={() => document.getElementById("food-img-input")?.click()}
            >
              {preview ? (
                <Image
                  src={preview}
                  alt="preview"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                  <p className="text-lg font-medium">Chọn ảnh</p>
                  <p className="text-xs text-gray-400 mt-1">
                    (Nhấn để tải lên)
                  </p>
                </div>
              )}
            </div>
            <input
              id="food-img-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPickFile}
            />
            {preview && (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700"
                onClick={() => {
                  setPreview(null);
                  setFile(null);
                }}
              >
                Xoá ảnh
              </Button>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <Label className="text-base font-medium">Tên món</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nhập tên món"
                className="mt-3 text-base py-3"
              />
            </div>

            <div>
              <Label className="text-base font-medium">Mô tả</Label>
              <Input
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Mô tả ngắn gọn về món"
                className="mt-3 text-base py-3"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label className="text-base font-medium">Giá (VNĐ)</Label>
                <Input
                  type="number"
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="mt-3 text-base py-3"
                />
              </div>
              <div>
                <Label className="text-base font-medium">Loại</Label>
                <select
                  value={type}
                  onChange={(e) =>
                    setType(e.target.value as "SNACK" | "DRINK" | "COMBO")
                  }
                  className="h-[38px] w-full rounded-md border px-3 mt-3 text-base"
                >
                  <option value="SNACK">Đồ ăn</option>
                  <option value="DRINK">Thức uống</option>
                  <option value="COMBO">Combo</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="text-base px-6 py-2"
          >
            Hủy
          </Button>
          <Button onClick={handleSubmit} className="text-base px-6 py-2">
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
