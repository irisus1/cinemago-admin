// app/(admin)/admin/reviews/page.tsx
"use client";

import React, { useCallback, useEffect, useState } from "react";
import Table, { Column } from "@/components/Table";
import { BiRefresh } from "react-icons/bi";
import { Modal } from "@/components/Modal";
import RefreshLoader from "@/components/Loading";
import ReviewFilters from "./filter";
import {
  reviewService,
  type Review,
  type PaginationMeta,
  movieService,
  type Movie,
  type GetReviewsParams,
} from "@/services";

const ReviewsListPage: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);

  const [filters, setFilters] = useState<GetReviewsParams>({
    movieId: "",
    rating: undefined,
    status: undefined,
    type: undefined,
    isActive: undefined,
  });

  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Confirm/Success dialogs
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMessage, setDialogMessage] = useState<React.ReactNode>("");
  const [onConfirm, setOnConfirm] = useState<() => void>(() => () => {});

  // ===== Fetch movies for filter =====
  const fetchMovies = useCallback(async () => {
    try {
      // Giả sử movieService có getAllMovies kiểu giống genreService
      const res = await movieService.getAllMovies({
        page: 1,
        limit: 1000,
      });
      const list = res.data ?? [];
      setMovies(list);
      if (list.length > 0 && !filters.movieId) {
        setFilters((prev) => ({
          ...prev,
          movieId: list[0].id,
        }));
      }
    } catch (e) {
      console.error("Failed to load movies for review filter", e);
      setMovies([]);
    }
  }, []);

  // ===== Fetch reviews =====
  const fetchReviews = useCallback(
    async (toPage: number) => {
      if (!filters.movieId) {
        setReviews([]);
        setPagination(null);
        setTotalPages(1);
        setTotalItems(0);
        return;
      }

      try {
        setLoading(true);

        const { data, pagination } = await reviewService.getReviews({
          page: toPage,
          limit: pageSize,
          movieId: filters.movieId,
          rating: filters.rating,
          status: filters.status,
          type: filters.type,
          isActive: filters.isActive,
        });

        setReviews(data ?? []);
        setPagination(pagination ?? null);
        setTotalPages(pagination?.totalPages ?? 1);
        setTotalItems(pagination?.totalItems ?? 0);

        if (pagination?.currentPage && pagination.currentPage !== page) {
          setPage(pagination.currentPage);
        }
      } catch (e) {
        console.error(e);
        setReviews([]);
        setPagination(null);
        setTotalPages(1);
        setTotalItems(0);
      } finally {
        setLoading(false);
      }
    },
    [
      page,
      pageSize,
      filters.movieId,
      filters.rating,
      filters.status,
      filters.type,
      filters.isActive,
    ]
  );

  // Initial load
  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  useEffect(() => {
    fetchReviews(page);
  }, [
    page,
    filters.movieId,
    filters.rating,
    filters.status,
    filters.type,
    filters.isActive,
    fetchReviews,
  ]);

  // Reset page về 1 khi filter đổi
  useEffect(() => {
    setPage(1);
  }, [
    filters.movieId,
    filters.rating,
    filters.status,
    filters.type,
    filters.isActive,
  ]);

  const handleRefresh = async () => {
    setLoading(true);
    await fetchReviews(page);
    setLoading(false);
  };

  const clearFilters = () => {
    setFilters((prev) => ({
      movieId: prev.movieId,
      rating: undefined,
      status: undefined,
      type: undefined,
      isActive: undefined,
    }));
  };

  // ===== Confirm dialog helpers =====
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

  const handleHide = (r: Review) => {
    openConfirm(
      "Xác nhận ẩn đánh giá",
      <>Bạn có chắc muốn ẩn đánh giá này không?</>,
      async () => {
        setIsConfirmDialogOpen(false);
        try {
          await reviewService.hideReview(r.id);
          setReviews((prev) =>
            prev.map((it) => (it.id === r.id ? { ...it, isActive: false } : it))
          );
          setDialogTitle("Thành công");
          setDialogMessage("Đã ẩn đánh giá.");
          setIsSuccessDialogOpen(true);
        } catch (err) {
          alert("Thao tác thất bại: " + err);
        }
      }
    );
  };

  const handleUnhide = (r: Review) => {
    openConfirm(
      "Xác nhận hiển thị lại",
      <>Hiển thị lại đánh giá này?</>,
      async () => {
        setIsConfirmDialogOpen(false);
        try {
          await reviewService.unhideReview(r.id);
          setReviews((prev) =>
            prev.map((it) => (it.id === r.id ? { ...it, isActive: true } : it))
          );
          setDialogTitle("Thành công");
          setDialogMessage("Đã hiển thị lại đánh giá.");
          setIsSuccessDialogOpen(true);
        } catch (err) {
          alert("Thao tác thất bại: " + err);
        }
      }
    );
  };

  // ===== Table columns =====
  const columns: Column<Review>[] = [
    {
      header: "Phim",
      key: "movie",
      render: (_: unknown, row: Review) => {
        const mv = movies.find((m) => m.id === row.movieId);
        return mv ? mv.title : row.movieId;
      },
    },
    {
      header: "Người dùng",
      key: "user",
      render: (_: unknown, row: Review) =>
        row.userDetail?.fullname ?? row.userId,
    },
    {
      header: "Số sao",
      key: "rating",
      render: (_: unknown, row: Review) => row.rating.toFixed(1),
      className: "text-center w-[80px]",
    },
    {
      header: "Loại",
      key: "type",
      render: (_: unknown, row: Review) => row.type,
      className: "w-[120px]",
    },
    {
      header: "Nội dung",
      key: "content",
      render: (_: unknown, row: Review) =>
        row.content?.length
          ? row.content.length > 80
            ? row.content.slice(0, 80) + "..."
            : row.content
          : "(Không có nội dung)",
      className: "max-w-[320px]",
    },
    {
      header: "Trạng thái",
      key: "isActive",
      render: (_: unknown, row: Review) => (
        <span
          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
            row.isActive
              ? "bg-green-100 text-green-700"
              : "bg-gray-200 text-gray-600"
          }`}
        >
          {row.isActive ? "Đang hiển thị" : "Đã ẩn"}
        </span>
      ),
      className: "w-[140px]",
    },
    {
      header: "Hành động",
      key: "actions",
      className: "w-[150px] text-right",
      render: (_: unknown, row: Review) => (
        <div className="flex gap-2 justify-end">
          {row.isActive ? (
            <button
              className="px-3 py-1 text-xs rounded-md bg-red-100 text-red-700 hover:bg-red-200"
              onClick={() => handleHide(row)}
            >
              Ẩn
            </button>
          ) : (
            <button
              className="px-3 py-1 text-xs rounded-md bg-green-100 text-green-700 hover:bg-green-200"
              onClick={() => handleUnhide(row)}
            >
              Hiển thị lại
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-3">
          Danh sách đánh giá
        </h2>

        <ReviewFilters
          filters={filters}
          onChange={setFilters}
          movies={movies}
          loading={loading}
          onRefresh={handleRefresh}
          onClear={clearFilters}
        />
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <Table<Review>
          columns={columns}
          data={reviews}
          getRowKey={(r) => r.id}
        />

        {totalItems > 0 && (
          <div className="flex items-center justify-between px-6 py-4 bg-gray-50">
            <button
              onClick={() =>
                pagination?.hasPrevPage && setPage((p) => Math.max(1, p - 1))
              }
              disabled={!pagination?.hasPrevPage || loading}
              className="px-4 py-2 text-sm text-gray-600 bg-white rounded-lg shadow-sm disabled:opacity-50"
            >
              Trước
            </button>

            <div className="text-sm text-gray-600">
              Trang {pagination?.currentPage ?? page} / {totalPages} –{" "}
              {totalItems} đánh giá
            </div>

            <button
              onClick={() => pagination?.hasNextPage && setPage((p) => p + 1)}
              disabled={!pagination?.hasNextPage || loading}
              className="px-4 py-2 text-sm text-gray-600 bg-white rounded-lg shadow-sm disabled:opacity-50"
            >
              Tiếp
            </button>
          </div>
        )}
      </div>

      {/* Confirm & Success */}
      <Modal
        isOpen={isConfirmDialogOpen}
        onClose={() => setIsConfirmDialogOpen(false)}
        type="info"
        title={dialogTitle}
        message={dialogMessage}
        onCancel={() => setIsConfirmDialogOpen(false)}
        cancelText="Hủy"
        onConfirm={() => {
          onConfirm();
          setIsConfirmDialogOpen(false);
        }}
        confirmText="Xác nhận"
      />

      <Modal
        isOpen={isSuccessDialogOpen}
        onClose={() => setIsSuccessDialogOpen(false)}
        type="success"
        title={dialogTitle}
        message={dialogMessage}
        confirmText="Đóng"
      />

      <RefreshLoader isOpen={loading} />
    </div>
  );
};

export default ReviewsListPage;
