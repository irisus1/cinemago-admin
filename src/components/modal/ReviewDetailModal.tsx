"use client";

import React from "react";
import type { Movie, Review } from "@/services";
import { Info, Star, Calendar, User, Film, Tag } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"; // Đường dẫn tuỳ project của bạn
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

type ReviewDetailModalProps = {
  open: boolean;
  review: Review | null;
  movies: Movie[];
  onClose: () => void;
};

function formatDateSafe(value?: string | number) {
  if (!value) return "—";

  let timestamp = Number(value);
  if (isNaN(timestamp)) return "Không xác định";

  if (timestamp < 100000000000) {
    timestamp *= 1000;
  }

  const d = new Date(timestamp);

  return d.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Helper để chọn màu Badge theo số sao (tuỳ chọn)
const getRatingColor = (rating: number) => {
  if (rating >= 4) return "bg-green-500 hover:bg-green-600 border-transparent";
  if (rating >= 2)
    return "bg-yellow-500 hover:bg-yellow-600 border-transparent";
  return "bg-red-500 hover:bg-red-600 border-transparent";
};

export default function ReviewDetailModal({
  open,
  review,
  movies,
  onClose,
}: ReviewDetailModalProps) {
  if (!review && open) return null;

  console.log(review);

  const movieTitle =
    movies.find((m) => m.id === review?.movieId)?.title ?? review?.movieId;

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden gap-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 bg-muted/50 border-b">
          <div className="flex items-center gap-2 text-blue-600">
            <Info className="h-5 w-5" />
            <DialogTitle className="text-lg text-foreground">
              Chi tiết đánh giá
            </DialogTitle>
          </div>
        </DialogHeader>

        {review && (
          <div className="p-6 space-y-6">
            {/* Thông tin chính: Phim & User */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Film className="h-4 w-4" /> Phim
                </div>
                <div
                  className="font-medium text-base truncate"
                  title={movieTitle as string}
                >
                  {movieTitle}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" /> Người đánh giá
                </div>
                <div className="font-medium text-base">
                  {review.userDetail?.fullname ?? review.userId}
                </div>
              </div>
            </div>

            <Separator />

            {/* Metrics: Sao, Loại, Thời gian */}
            <div className="flex flex-wrap items-center gap-4">
              <Badge
                className={`${getRatingColor(
                  review.rating
                )} text-white px-3 py-1`}
              >
                <Star className="w-3.5 h-3.5 mr-1 fill-current" />
                {review.rating.toFixed(1)} / 5
              </Badge>

              {/* <Badge variant="outline" className="px-3 py-1">
                <Tag className="w-3.5 h-3.5 mr-1" />
                {review.type}
              </Badge> */}

              {review.status && (
                <Badge variant="secondary" className="px-3 py-1 capitalize">
                  {review.status}
                </Badge>
              )}

              <div className="ml-auto flex items-center text-xs text-muted-foreground">
                <Calendar className="w-3.5 h-3.5 mr-1" />
                {formatDateSafe(review.createdAt)}
              </div>
            </div>

            {/* Nội dung đánh giá */}
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
              <div className="p-3 border-b bg-muted/20 text-sm font-medium">
                Nội dung đánh giá
              </div>
              <ScrollArea className="h-[200px] w-full p-4">
                <div className="text-sm leading-relaxed whitespace-pre-line text-gray-700">
                  {review.content || (
                    <span className="italic text-muted-foreground">
                      (Không có nội dung chi tiết)
                    </span>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}

        {/* Footer */}
        <DialogFooter className="px-6 py-4 bg-muted/50 border-t">
          <Button onClick={onClose} variant="default">
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
