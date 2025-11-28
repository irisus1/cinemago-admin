"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  roomService,
  type Room,
  PaginationMeta,
  RoomUpdate,
  RoomCreate,
} from "@/services";

const makeBaseLayout5x5 = () => {
  const rows = ["A", "B", "C", "D", "E"];
  const cols = 5;
  const out = [];
  for (const r of rows) {
    for (let c = 1; c <= cols; c++)
      out.push({ row: r, col: c, type: "NORMAL" as const });
  }
  return out;
};

export type RoomFormData = {
  name: string;
  vipPrice: number;
  couplePrice: number;
};

export function useRoomLogic(cinemaId: string) {
  // --- STATE ---

  // Server data + paging
  const [rooms, setRooms] = useState<Room[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Filters (client)
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState<"__ALL__" | "active" | "inactive">(
    "__ALL__"
  );

  // UI states
  const [loading, setLoading] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  // Modals
  const [open, setOpen] = useState(false); // Modal Create/Edit Room
  const [openLayout, setOpenLayout] = useState(false); // Modal Layout
  const [openRoom, setOpenRoom] = useState<Room | null>(null); // Room đang xem layout
  const [editRoom, setEditRoom] = useState<Room | null>(null); // Room đang edit

  // Dialogs
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMessage, setDialogMessage] = useState<React.ReactNode>("");
  const [onConfirm, setOnConfirm] = useState<() => void>(() => () => {});

  const [isSubmitting, setIsSubmitting] = useState(false);
  // --- EFFECTS ---

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Reset page khi search đổi
  useEffect(() => {
    setPage(1);
  }, [search]);

  // Fetch API
  const fetchRooms = useCallback(
    async (toPage = page) => {
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

  // Filter client-side (status)
  const displayRows = useMemo(() => {
    if (status === "__ALL__") return rooms;
    return rooms.filter((r) =>
      status === "active" ? r.isActive : !r.isActive
    );
  }, [rooms, status]);

  // --- HANDLERS ---

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
      // Có thể set loading riêng nếu muốn
      const fullRoom = await roomService.getRoomById(r.id);

      console.log("full room from API: ", fullRoom);

      setEditRoom(fullRoom); //  giờ room đã có VIP, COUPLE, seatLayout...
      setOpen(true);
    } catch (e) {
      console.error(e);
      setDialogTitle("Lỗi");
      setDialogMessage("Không tải được thông tin phòng");
      setIsErrorDialogOpen(true);
    }
  };

  // Dialog Helper
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

  // Actions
  const handleDelete = (room: Room) => {
    openConfirm(
      "Xác nhận xóa",
      <>
        Bạn có chắc chắn muốn xóa (ẩn) phòng <b>{room.name}</b> không?
        <br />
        Việc này không thể hoàn tác.
      </>,
      async () => {
        setIsConfirmDialogOpen(false);
        try {
          await roomService.deleteRoom(room.id);
          setDialogTitle("Thành công");
          setDialogMessage("Đã ẩn (soft-delete) phòng.");
          setIsSuccessDialogOpen(true);
          handleRefresh();
        } catch (err) {
          alert("Thao tác thất bại: " + err);
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
          setDialogMessage("Khôi phục phòng thành công");
          setIsSuccessDialogOpen(true);
          handleRefresh();
        } catch (err) {
          alert("Thao tác thất bại: " + err);
        }
      }
    );
  };

  // Submit form Room
  const handleSubmitRoom = (formData: RoomFormData) => {
    const isCreate = !editRoom;
    setOpen(false);
    openConfirm(
      isCreate ? "Xác nhận tạo phòng" : "Xác nhận cập nhật phòng",
      <>
        {isCreate ? (
          <>
            Bạn có chắc muốn tạo phòng mới <b>{formData.name}</b> không?
          </>
        ) : (
          <>
            Bạn có chắc muốn cập nhật phòng <b>{editRoom?.name}</b> không?
          </>
        )}
      </>,
      async () => {
        // User đã bấm "Đồng ý" trong confirm
        setIsConfirmDialogOpen(false);
        setIsSubmitting(true);

        try {
          const payloadBase = {
            cinemaId,
            name: formData.name,
            vipPrice: formData.vipPrice,
            couplePrice: formData.couplePrice,
          };

          if (isCreate) {
            const payloadCreate: RoomCreate = {
              ...payloadBase,
              seatLayout: makeBaseLayout5x5(), // logic tạo layout
            };
            await roomService.createRoom(payloadCreate);

            setDialogTitle("Thành công");
            setDialogMessage("Tạo phòng thành công");
          } else {
            const payloadUpdate: RoomUpdate = {
              ...payloadBase,
              seatLayout: editRoom.seatLayout, // giữ layout cũ
            };
            await roomService.updateRoom(editRoom.id, payloadUpdate);

            setDialogTitle("Thành công");
            setDialogMessage("Cập nhật phòng thành công");
          }

          setIsSuccessDialogOpen(true); // Mở dialog thông báo thành công
          setOpen(false); // đóng modal form
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
    // Data
    rooms,
    displayRows,
    pagination,
    loading,
    page,
    setPage,

    // Filters
    searchInput,
    setSearchInput,
    status,
    setStatus,
    clearFilters,

    // Modals state
    open,
    setOpen,
    openLayout,
    setOpenLayout,
    openRoom,
    editRoom,

    // Dialogs state
    isConfirmDialogOpen,
    setIsConfirmDialogOpen,
    isSuccessDialogOpen,
    setIsSuccessDialogOpen,
    isErrorDialogOpen,
    setIsErrorDialogOpen,
    dialogTitle,
    dialogMessage,
    onConfirm,

    // Handlers
    fetchRooms,
    handleRefresh,
    handleViewLayoutOpen,
    handleAddOpen,
    handleEditOpen,
    handleDelete,
    handleRestore,
    handleModalSuccess,

    // New Logic Actions
    isSubmitting,
    handleSubmitRoom,
  };
}
