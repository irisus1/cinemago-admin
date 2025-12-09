"use client";

import React from "react";
import Table, { Column } from "@/components/Table";
import { Modal } from "@/components/Modal";
import RefreshLoader from "@/components/Loading";
import ReviewFilters from "./filter";
import ReviewDetailModal from "@/components/modal/ReviewDetailModal";
import type { Review } from "@/services";
import { useReviewLogic } from "@/hooks/useReviewLogic";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { BiRefresh } from "react-icons/bi";
import { MessageSquareReply } from "lucide-react";
import ReplyReviewModal from "@/components/modal/ReplyReviewModal";

const ReviewsListPage: React.FC = () => {
  const {
    reviews,
    movies,
    filters,
    setFilters,
    loading,

    page,
    setPage,
    pagination,
    totalPages,
    totalItems,

    handleHide,
    handleUnhide,
    viewingReview,
    handleView,

    replyingReview,
    handleReplyOpen, // Đổi tên hàm cũ handleReply -> handleReplyOpen cho rõ nghĩa
    handleReplyClose,
    handleSubmitReply,
    isSubmittingReply,

    setViewingReview,
    clearFilters,
    canClearFilters,

    isConfirmDialogOpen,
    setIsConfirmDialogOpen,
    isSuccessDialogOpen,
    setIsSuccessDialogOpen,
    isErrorDialogOpen,
    setIsErrorDialogOpen,

    dialogTitle,
    dialogMessage,
    onConfirm,
  } = useReviewLogic();

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
      key: "status",
      render: (_: unknown, row: Review) => {
        const isReplied = row.status === "Đã trả lời";

        return (
          <span
            className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${
              isReplied
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : "bg-orange-50 text-orange-700 border-orange-200"
            }`}
          >
            {row.status}
          </span>
        );
      },
      className: "w-[130px]",
    },
    {
      header: "Hiển thị",
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
      headerClassName: "text-center",
      render: (_: unknown, row: Review) => (
        <div className="flex gap-2 justify-center items-center">
          {row.isActive ? (
            <>
              <button
                className="text-green-600 hover:text-green-800"
                onClick={() => handleView(row)}
                title="Xem chi tiết"
              >
                <FiEye className="w-4 h-4" />
              </button>
              <button
                className="text-blue-600 hover:text-blue-800"
                onClick={() => handleReplyOpen(row)}
                title="Phản hồi"
              >
                <MessageSquareReply className="w-4 h-4" />
              </button>
              <button
                className="text-red-600 hover:text-red-800"
                onClick={() => handleHide(row)}
                title="Ẩn đánh giá"
              >
                <FiEyeOff className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              className="text-green-600 hover:text-green-800"
              onClick={() => handleUnhide(row)}
              title="Hiển thị lại"
            >
              <BiRefresh className="w-4 h-4" />
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
          onClear={clearFilters}
          canClearFilters={canClearFilters}
        />
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <Table<Review>
          columns={columns}
          data={reviews}
          getRowKey={(r) => r.id}
        />

        {totalItems > 0 && (
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50">
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

      <ReviewDetailModal
        open={!!viewingReview}
        review={viewingReview}
        movies={movies}
        onClose={() => setViewingReview(null)}
      />

      <ReplyReviewModal
        open={!!replyingReview}
        review={replyingReview}
        onClose={handleReplyClose}
        onSubmit={handleSubmitReply}
        isSubmitting={isSubmittingReply}
      />

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

      <Modal
        isOpen={isErrorDialogOpen}
        onClose={() => setIsErrorDialogOpen(false)}
        type="error"
        title={dialogTitle}
        message={dialogMessage}
        confirmText="Đóng"
      />

      <RefreshLoader isOpen={loading} />
    </div>
  );
};

export default ReviewsListPage;
