// components/modal/ReplyReviewModal.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import type { Review, ResponseItem } from "@/services";
import { Star, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Clock } from "lucide-react";

interface ReplyReviewModalProps {
  open: boolean;
  review: Review | null;
  onClose: () => void;
  onSubmit: (reviewId: string, content: string) => Promise<void>;
  isSubmitting?: boolean;
}

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

export default function ReplyReviewModal({
  open,
  review,
  onClose,
  onSubmit,
  isSubmitting = false,
}: ReplyReviewModalProps) {
  const [replyContent, setReplyContent] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const userObj = JSON.parse(localStorage.getItem("user") || "{}");
      const storedUserId = userObj.id;

      setCurrentUserId(storedUserId);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setReplyContent("");
    }
  }, [open, review]);

  const myReplies = useMemo(() => {
    if (
      !review ||
      !review.response ||
      !Array.isArray(review.response) ||
      !currentUserId
    ) {
      return [];
    }
    return review.response.filter(
      (r: ResponseItem) => r.userId === currentUserId
    );
  }, [review, currentUserId]);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) onClose();
  };

  const handleSubmit = async () => {
    if (!review || !replyContent.trim()) return;
    await onSubmit(review.id, replyContent);
  };

  if (!review) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-6 gap-6">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <DialogTitle className="text-xl font-bold">
            Phản hồi đánh giá
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-lg bg-slate-100 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold">
              <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
              <span>{review.rating.toFixed(1)}</span>
            </div>
            {review.isActive === false && (
              <span className="px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 text-xs font-medium">
                Không khả dụng
              </span>
            )}
          </div>

          <div className="text-sm text-gray-800">
            {review.content || "(Người dùng không để lại nội dung)"}
          </div>

          <div className="text-sm text-gray-700 pt-1">
            Người dùng: {review.userDetail?.fullname ?? review.userId}
          </div>
        </div>

        {myReplies.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-900">
              Phản hồi của bạn ({myReplies.length}):
            </h4>

            <div className="flex flex-col gap-3 max-h-[200px] overflow-y-auto pr-1">
              {myReplies.map((reply: ResponseItem, index: number) => (
                <div
                  key={index}
                  className="rounded-lg bg-blue-50 p-3 border border-blue-100" // Đổi màu xanh nhẹ để nhận biết là của mình
                >
                  <div className="text-sm text-gray-800 mb-1">
                    {reply.content}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>{formatDateSafe(reply.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form trả lời */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-900">
            Phản hồi của bạn
          </label>
          <Textarea
            placeholder="Nhập phản hồi..."
            className="min-h-[100px] resize-none focus-visible:ring-offset-0 focus-visible:ring-1"
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
          />
        </div>

        <DialogFooter className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!replyContent.trim() || isSubmitting}
            className="bg-slate-900 hover:bg-slate-800 text-white"
          >
            {isSubmitting ? "Đang gửi..." : "Gửi phản hồi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
