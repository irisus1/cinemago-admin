// hooks/useReviewLogic.ts
"use client";

import { useState, useCallback, useEffect } from "react";
import {
  reviewService,
  type Review,
  type PaginationMeta,
  movieService,
  type Movie,
  type GetReviewsParams,
} from "@/services";

export function useReviewLogic() {
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
  const [viewingReview, setViewingReview] = useState<Review | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // dialogs
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMessage, setDialogMessage] = useState<React.ReactNode>("");
  const [onConfirm, setOnConfirm] = useState<() => void>(() => () => {});

  // ==== FETCH MOVIES ====
  const fetchMovies = useCallback(async () => {
    try {
      const res = await movieService.getAllMovies({
        page: 1,
        limit: 1000,
      });
      const list = res.data ?? [];
      setMovies(list);

      // nếu chưa có movieId thì auto set phim đầu
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
  }, [filters.movieId]);

  // ==== FETCH REVIEWS ====
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

  // initial load movies
  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  // load reviews khi page / filters đổi
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

  // reset page về 1 khi filter đổi
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
    await fetchReviews(page);
  };

  const handleView = (r: Review) => {
    setViewingReview(r);
  };

  const clearFilters = () => {
    setFilters((prev) => ({
      movieId: prev.movieId, // giữ phim
      rating: undefined,
      status: undefined,
      type: undefined,
      isActive: undefined,
    }));
  };

  const canClearFilters =
    filters.rating !== undefined ||
    filters.status !== undefined ||
    filters.type !== undefined ||
    filters.isActive !== undefined;

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

  return {
    // data
    reviews,
    movies,
    filters,
    setFilters,
    loading,
    viewingReview,
    setViewingReview,

    // pagination
    page,
    setPage,
    pagination,
    totalPages,
    totalItems,

    // filter helpers
    clearFilters,
    canClearFilters,
    handleRefresh,

    // actions
    handleHide,
    handleUnhide,
    handleView,

    // dialogs
    isConfirmDialogOpen,
    setIsConfirmDialogOpen,
    isSuccessDialogOpen,
    setIsSuccessDialogOpen,
    dialogTitle,
    dialogMessage,
    onConfirm,
  };
}
