"use client";

import { useState, useCallback, useEffect } from "react";
import { genreService, type Genre, PaginationMeta } from "@/services";

type GenreFormPayload = {
  name: string;
  description: string;
};

export function useGenreLogic() {
  // --- STATE ---
  const [genres, setGenres] = useState<Genre[]>([]);
  const [queryName, setQueryName] = useState("");
  const [time, setTime] = useState(""); // State cho input (debounce)

  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(7);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modal states
  const [open, setOpen] = useState(false);
  const [editGenre, setEditGenre] = useState<Genre | null>(null);

  // Confirm/Success Dialog states
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMessage, setDialogMessage] = useState<React.ReactNode>("");
  const [onConfirm, setOnConfirm] = useState<() => void>(() => () => {});

  // --- DATA FETCHING ---
  const fetchGenres = useCallback(
    async (toPage = page) => {
      try {
        setLoading(true);
        const { data, pagination } = await genreService.getAllGenres({
          page: toPage,
          limit: pageSize,
          search: queryName.trim() || undefined,
        });

        setGenres(data ?? []);
        setPagination(pagination ?? null);
        setTotalPages(pagination?.totalPages ?? 1);
        setTotalItems(pagination?.totalItems ?? 0);
        if (pagination?.currentPage && pagination.currentPage !== page) {
          setPage(pagination.currentPage);
        }
      } catch (e) {
        console.error(e);
        setGenres([]);
        setPagination(null);
        setTotalPages(1);
        setTotalItems(0);
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize, queryName]
  );

  // --- EFFECTS ---
  useEffect(() => {
    fetchGenres();
  }, [page, queryName, fetchGenres]);

  // Reset về trang 1 khi search thay đổi
  useEffect(() => {
    setPage(1);
  }, [queryName]);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setQueryName(time), 300);
    return () => clearTimeout(t);
  }, [time]);

  // --- HANDLERS ---
  const handleRefresh = async () => {
    setLoading(true);
    await fetchGenres();
    setLoading(false);
  };

  const clearFilters = () => {
    setTime("");
    setQueryName("");
  };

  const handleAddOpen = () => {
    setEditGenre(null);
    setOpen(true);
  };

  const handleEditOpen = (g: Genre) => {
    setEditGenre(g);
    setOpen(true);
  };

  // Helper mở dialog confirm
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

  const handleDelete = (g: Genre) => {
    openConfirm(
      "Xác nhận xóa",
      <>Bạn có chắc muốn xóa thể loại này không ?</>,
      async () => {
        setIsConfirmDialogOpen(false);
        try {
          await genreService.deleteGenre(g.id);

          // Cập nhật UI ngay lập tức (Optimistic update)
          setGenres((prev) =>
            prev.map((it) => (it.id === g.id ? { ...it, isActive: false } : it))
          );
          setDialogTitle("Thành công");
          setDialogMessage("Đã xóa thể loại.");
          setIsSuccessDialogOpen(true);
        } catch (err) {
          console.log(err);

          setDialogTitle("Thất bại");
          setDialogMessage("Xóa thể loại thất bại.");
          setIsErrorDialogOpen(true);
        }
      }
    );
  };

  const handleRestore = (g: Genre) => {
    openConfirm(
      "Xác nhận khôi phục",
      <>Khôi phục thể loại này?</>,
      async () => {
        setIsConfirmDialogOpen(false);
        try {
          await genreService.restoreGenre(g.id);

          // Cập nhật UI ngay lập tức
          setGenres((prev) =>
            prev.map((it) => (it.id === g.id ? { ...it, isActive: true } : it))
          );
          setDialogTitle("Thành công");
          setDialogMessage("Khôi phục thể loại thành công");
          setIsSuccessDialogOpen(true);
        } catch (err) {
          console.log(err);

          setDialogTitle("Thất bại");
          setDialogMessage("Khôi phục thể loại thất bại.");
          setIsErrorDialogOpen(true);
        }
      }
    );
  };

  const handleSubmitGenre = (
    data: GenreFormPayload,
    modeForm: "create" | "edit",
    original?: Genre
  ) => {
    const isCreate = modeForm === "create";
    const genreName = data.name || original?.name || "";

    setOpen(false);
    setEditGenre(original ?? null);

    openConfirm(
      isCreate ? "Xác nhận thêm thể loại" : "Xác nhận cập nhật thể loại",
      <>
        Bạn có chắc muốn <b>{isCreate ? "thêm mới" : "cập nhật"}</b> thể loại{" "}
        <span className="text-blue-600 font-semibold">{genreName}</span> không?
      </>,
      async () => {
        setIsConfirmDialogOpen(false);
        try {
          setLoading(true);

          if (isCreate) {
            await genreService.addGenre({
              name: data.name,
              description: data.description,
            });
          } else if (original) {
            await genreService.updateGenre(original.id, {
              name: data.name,
              description: data.description,
            });
          }

          setDialogTitle("Thành công");
          setDialogMessage(
            isCreate
              ? "Đã thêm thể loại mới."
              : "Đã cập nhật thông tin thể loại."
          );
          setIsSuccessDialogOpen(true);
          setEditGenre(null);
          await fetchGenres();
        } catch (err) {
          console.error(err);
          setDialogTitle("Thất bại");
          setDialogMessage("Thao tác thất bại: " + err);
          setIsErrorDialogOpen(true);
        } finally {
          setLoading(false);
        }
      }
    );
  };

  return {
    genres,
    loading,
    page,
    setPage,
    pagination,
    totalPages,
    totalItems,
    time,
    setTime, // Để bind vào input

    // Modal states
    open,
    setOpen,
    editGenre,
    isConfirmDialogOpen,
    setIsConfirmDialogOpen,
    isSuccessDialogOpen,
    setIsSuccessDialogOpen,
    isErrorDialogOpen,
    setIsErrorDialogOpen,
    dialogTitle,
    dialogMessage,
    onConfirm,

    // Actions
    handleRefresh,
    clearFilters,
    handleAddOpen,
    handleEditOpen,
    handleDelete,
    handleRestore,
    handleSubmitGenre,
  };
}
