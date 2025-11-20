// components/ReviewFilters.tsx
"use client";

import React from "react";
import { BiRefresh } from "react-icons/bi";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { Movie, GetReviewsParams } from "@/services";

interface ReviewFiltersProps {
  filters: GetReviewsParams;
  onChange: (next: GetReviewsParams) => void;
  movies: Movie[];
  loading: boolean;
  onRefresh: () => void;
  onClear: () => void;
}

const ReviewFilters: React.FC<ReviewFiltersProps> = ({
  filters,
  onChange,
  movies,
  loading,
  onRefresh,
  onClear,
}) => {
  const handleChange = (patch: Partial<GetReviewsParams>) => {
    onChange({ ...filters, ...patch });
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between w-full gap-4">
        {/* Left: Refresh + filters chính */}
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={onRefresh}
            className="p-3 rounded-full hover:bg-gray-100 transition-all duration-300 disabled:opacity-60"
            disabled={loading}
            title="Làm mới"
          >
            <BiRefresh
              className={`text-3xl ${
                loading
                  ? "animate-spin"
                  : "hover:rotate-180 transition-transform duration-300"
              }`}
            />
          </button>

          {/* Movie filter */}
          <div className="flex flex-col gap-1 min-w-[220px]">
            <Label className="text-sm text-gray-700">Phim</Label>
            <Select
              value={filters.movieId}
              onValueChange={(value) =>
                onChange({
                  ...filters,
                  movieId: value,
                })
              }
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Chọn phim" />
              </SelectTrigger>
              <SelectContent>
                {movies.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Rating filter */}
          <div className="flex flex-col gap-1 min-w-[140px]">
            <Label className="text-sm text-gray-700">Số sao</Label>
            <Select
              value={filters.rating ? String(filters.rating) : "all"}
              onValueChange={(value) =>
                handleChange({
                  rating: value === "all" ? undefined : Number(value),
                })
              }
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Tất cả" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="5">5 sao</SelectItem>
                <SelectItem value="4">4 sao</SelectItem>
                <SelectItem value="3">3 sao</SelectItem>
                <SelectItem value="2">2 sao</SelectItem>
                <SelectItem value="1">1 sao</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* isActive filter */}
          <div className="flex flex-col gap-1 min-w-[160px]">
            <Label className="text-sm text-gray-700">Trạng thái hiển thị</Label>
            <Select
              value={
                filters.isActive === undefined
                  ? "all"
                  : filters.isActive
                  ? "active"
                  : "inactive"
              }
              onValueChange={(value) => {
                if (value === "all")
                  return handleChange({ isActive: undefined });
                if (value === "active") return handleChange({ isActive: true });
                if (value === "inactive")
                  return handleChange({ isActive: false });
              }}
            >
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Tất cả" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="active">Đang hiển thị</SelectItem>
                <SelectItem value="inactive">Đã ẩn</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Type (sentiment) filter */}
          <div className="flex flex-col gap-1 min-w-[160px]">
            <Label className="text-sm text-gray-700">Loại cảm xúc</Label>
            <Select
              value={filters.type ?? "all"}
              onValueChange={(value) =>
                handleChange({
                  type: value === "all" ? undefined : value,
                })
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tất cả" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="Tích cực">Tích cực</SelectItem>
                <SelectItem value="Tiêu cực">Tiêu cực</SelectItem>
                <SelectItem value="Trung lập">Trung lập</SelectItem>
                <SelectItem value="Không khả dụng">Không khả dụng</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status filter (nếu BE có) */}
          <div className="flex flex-col gap-1 min-w-[160px]">
            <Label className="text-sm text-gray-700">Tình trạng</Label>
            <Select
              value={filters.status ?? "all"}
              onValueChange={(value) =>
                handleChange({
                  status: value === "all" ? undefined : value,
                })
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tất cả" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="Đã trả lời">Đã trả lời</SelectItem>
                {/* Nếu BE có status "Chưa trả lời" thì thêm:
                <SelectItem value="Chưa trả lời">Chưa trả lời</SelectItem>
                */}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Right: Clear filter */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="bg-gray-100 text-gray-700 hover:bg-gray-200"
            onClick={onClear}
          >
            Xóa lọc
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReviewFilters;
