// hooks/useReviewLogic.ts
"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
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

  const [replyingReview, setReplyingReview] = useState<Review | null>(null);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // dialogs
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);

  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMessage, setDialogMessage] = useState<React.ReactNode>("");
  const [onConfirm, setOnConfirm] = useState<() => void>(() => () => { });

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

  const handleReplyOpen = (review: Review) => {
    setReplyingReview(review);
  };

  // Hàm đóng modal reply
  const handleReplyClose = () => {
    setReplyingReview(null);
    setIsSubmittingReply(false);
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
          toast.success("Đã ẩn đánh giá.");
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
          toast.success("Đã hiển thị lại đánh giá.");
        } catch (err) {
          alert("Thao tác thất bại: " + err);
        }
      }
    );
  };

  const handleSubmitReply = async (reviewId: string, content: string) => {
    setIsSubmittingReply(true);
    try {
      const updatedReview = await reviewService.replyToReview({
        reviewId,
        content,
      });

      // Cập nhật lại list review local để hiển thị trạng thái mới nếu cần
      // (Tuỳ vào BE trả về gì, ở đây giả sử cập nhật lại row đó)
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? updatedReview : r))
      );

      toast.success("Đã gửi phản hồi thành công.");
      handleReplyClose(); // Đóng modal sau khi thành công
    } catch {
      setDialogTitle("Lỗi");
      setDialogMessage("Không thể gửi phản hồi.");
      setIsErrorDialogOpen?.(true); // Nếu bạn có dialog error
    } finally {
      setIsSubmittingReply(false);
    }
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
    replyingReview,

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
    handleReplyOpen,
    handleReplyClose,
    handleSubmitReply,
    isSubmittingReply,

    // dialogs
    isConfirmDialogOpen,
    setIsConfirmDialogOpen,

    isErrorDialogOpen,
    setIsErrorDialogOpen,

    dialogTitle,
    dialogMessage,
    onConfirm,
  };
}
