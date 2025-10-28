// components/RoomCard.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { FiEdit2, FiTrash2, FiEye } from "react-icons/fi";
import { BiRefresh } from "react-icons/bi";
import Table, { Column } from "@/components/Table";
import Dialog from "@/components/ConfirmDialog";
import SuccessDialog from "@/components/SuccessDialog";
import RoomModal from "@/components/RoomModal";
import SeatLayoutBuilder from "./RoomLayout";

// === Services (điều chỉnh theo project của bạn) ===
import {
  getRooms, // ({ cinemaId, page?, limit?, search? })
  deleteRoom,
  restoreRoom,
} from "@/services/RoomService";
import type { Room } from "@/services/RoomService";
import { se } from "date-fns/locale";
import { set } from "date-fns";

// ===== Types =====

type ApiPagination = {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

type ApiResponse<T> = {
  data: T[];
  pagination: ApiPagination;
};

export default function RoomCard({ cinemaId }: { cinemaId: string }) {
  // server data + paging

  const [rooms, setRooms] = useState<Room[]>([]);
  const [pagination, setPagination] = useState<ApiPagination | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const totalPages = pagination?.totalPages ?? 1;

  // filters (client)
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState<"__ALL__" | "active" | "inactive">(
    "__ALL__"
  );

  // ui states
  const [loading, setLoading] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  // modal
  const [open, setOpen] = useState(false);
  const [openLayout, setOpenLayout] = useState(false);
  const [openRoom, setOpenRoom] = useState<Room | null>(null);
  const [editRoom, setEditRoom] = useState<Room | null>(null);

  // dialogs
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMessage, setDialogMessage] = useState<React.ReactNode>("");
  const [onConfirm, setOnConfirm] = useState<() => void>(() => () => {});

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search]);
  // ===== fetch =====
  const fetchRooms = async (toPage = page) => {
    setLoading(true);
    try {
      const res = await getRooms({
        cinemaId,
        page: toPage,
        limit,
        search: search.trim() || undefined,
      });
      const payload = res.data as ApiResponse<Room>;
      console.log("payload: ", payload);

      setRooms(payload?.data ?? []);
      setPagination(payload?.pagination ?? null);
      if (
        payload?.pagination?.currentPage &&
        payload.pagination.currentPage !== page
      ) {
        setPage(payload.pagination.currentPage);
      }
    } catch (e) {
      console.error("Error fetching rooms:", e);
      setRooms([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cinemaId, page, limit, reloadTick, search]);

  // filter client theo trạng thái
  const displayRows = useMemo(() => {
    const list =
      status === "__ALL__"
        ? rooms
        : rooms.filter((r) => (status === "active" ? r.isActive : !r.isActive));
    return list;
  }, [rooms, status]);

  // ===== handlers =====

  const handleViewLayoutOpen = (r: Room) => {
    setOpenRoom(r);
    setOpenLayout(true);
  };

  const handleAddOpen = () => {
    setEditRoom(null);
    setOpen(true);
  };

  const handleEditOpen = (r: Room) => {
    setEditRoom(r);
    setOpen(true);
  };
  const handleRefresh = () => setReloadTick((x) => x + 1);

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
      "Xác nhận xóa",
      <>
        Bạn có chắc chắn muốn xóa (ẩn) phòng <b>{room.name}</b> không?
        <br />
        Việc này không thể hoàn tác.
      </>,
      async () => {
        setIsConfirmDialogOpen(false);
        try {
          await deleteRoom(room.id);
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
          await restoreRoom(room.id);
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

  const clearFilters = () => {
    setSearch("");
    setStatus("__ALL__");
    setPage(1);
  };

  // ===== columns =====
  const columns: Column<Room>[] = [
    { header: "Tên phòng", key: "name" },
    {
      header: "Tổng ghế",
      key: "totalSeats",
      render: (v) => (v == null ? "—" : Number(v as number).toString()),
    },
    {
      header: "Ngày tạo",
      key: "createdAt",
      render: (v) =>
        v
          ? Intl.DateTimeFormat("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            }).format(new Date(v as string))
          : "—",
    },
    {
      header: "Trạng thái",
      key: "isActive",
      render: (_: unknown, r: Room) => (
        <Badge variant={r.isActive ? "default" : "secondary"}>
          {r.isActive ? "Đang hoạt động" : "Đã ẩn"}
        </Badge>
      ),
    },
    {
      header: "Hành động",
      key: "actions",
      render: (_: unknown, row: Room) => (
        <div className="flex space-x-3">
          {row.isActive ? (
            <>
              <button
                className="text-green-600 hover:text-green-800"
                onClick={() => handleViewLayoutOpen(row)}
                title="Xem layout phòng"
              >
                <FiEye className="w-4 h-4" />
              </button>
              <button
                className="text-blue-600 hover:text-blue-800"
                onClick={() => handleEditOpen(row)}
                title="Chỉnh sửa"
              >
                <FiEdit2 className="w-4 h-4" />
              </button>
              <button
                className="text-red-600 hover:text-red-800"
                onClick={() => handleDelete(row)}
                title="Xóa"
              >
                <FiTrash2 className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              className="text-green-600 hover:text-green-800"
              onClick={() => handleRestore(row)}
              title="Khôi phục"
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
      <Card className="shadow-sm">
        <CardHeader className="border-b space-y-3">
          <CardTitle className="text-2xl">Phòng chiếu</CardTitle>

          {/* Controls */}
          <div className="w-full flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Tìm theo tên phòng…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="h-9 w-[240px] px-3 py-1 rounded-md border"
              />

              <Select
                value={status}
                onValueChange={(v: "__ALL__" | "active" | "inactive") => {
                  setStatus(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-[180px]">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__ALL__">Tất cả</SelectItem>
                  <SelectItem value="active">Đang hoạt động</SelectItem>
                  <SelectItem value="inactive">Đã ẩn</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="ml-1"
              >
                Xóa lọc
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchRooms()}
                disabled={loading}
                className="gap-1"
                title="Làm mới"
              >
                <BiRefresh
                  className={`h-4 w-4 ${
                    loading ? "animate-spin" : "transition-transform"
                  }`}
                />
                Làm mới
              </Button>

              <Button size="sm" className="gap-1" onClick={handleAddOpen}>
                <Plus className="h-4 w-4" />
                Thêm phòng
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 overflow-x-auto">
          {loading ? (
            <div className="text-sm text-muted-foreground">Đang tải phòng…</div>
          ) : (
            <Table<Room>
              columns={columns}
              data={displayRows}
              getRowKey={(r) => r.id}
            />
          )}
        </CardContent>

        {/* Pagination (server-side) */}
        {pagination && (
          <div className="flex items-center justify-between px-6 py-4 bg-gray-50">
            <button
              onClick={() =>
                pagination.hasPrevPage && setPage((p) => Math.max(1, p - 1))
              }
              disabled={!pagination.hasPrevPage || loading}
              className="px-4 py-2 text-sm text-gray-600 bg-white rounded-lg shadow-sm disabled:opacity-50"
            >
              Trước
            </button>
            <span className="text-sm text-gray-600">
              Trang {pagination.currentPage} / {pagination.totalPages}
            </span>
            <button
              onClick={() => pagination.hasNextPage && setPage((p) => p + 1)}
              disabled={!pagination.hasNextPage || loading}
              className="px-4 py-2 text-sm text-gray-600 bg-white rounded-lg shadow-sm disabled:opacity-50"
            >
              Tiếp
            </button>
          </div>
        )}
      </Card>

      <div className="mt-6">
        <SeatLayoutBuilder
          open={openLayout}
          onClose={() => setOpenLayout(false)}
          room={openRoom ?? undefined}
          seatLayout={openRoom?.seatLayout}
          notify={(msg) => toast.error(msg)}
          onChange={async (seatLayout) => {
            console.log("seatLayout to save:", seatLayout);
            handleRefresh();
            setOpenLayout(false);
            // ví dụ gọi API cập nhật
            // await api.put(`/rooms/${openRoom.id}`, { seatLayout });
          }}
        />
      </div>

      {/* Dialogs */}
      <Dialog
        isOpen={isConfirmDialogOpen}
        onClose={() => setIsConfirmDialogOpen(false)}
        onConfirm={onConfirm}
        title={dialogTitle}
        message={dialogMessage}
      />
      <SuccessDialog
        isOpen={isSuccessDialogOpen}
        onClose={() => setIsSuccessDialogOpen(false)}
        title={dialogTitle}
        message={dialogMessage}
      />

      {/* Modal Thêm/Sửa phòng */}
      <RoomModal
        open={open}
        onClose={() => setOpen(false)}
        mode={editRoom ? "edit" : "create"}
        room={editRoom ?? undefined}
        cinemaId={cinemaId}
        onSuccess={() => {
          setOpen(false);
          setEditRoom(null);
          setReloadTick((x) => x + 1); // reload lại list
        }}
      />
      {/* <RoomModal
        open={open}
        onClose={() => setOpen(false)}
        mode={editRoom ? "edit" : "create"}
        room={editRoom ?? undefined}
        cinemaId={cinemaId}
        onSuccess={() => {
          setOpen(false);
          setEditRoom(null);
          setReloadTick((x) => x + 1); // reload lại list
        }}
      /> */}
    </div>
  );
}
