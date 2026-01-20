"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  cinemaService,
  roomService,
  type Cinema,
  PaginationMeta,
  RoomCreate,
  CinemaFormPayload,
} from "@/services";

export function useCinemaLogic() {
  const router = useRouter();

  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);

  const [page, setPage] = useState(1);
  const [limit] = useState(5);

  const [temp, setTemp] = useState("");
  const [nameKw, setNameKw] = useState("");

  const [cityKw, setCityKw] = useState("");

  const [loading, setLoading] = useState(false);

  const [open, setOpen] = useState(false);
  const [createCinema, setCreateCinema] = useState(false);
  const [editCinema, setEditCinema] = useState<Cinema | null>(null);

  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMessage, setDialogMessage] = useState<React.ReactNode>("");
  const [onConfirm, setOnConfirm] = useState<() => void>(() => () => {});

  const fetchPage = useCallback(
    async (toPage = page) => {
      setLoading(true);
      try {
        const res = await cinemaService.getAllCinemas({
          page: toPage,
          limit,
          search: nameKw.trim() || undefined,
          city: cityKw.trim() || undefined,
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
    [limit, nameKw, cityKw, page],
  );

  useEffect(() => {
    const t = setTimeout(() => setNameKw(temp), 400);
    return () => clearTimeout(t);
  }, [temp]);

  useEffect(() => {
    setPage(1);
  }, [nameKw, cityKw]);

  useEffect(() => {
    void fetchPage(page);
  }, [page, nameKw, cityKw, fetchPage]);

  const displayRows = useMemo(() => cinemas, [cinemas]);

  const handleRefresh = async () => {
    await fetchPage(page);
  };

  const clearFilters = () => {
    setTemp("");
    setNameKw("");
    setCityKw("");
    setPage(1);
  };

  const canClearFilters = useMemo(
    () => temp.trim() !== "" || cityKw.trim() !== "",
    [temp, cityKw],
  );

  const handleAddOpen = () => {
    setCreateCinema(true);
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
    action: () => void,
  ) => {
    setDialogTitle(title);
    setDialogMessage(message);
    setOnConfirm(() => action);
    setIsConfirmDialogOpen(true);
  };

  const handleDelete = (g: Cinema) => {
    openConfirm(
      "Xác nhận lưu trữ",
      <>Bạn có chắc chắn muốn lưu trữ rạp phim này không?</>,
      async () => {
        setIsConfirmDialogOpen(false);
        try {
          await cinemaService.deleteCinema(g.id);
          await fetchPage(1);
          setDialogTitle("Thành công");
          setDialogMessage("Đã ẩn (soft-delete) rạp phim.");
          toast.success("Đã ẩn (soft-delete) rạp phim.");
        } catch (err) {
          setDialogTitle("Thất bại");
          setDialogMessage("Không thể xóa rạp phim, vui lòng thử lại.");
          setIsErrorDialogOpen(true);
          console.error("Delete cinema error:", err);
        }
      },
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
          await fetchPage(page);
          setDialogTitle("Thành công");
          setDialogMessage("Khôi phục rạp phim thành công");
          toast.success("Khôi phục rạp phim thành công");
        } catch (err) {
          setDialogTitle("Thất bại");
          setDialogMessage("Không thể khôi phục rạp phim, vui lòng thử lại.");
          setIsErrorDialogOpen(true);
          console.error("Restore cinema error:", err);
        }
      },
    );
  };

  const handleCinemaAction = async (
    payload: CinemaFormPayload,
    mode: "create" | "edit",
    original?: Cinema,
  ): Promise<string | undefined> => {
    const { rooms, ...cinemaData } = payload;

    if (mode === "create") {
      const res = await cinemaService.addCinema(cinemaData);
      return res?.id;
    } else if (mode === "edit" && original) {
      await cinemaService.updateCinema(original.id, cinemaData);
      return original.id;
    }
    return undefined;
  };

  const handleRoomBatchAction = async (
    cinemaId: string,
    rooms: RoomCreate[],
  ) => {
    if (!rooms || rooms.length === 0) return;

    const promises = rooms.map((room) => {
      return roomService.createRoom({
        cinemaId: cinemaId,
        name: room.name,
        vipPrice: room.vipPrice === 0 ? 1 : room.vipPrice,
        couplePrice: room.couplePrice === 0 ? 1 : room.couplePrice,
        seatLayout: room.seatLayout,
      });
    });

    await Promise.all(promises);
  };

  const handleSubmitCinema = (
    payload: CinemaFormPayload,
    mode: "create" | "edit",
    original?: Cinema,
  ) => {
    const isCreate = mode === "create";
    const cinemaName = payload.name || original?.name || "";

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
        setLoading(true);

        try {
          const cinemaId = await handleCinemaAction(payload, mode, original);

          if (!cinemaId) {
            throw new Error("Không lấy được ID rạp từ hệ thống.");
          }

          if (isCreate && payload.rooms.length > 0) {
            await handleRoomBatchAction(cinemaId, payload.rooms);
          }

          toast.success(
            isCreate
              ? `Đã thêm rạp và ${payload.rooms.length} phòng thành công.`
              : "Đã cập nhật thông tin rạp thành công.",
          );

          setEditCinema(null);
          if (isCreate) {
            setCreateCinema(false);
          }
          await fetchPage(1);
        } catch (e) {
          console.error(e);
          setDialogTitle("Thất bại");
          setDialogMessage("Đã có lỗi xảy ra trong quá trình xử lý.");
          setIsErrorDialogOpen(true);
        } finally {
          setLoading(false);
        }
      },
    );
  };

  // const handleSubmitCinema = (
  //   data: CreateCinemaRequest,
  //   modeForm: "create" | "edit",
  //   original?: Cinema
  // ) => {
  //   const isCreate = modeForm === "create";
  //   const cinemaName = data.name || original?.name || "";

  //   setOpen(false);
  //   setEditCinema(original ?? null);

  //   openConfirm(
  //     isCreate ? "Xác nhận thêm rạp" : "Xác nhận cập nhật rạp",
  //     <>
  //       Bạn có chắc muốn <b>{isCreate ? "thêm mới" : "cập nhật"}</b> rạp{" "}
  //       <span className="text-blue-600 font-semibold">{cinemaName}</span> không?
  //     </>,
  //     async () => {
  //       setIsConfirmDialogOpen(false);
  //       try {
  //         setLoading(true);

  //         if (isCreate) {
  //           await cinemaService.addCinema(data);
  //         } else if (original) {
  //           await cinemaService.updateCinema(original.id, data);
  //         }

  //         setDialogTitle("Thành công");
  //         setDialogMessage(
  //           isCreate
  //             ? "Đã thêm rạp mới thành công."
  //             : "Đã cập nhật thông tin rạp thành công."
  //         );
  //         setIsSuccessDialogOpen(true);

  //         setEditCinema(null);
  //         await fetchPage(1);
  //       } catch (e) {
  //         setDialogTitle("Thất bại");
  //         setDialogMessage("Không thể lưu rạp, vui lòng thử lại.");
  //         setIsErrorDialogOpen(true);
  //         console.error(e);
  //       } finally {
  //         setLoading(false);
  //       }
  //     }
  //   );
  // };

  return {
    displayRows,
    loading,

    page,
    setPage,
    pagination,

    temp,
    setTemp,
    cityKw,
    setCityKw,
    clearFilters,
    canClearFilters,

    handleRefresh,
    handleAddOpen,
    handleEditOpen,
    handleViewNavigate,
    handleDelete,
    handleRestore,
    handleSubmitCinema,

    open,
    setOpen,
    createCinema,
    editCinema,
    setCreateCinema,

    isConfirmDialogOpen,
    setIsConfirmDialogOpen,
    isErrorDialogOpen,
    setIsErrorDialogOpen,
    dialogTitle,
    dialogMessage,
    onConfirm,
  };
}
