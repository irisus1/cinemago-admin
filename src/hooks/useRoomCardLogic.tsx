"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  roomService,
  cinemaService,
  type Room,
  PaginationMeta,
  RoomUpdate,
  RoomCreate,
  Cinema,
  SeatCell,
} from "@/services";
import { useAuth } from "@/context/AuthContext";

const makeBaseLayout10x10 = () => {
  const rows = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
  const cols = 10;
  const out: { row: string; col: number; type: "NORMAL" }[] = [];
  for (const r of rows) {
    for (let c = 1; c <= cols; c++) {
      out.push({ row: r, col: c, type: "NORMAL" });
    }
  }
  return out;
};

export type RoomFormData = {
  name: string;
  vipPrice: number;
  couplePrice: number;
  seatLayout?: SeatCell[];
};

type CinemaOption = {
  id: string;
  name: string;
  city?: string | null;
};

export function useRoomLogic(initialCinemaId?: string) {
  const { user } = useAuth();
  const isManager = user?.role === "MANAGER";

  const [cinemaOptions, setCinemaOptions] = useState<CinemaOption[]>([]);
  const [cinemaId, setCinemaId] = useState<string>(
    (isManager ? user?.cinemaId : initialCinemaId) ?? ""
  );
  const [cinemaSearch, setCinemaSearch] = useState<string>("");
  const [cinemaSearchInput, setCinemaSearchInput] = useState("");

  const [rooms, setRooms] = useState<Room[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState<"__ALL__" | "active" | "inactive">(
    "__ALL__"
  );

  const [loading, setLoading] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  const [open, setOpen] = useState(false);
  const [openLayout, setOpenLayout] = useState(false);
  const [openRoom, setOpenRoom] = useState<Room | null>(null);
  const [editRoom, setEditRoom] = useState<Room | null>(null);

  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMessage, setDialogMessage] = useState<React.ReactNode>("");
  const [onConfirm, setOnConfirm] = useState<() => void>(() => () => { });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await cinemaService.getAllCinemas({ page: 1, limit: 1000 });
        const data = (res.data ?? []) as Cinema[];

        if (cancelled) return;

        const opts: CinemaOption[] = data.map((c) => ({
          id: String(c.id),
          name: c.name,
          city: c.city,
        }));
        setCinemaOptions(opts);

        if (isManager && user?.cinemaId) {
          setCinemaId(user.cinemaId);
        } else if (!cinemaId && (initialCinemaId || opts.length > 0)) {
          setCinemaId(initialCinemaId ?? opts[0].id);
        }
      } catch (e) {
        console.error("Error loading cinemas:", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialCinemaId, cinemaId, isManager, user?.cinemaId]);

  useEffect(() => {
    const t = setTimeout(() => setCinemaSearch(cinemaSearchInput), 300);
    return () => clearTimeout(t);
  }, [cinemaSearchInput]);
  const filteredCinemaOptions = useMemo(
    () =>
      cinemaOptions.filter((c) => {
        if (!cinemaSearch.trim()) return true;
        const kw = cinemaSearch.trim().toLowerCase();
        return (
          c.name.toLowerCase().includes(kw) ||
          (c.city && c.city.toLowerCase().includes(kw))
        );
      }),
    [cinemaOptions, cinemaSearch]
  );

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const fetchRooms = useCallback(
    async (toPage = page) => {
      if (!cinemaId) {
        setRooms([]);
        setPagination(null);
        return;
      }

      setLoading(true);
      try {
        const res = await roomService.getRooms({
          cinemaId,
          page: toPage,
          limit,
          search: search.trim() || undefined,
        });

        const { data, pagination } = res;
        setRooms(data ?? []);
        setPagination(pagination ?? null);

        if (pagination?.currentPage && pagination.currentPage !== page) {
          setPage(pagination.currentPage);
        }
      } catch (e) {
        console.error("Error fetching rooms:", e);
        setRooms([]);
        setPagination(null);
      } finally {
        setLoading(false);
      }
    },
    [cinemaId, page, limit, search]
  );

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms, reloadTick]);

  const displayRows = useMemo(() => {
    if (status === "__ALL__") return rooms;
    return rooms.filter((r) =>
      status === "active" ? r.isActive : !r.isActive
    );
  }, [rooms, status]);

  const canClearFilters = useMemo(() => {
    const hasSearch = search.trim().length > 0;
    const hasStatusFilter = status !== "__ALL__";
    return hasSearch || hasStatusFilter;
  }, [search, status]);

  const handleRefresh = () => setReloadTick((x) => x + 1);

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatus("__ALL__");
    setPage(1);
  };

  const handleViewLayoutOpen = (r: Room) => {
    setOpenRoom(r);
    setOpenLayout(true);
  };

  const handleAddOpen = () => {
    setEditRoom(null);
    setOpen(true);
  };

  const handleEditOpen = async (r: Room) => {
    try {
      const fullRoom = await roomService.getRoomById(r.id);
      setEditRoom(fullRoom);
      setOpen(true);
    } catch (e) {
      console.error(e);
      setDialogTitle("Lỗi");
      setDialogMessage("Không tải được thông tin phòng");
      setIsErrorDialogOpen(true);
    }
  };

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

  const handleDelete = (room: Room) => {
    openConfirm(
      "Xác nhận lưu trữ",
      <>
        Bạn có chắc chắn muốn lưu trữ (ẩn) phòng <b>{room.name}</b> không?
      </>,
      async () => {
        setIsConfirmDialogOpen(false);
        try {
          await roomService.deleteRoom(room.id);
          setDialogTitle("Thành công");
          setDialogTitle("Thành công");
          toast.success("Đã ẩn (soft-delete) phòng.");
          handleRefresh();
        } catch (err) {
          console.error(err);
          setDialogTitle("Lỗi");
          setDialogMessage("Thao tác xóa thất bại");
          setIsErrorDialogOpen(true);
        }
      }
    );
  };

  const handleRestore = (room: Room) => {
    openConfirm(
      "Xác nhận khôi phục",
      <>
        Khôi phục phòng <b>{room.name}</b>?
      </>,
      async () => {
        setIsConfirmDialogOpen(false);
        try {
          await roomService.restoreRoom(room.id);
          setDialogTitle("Thành công");
          setDialogTitle("Thành công");
          toast.success("Khôi phục phòng thành công");
          handleRefresh();
        } catch (err) {
          console.error(err);
          setDialogTitle("Lỗi");
          setDialogMessage("Thao tác khôi phục thất bại");
          setIsErrorDialogOpen(true);
        }
      }
    );
  };

  const handleSubmitRoom = (formData: RoomFormData) => {
    const isCreate = !editRoom;

    if (!cinemaId) {
      setDialogTitle("Thiếu thông tin rạp");
      setDialogMessage("Vui lòng chọn rạp trước khi lưu phòng.");
      setIsErrorDialogOpen(true);
      return;
    }

    setOpen(false);
    openConfirm(
      isCreate ? "Xác nhận tạo phòng" : "Xác nhận cập nhật phòng",
      isCreate ? (
        <>
          Bạn có chắc muốn tạo phòng mới <b>{formData.name}</b> không?
        </>
      ) : (
        <>
          Bạn có chắc muốn cập nhật phòng <b>{editRoom?.name}</b> không?
        </>
      ),
      async () => {
        setIsConfirmDialogOpen(false);
        setIsSubmitting(true);

        try {
          const payloadBase = {
            cinemaId,
            name: formData.name,
            vipPrice: formData.vipPrice || 1,
            couplePrice: formData.couplePrice || 1,
            seatLayout: formData.seatLayout,
          };

          if (isCreate) {
            const payloadCreate: RoomCreate = {
              ...payloadBase,
              seatLayout: formData.seatLayout || makeBaseLayout10x10(),
            };
            await roomService.createRoom(payloadCreate);
          } else if (editRoom) {
            const payloadUpdate: RoomUpdate = {
              ...payloadBase,
              seatLayout: formData.seatLayout || editRoom.seatLayout,
            };
            await roomService.updateRoom(editRoom.id, payloadUpdate);
          }

          toast.success(isCreate ? "Tạo phòng thành công" : "Cập nhật phòng thành công");
          setEditRoom(null);
          handleRefresh();
        } catch (e) {
          console.error(e);
          setDialogTitle("Lỗi");
          setDialogMessage("Có lỗi xảy ra khi lưu phòng");
          setIsErrorDialogOpen(true);
        } finally {
          setIsSubmitting(false);
        }
      }
    );
  };

  const handleModalSuccess = () => {
    setOpen(false);
    setEditRoom(null);
    handleRefresh();
  };

  return {
    rooms,
    displayRows,
    pagination,
    loading,
    page,
    setPage,

    cinemaOptions,
    filteredCinemaOptions,
    cinemaId,
    setCinemaId,
    cinemaSearch,
    setCinemaSearch,
    cinemaSearchInput,
    setCinemaSearchInput,

    searchInput,
    setSearchInput,
    status,
    setStatus,
    clearFilters,
    canClearFilters,

    open,
    setOpen,
    openLayout,
    setOpenLayout,
    openRoom,
    editRoom,

    isConfirmDialogOpen,
    setIsConfirmDialogOpen,
    isErrorDialogOpen,
    setIsErrorDialogOpen,
    dialogTitle,
    dialogMessage,
    onConfirm,

    fetchRooms,
    handleRefresh,
    handleViewLayoutOpen,
    handleAddOpen,
    handleEditOpen,
    handleDelete,
    handleRestore,
    handleModalSuccess,

    isSubmitting,
    handleSubmitRoom,

    isManager,
  };
}
