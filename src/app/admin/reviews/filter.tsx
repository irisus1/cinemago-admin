"use client";

import React from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

import type { Movie, GetReviewsParams } from "@/services";

interface ReviewFiltersProps {
  filters: GetReviewsParams;
  onChange: (next: GetReviewsParams) => void;
  movies: Movie[];
  loading: boolean;
  onClear: () => void;
  canClearFilters: boolean;
}

const ReviewFilters: React.FC<ReviewFiltersProps> = ({
  filters,
  onChange,
  movies,
  canClearFilters,
  onClear,
}) => {
  const handleChange = (patch: Partial<GetReviewsParams>) => {
    onChange({ ...filters, ...patch });
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between w-full gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col gap-1 min-w-[220px]">
            <Select
              value={filters.movieId}
              onValueChange={(value) =>
                onChange({
                  ...filters,
                  movieId: value,
                })
              }
            >
              <SelectTrigger className="w-[220px] border border-gray-400">
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

          <div className="flex flex-col gap-1 min-w-[140px]">
            <Select
              value={filters.rating ? String(filters.rating) : "all"}
              onValueChange={(value) =>
                handleChange({
                  rating: value === "all" ? undefined : Number(value),
                })
              }
            >
              <SelectTrigger className="w-[140px] border border-gray-400">
                <SelectValue placeholder="Tất cả" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả số sao</SelectItem>
                <SelectItem value="5">5 sao</SelectItem>
                <SelectItem value="4">4 sao</SelectItem>
                <SelectItem value="3">3 sao</SelectItem>
                <SelectItem value="2">2 sao</SelectItem>
                <SelectItem value="1">1 sao</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1 min-w-[160px]">
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
              <SelectTrigger className="w-[170px] border border-gray-400">
                <SelectValue placeholder="Tất cả" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="active">Đang hiển thị</SelectItem>
                <SelectItem value="inactive">Đã ẩn</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1 min-w-[160px]">
            <Select
              value={filters.status ?? "all"}
              onValueChange={(value) =>
                handleChange({
                  status: value === "all" ? undefined : value,
                })
              }
            >
              <SelectTrigger className="w-[180px] border border-gray-400">
                <SelectValue placeholder="Tất cả" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả tình trạng</SelectItem>
                <SelectItem value="Đã trả lời">Đã trả lời</SelectItem>
                <SelectItem value="Chưa trả lời">Chưa trả lời</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            disabled={!canClearFilters}
            className={
              "px-4 h-10 rounded-lg text-sm font-medium transition-colors " +
              (canClearFilters
                ? "bg-red-100 text-red-700 hover:bg-red-200"
                : "bg-gray-100 text-gray-400 cursor-not-allowed")
            }
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
