"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { MapPin, Globe2 } from "lucide-react";

import { getCinemaById } from "@/services/CinemaService";

type Cinema = {
  id: string;
  name: string;
  city: string;
  address: string;
  latitude: number | string;
  longitude: number | string;
};

export default function CinemaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [cinema, setCinema] = useState<Cinema | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await getCinemaById(id);
        const data = res?.data?.data as Cinema;
        if (!cancelled) setCinema(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="space-y-6">
      {loading && (
        <div className="text-sm text-muted-foreground">
          Đang tải thông tin rạp…
        </div>
      )}

      {cinema && (
        <Card className="w-full shadow-sm">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <CardTitle className="text-2xl">{cinema.name}</CardTitle>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
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

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Globe2 className="w-4 h-4 text-muted-foreground" />
                  <Label>Kinh độ (longitude)</Label>
                </div>
                <Input type="number" disabled value={cinema.longitude ?? ""} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Globe2 className="w-4 h-4 text-muted-foreground" />
                  <Label>Vĩ độ (latitude)</Label>
                </div>
                <Input type="number" disabled value={cinema.latitude ?? ""} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
