"use client";

import React from "react";
import type { Movie, Review } from "@/services";
import { X, Info } from "lucide-react";

type ReviewDetailModalProps = {
  open: boolean;
  review: Review | null;
  movies: Movie[];
  onClose: () => void;
};

function formatDateSafe(value?: string) {
  if (!value) return "Không xác định";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Không xác định";
  return d.toLocaleString("vi-VN");
}

export default function ReviewDetailModal({
  open,
  review,
  movies,
  onClose,
}: ReviewDetailModalProps) {
  if (!open || !review) return null;

  const movieTitle =
    movies.find((m) => m.id === review.movieId)?.title ?? review.movieId;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
              <Info className="h-5 w-5 text-blue-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Chi tiết đánh giá
            </h3>
          </div>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-2 text-sm text-gray-700">
          <div>
            <span className="font-semibold">Phim: </span>
            {movieTitle}
          </div>

          <div>
            <span className="font-semibold">Người dùng: </span>
            {review.userDetail?.fullname ?? review.userId}
          </div>

          <div className="flex flex-wrap gap-4">
            <div>
              <span className="font-semibold">Số sao: </span>
              {review.rating.toFixed(1)}
            </div>
            <div>
              <span className="font-semibold">Loại cảm xúc: </span>
              {review.type}
            </div>
            {review.status && (
              <div>
                <span className="font-semibold">Tình trạng: </span>
                {review.status}
              </div>
            )}
          </div>

          <div>
            <span className="font-semibold">Thời gian: </span>
            {formatDateSafe(review.createdAt)}
          </div>

          <div className="pt-2">
            <div className="font-semibold mb-1">Nội dung:</div>
            <div className="whitespace-pre-line break-words">
              {review.content || "(Không có nội dung)"}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
