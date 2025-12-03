"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { MapPin, Globe2 } from "lucide-react";
import type { Cinema } from "@/services";

type CinemaDetailModalProps = {
  open: boolean;
  cinema: Cinema | null;
  onOpenChange: (open: boolean) => void;
};

export function CinemaDetailModal({
  open,
  cinema,
  onOpenChange,
}: CinemaDetailModalProps) {
  const hasCoords = cinema?.latitude != null && cinema?.longitude != null;

  const coordText = hasCoords
    ? `${cinema?.latitude}, ${cinema?.longitude}`
    : "";

  const mapSrc = hasCoords
    ? `https://www.google.com/maps?q=${cinema?.latitude},${cinema?.longitude}&z=15&output=embed`
    : "";

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>
            {cinema?.name ? `Thông tin rạp: ${cinema.name}` : "Thông tin rạp"}
          </DialogTitle>
        </DialogHeader>

        {cinema && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Thông tin bên trái (2 cột) */}
            <div className="md:col-span-2 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tên rạp</Label>
                  <Input disabled value={cinema.name ?? ""} />
                </div>

                <div className="space-y-2">
                  <Label>Thành phố</Label>
                  <Input disabled value={cinema.city ?? ""} />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <Label>Địa chỉ</Label>
                  </div>
                  <Input disabled value={cinema.address ?? ""} />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center gap-2">
                    <Globe2 className="w-4 h-4 text-muted-foreground" />
                    <Label>Tọa độ (kinh độ, vĩ độ)</Label>
                  </div>
                  <Input
                    disabled
                    value={coordText}
                    placeholder="Chưa có tọa độ"
                  />
                </div>
              </div>

              {hasCoords && (
                <a
                  href={`https://maps.google.com/?q=${cinema.latitude},${cinema.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 underline"
                >
                  Mở trên Google Maps
                </a>
              )}
            </div>

            {/* Bản đồ bên phải */}
            <div className="space-y-2">
              <Label>Vị trí trên bản đồ</Label>
              <div className="rounded-md border overflow-hidden w-full h-[260px]">
                {hasCoords ? (
                  <iframe
                    src={mapSrc}
                    className="w-full h-full"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
                    Chưa có tọa độ để hiển thị
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
