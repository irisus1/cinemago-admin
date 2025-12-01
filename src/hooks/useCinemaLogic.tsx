"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  cinemaService,
  type Cinema,
  PaginationMeta,
  CreateCinemaRequest,
} from "@/services";

type Mode = "server" | "client";

export function useCinemaLogic() {
  const router = useRouter();

  // --- STATE ---
  const [cinemas, setCinemas] = useState<Cinema[]>([]); // Data for Server mode
  const [allRows, setAllRows] = useState<Cinema[]>([]); // Data for Client mode

  // Pagination
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(5);

  // Filters & Mode
  const [mode, setMode] = useState<Mode>("server");
  const [temp, setTemp] = useState(""); // Input search name (cần debounce)
  const [nameKw, setNameKw] = useState(""); // Search keyword đã debounce
  const [cityKw, setCityKw] = useState("");
  const [addrKw, setAddrKw] = useState("");

  const hasClientFilter = cityKw.trim() !== "" || addrKw.trim() !== "";
  const [loading, setLoading] = useState(false);

  // Modal State
  const [open, setOpen] = useState(false);
  const [editCinema, setEditCinema] = useState<Cinema | null>(null);

  // Dialog States
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMessage, setDialogMessage] = useState<React.ReactNode>("");
  const [onConfirm, setOnConfirm] = useState<() => void>(() => () => {});

  // --- DATA FETCHING ---

  // 1. Fetch theo trang (Server Mode)
  const fetchPage = useCallback(
    async (toPage = page) => {
      setLoading(true);
      try {
        const res = await cinemaService.getAllCinemas({
          page: toPage,
          limit,
          search: nameKw.trim() || undefined,
        });

        setCinemas(res?.data ?? []);
        setPagination(res?.pagination ?? null);

        if (
          res?.pagination?.currentPage &&
          res.pagination.currentPage !== page
        ) {
          setPage(res.pagination.currentPage);
        }
      } catch (err) {
        console.error("Error fetching cinemas:", err);
        setCinemas([]);
        setPagination(null);
      } finally {
        setLoading(false);
      }
    },
    [limit, nameKw, page]
  );

  // 2. Fetch toàn bộ (Client Mode)
  const fetchAllForClient = useCallback(
    async (opts?: { search?: string; pageSize?: number }) => {
      setLoading(true);
      try {
        const result: Cinema[] = [];
        let nextPage = 1;
        let pageSizeLocal = opts?.pageSize ?? limit;

        while (true) {
          const res = await cinemaService.getAllCinemas({
            page: nextPage,
            limit: pageSizeLocal,
            search: opts?.search?.trim() || undefined,
          });
          const { data, pagination } = res;
          result.push(...(data ?? []));

          if (pagination?.pageSize && pagination.pageSize !== pageSizeLocal) {
            pageSizeLocal = pagination.pageSize;
          }

          if (!pagination?.hasNextPage) break;
          nextPage = (pagination?.currentPage ?? nextPage) + 1;

          if (pagination?.totalPages && nextPage > pagination.totalPages) break;
        }

        setAllRows(result);
      } catch (err) {
        console.error("Error fetching all pages:", err);
        setAllRows([]);
      } finally {
        setLoading(false);
      }
    },
    [limit]
  );

  // --- EFFECTS ---

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setNameKw(temp), 400);
    return () => clearTimeout(t);
  }, [temp]);

  // Tự động chuyển mode dựa trên filter
  useEffect(() => {
    const nextMode: Mode = hasClientFilter ? "client" : "server";
    setMode(nextMode);
    setPage(1);
  }, [hasClientFilter]);

  // Trigger fetch khi điều kiện thay đổi
  useEffect(() => {
    if (mode === "server") fetchPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, page, limit, nameKw]);

  useEffect(() => {
    if (mode === "client")
      fetchAllForClient({ search: nameKw, pageSize: limit });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, nameKw, limit]);

  useEffect(() => {
    if (mode === "client") setPage(1);
  }, [cityKw, addrKw, mode]);

  // --- FILTERING LOGIC ---
  const source = mode === "client" ? allRows : cinemas;

  const filtered = useMemo(() => {
    if (mode !== "client") return source;
    const c = cityKw.trim().toLowerCase();
    const a = addrKw.trim().toLowerCase();
    return source.filter((x) => {
      const okCity = c ? x.city?.toLowerCase().includes(c) : true;
      const okAddr = a ? x.address?.toLowerCase().includes(a) : true;
      return okCity && okAddr;
    });
  }, [mode, source, cityKw, addrKw]);

  const clientTotalPages = Math.max(1, Math.ceil(filtered.length / limit));

  const displayRows =
    mode === "client"
      ? filtered.slice((page - 1) * limit, (page - 1) * limit + limit)
      : source;

  // --- HANDLERS ---
  const handleRefresh = async () => {
    if (mode === "server") await fetchPage();
    else await fetchAllForClient({ search: nameKw, pageSize: limit });
  };

  const clearFilters = () => {
    setTemp("");
    setNameKw("");
    setCityKw("");
    setAddrKw("");
  };

  const canClearFilters = useMemo(
    () => temp.trim() !== "" || cityKw.trim() !== "" || addrKw.trim() !== "",
    [temp, cityKw, addrKw]
  );

  const handleAddOpen = () => {
    setEditCinema(null);
    setOpen(true);
  };

  const handleEditOpen = (g: Cinema) => {
    setEditCinema(g);
    setOpen(true);
  };

  const handleViewNavigate = (g: Cinema) =>
    router.push(`/admin/cinema/${g.id}`);

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

  const handleDelete = (g: Cinema) => {
    openConfirm(
      "Xác nhận xóa",
      <>Bạn có chắc chắn muốn xóa rạp phim này không?</>,
      async () => {
        setIsConfirmDialogOpen(false);
        try {
          await cinemaService.deleteCinema(g.id);
          if (mode === "server") {
            await fetchPage();
          } else {
            await fetchAllForClient({ search: nameKw, pageSize: limit });
          }
          setDialogTitle("Thành công");
          setDialogMessage("Đã ẩn (soft-delete) rạp phim.");
          setIsSuccessDialogOpen(true);
        } catch (err) {
          alert("Thao tác thất bại: " + err);
        }
      }
    );
  };

  const handleRestore = (g: Cinema) => {
    openConfirm(
      "Xác nhận khôi phục",
      <>Khôi phục rạp phim này?</>,
      async () => {
        setIsConfirmDialogOpen(false);
        try {
          await cinemaService.restoreCinema(g.id);
          if (mode === "server") {
            await fetchPage();
          } else {
            await fetchAllForClient({ search: nameKw, pageSize: limit });
          }
          setDialogTitle("Thành công");
          setDialogMessage("Khôi phục rạp phim thành công");
          setIsSuccessDialogOpen(true);
        } catch (err) {
          alert("Thao tác thất bại: " + err);
        }
      }
    );
  };

  const handleSubmitCinema = (
    data: CreateCinemaRequest,
    modeForm: "create" | "edit",
    original?: Cinema
  ) => {
    const isCreate = modeForm === "create";
    const cinemaName = data.name || original?.name || "";

    setOpen(false);
    setEditCinema(original ?? null);

    openConfirm(
      isCreate ? "Xác nhận thêm rạp" : "Xác nhận cập nhật rạp",
      <>
        Bạn có chắc muốn <b>{isCreate ? "thêm mới" : "cập nhật"}</b> rạp{" "}
        <span className="text-blue-600 font-semibold">{cinemaName}</span> không?
      </>,
      async () => {
        setIsConfirmDialogOpen(false);
        try {
          setLoading(true);

          if (isCreate) {
            await cinemaService.addCinema(data);
          } else if (original) {
            await cinemaService.updateCinema(original.id, data);
          }

          setDialogTitle("Thành công");
          setDialogMessage(
            isCreate
              ? "Đã thêm rạp mới thành công."
              : "Đã cập nhật thông tin rạp thành công."
          );
          setIsSuccessDialogOpen(true);

          setEditCinema(null);
          if (mode === "server") {
            await fetchPage();
          } else {
            await fetchAllForClient({ search: nameKw, pageSize: limit });
          }
        } catch (e) {
          setDialogTitle("Thất bại");
          setDialogMessage("Không thể lưu rạp, vui lòng thử lại.");
          setIsErrorDialogOpen(true);
          console.error(e);
        } finally {
          setLoading(false);
        }
      }
    );
  };

  return {
    // Data & Logic
    mode,
    displayRows,
    loading,

    // Pagination
    page,
    setPage,
    pagination,
    clientTotalPages,

    // Filters
    temp,
    setTemp,
    cityKw,
    setCityKw,
    addrKw,
    setAddrKw,
    clearFilters,
    canClearFilters,

    // Actions
    handleRefresh,
    handleAddOpen,
    handleEditOpen,
    handleViewNavigate,
    handleDelete,
    handleRestore,
    handleSubmitCinema,

    // Modals & Dialogs
    open,
    setOpen,
    editCinema,
    isConfirmDialogOpen,
    setIsConfirmDialogOpen,
    isSuccessDialogOpen,
    setIsSuccessDialogOpen,
    isErrorDialogOpen,
    setIsErrorDialogOpen,
    dialogTitle,
    dialogMessage,
    onConfirm,
  };
}
