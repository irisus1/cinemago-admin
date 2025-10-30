"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { MapPin, Globe2 } from "lucide-react";
import { BiArrowBack } from "react-icons/bi";
import { cinemaService, type Cinema } from "@/services";
import RoomCard from "./RoomCard";

export default function CinemaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [cinema, setCinema] = useState<Cinema | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await cinemaService.getCinemaById(id);
        const data = res;
        if (!cancelled) setCinema(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const hasCoords = cinema?.latitude != null && cinema?.longitude != null;

  const coordText = hasCoords ? `${cinema.latitude}, ${cinema.longitude}` : "";

  const mapSrc = hasCoords
    ? `https://www.google.com/maps?q=${cinema.latitude},${cinema.longitude}&z=15&output=embed`
    : "";

  return (
    <div className="space-y-6">
      {loading && (
        <div className="text-sm text-muted-foreground">
          Đang tải thông tin rạp…
        </div>
      )}

      <button
        type="button"
        onClick={() => history.back()}
        className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border hover:bg-gray-50 bg-white"
        aria-label="Quay lại"
        title="Quay lại"
      >
        <BiArrowBack className="text-xl" />
        Quay lại
      </button>

      {cinema && (
        <Card className="w-full shadow-sm">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <CardTitle className="text-2xl">{cinema.name}</CardTitle>
            </div>
          </CardHeader>

          <CardContent>
            {/* 2 cột: trái là thông tin, phải là bản đồ */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Cột trái (span 2) */}
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

                  {/* GỘP kinh độ + vĩ độ */}
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

                {/* Link mở Google Maps */}
                {hasCoords && (
                  <a
                    href={`https://maps.google.com/?q=${cinema.latitude},${cinema.longitude}`}
                    target="_blank"
                    className="text-xs text-blue-600 underline"
                  >
                    Mở trên Google Maps
                  </a>
                )}
              </div>

              {/* Cột phải: BẢN ĐỒ */}
              <div className="space-y-2">
                <Label>Vị trí trên bản đồ</Label>
                <div className="rounded-md border overflow-hidden w-full h-[300px]">
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
          </CardContent>
        </Card>
      )}

      {/* Danh sách phòng chiếu */}
      {cinema && <RoomCard cinemaId={cinema.id} />}
    </div>
  );
}
