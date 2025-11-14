"use client";

import {
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
  ReactNode,
} from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { BiRefresh } from "react-icons/bi";
import { Badge } from "@/components/ui/badge";

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Table, { Column } from "@/components/Table";

import { fetchNamesFromPaginated, PageResp, HasIdName } from "./helper";

import { Modal } from "@/components/Modal";
import ShowTimeModal from "@/components/ShowtimeModal";
import {
  cinemaService,
  roomService,
  showTimeService,
  type ShowTime,
} from "@/services";

export default function ShowtimesCard({ movieId }: { movieId: string }) {
  const [showtimes, setShowtimes] = useState<ShowTime[]>([]);
  const [loadingShow, setLoadingShow] = useState(false);
  const [filterLang, setFilterLang] = useState<string | undefined>(undefined);

  const [open, setOpen] = useState(false);
  const [editShowtime, setEditShowtme] = useState<ShowTime | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMessage, setDialogMessage] = useState<React.ReactNode>("");
  const [reloadTick, setReloadTick] = useState(0);
  const [onConfirm, setOnConfirm] = useState<() => void>(() => () => {});

  const [page, setPage] = useState(1); // 1-based
  // const [pageSize, setPageSize] = useState(6); // limit
  const pageSize = 6;
  const [totalItems, setTotalItems] = useState(0);

  const cinemaCache = useRef(new Map<string, string>());
  const roomCache = useRef(new Map<string, string>());

  type ShowTimePatch = Partial<
    Pick<ShowTime, "isActive" | "cinemaName" | "roomName">
  >;

  const patchShowtime = useCallback((id: string, patch: ShowTimePatch) => {
    setShowtimes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
    );
  }, []);
  // Nếu có endpoint bulk:
  const getCinemasPage = useCallback(
    async (page: number, limit: number): Promise<PageResp<HasIdName>> => {
      const res = await cinemaService.getAllCinemas({ page, limit });

      const { data, pagination } = res;

      return {
        data: data.map((x) => ({ id: String(x.id), name: x.name })),
        pagination: pagination,
      };
    },
    []
  );

  const getRoomsPage = useCallback(
    async (page: number, limit: number): Promise<PageResp<HasIdName>> => {
      const res = await roomService.getRooms({ page, limit });

      const { data, pagination } = res;

      return {
        data: data.map((x) => ({ id: String(x.id), name: x.name })),
        pagination: pagination,
      };
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingShow(true);

        // GỌI API có page/limit
        const res = await showTimeService.getShowTimes({
          movieId: movieId,
          page,
          limit: pageSize,
        });

        const { data, pagination } = res;

        // Ưu tiên lấy totalItems/total từ backend nếu có
        const limitFromServer = (pagination.pageSize ?? pageSize) || pageSize;
        const totalFromServer = (pagination.totalItems ?? 0) as number;

        // fallback: nếu backend chưa trả total, ước lượng theo độ dài trang hiện tại
        const totalFallback =
          typeof totalFromServer === "number" && totalFromServer > 0
            ? totalFromServer
            : (page - 1) * limitFromServer + data.length;

        if (!cancelled) setTotalItems(totalFallback);

        // === phần enrich tên rạp/phòng (giữ nguyên) ===
        const needCinemaIds = new Set(
          data.filter((s) => s.cinemaId).map((s) => String(s.cinemaId))
        );
        const needRoomIds = new Set(
          data.filter((s) => s.roomId).map((s) => String(s.roomId))
        );

        const [cinemaMapNew, roomMapNew] = await Promise.all([
          fetchNamesFromPaginated(needCinemaIds, getCinemasPage, 200),
          fetchNamesFromPaginated(needRoomIds, getRoomsPage, 200),
        ]);

        cinemaMapNew.forEach((v, k) => cinemaCache.current.set(k, v));
        roomMapNew.forEach((v, k) => roomCache.current.set(k, v));

        const enriched = data.map((s) => ({
          ...s,
          cinemaName: cinemaCache.current.get(String(s.cinemaId)) || "",
          roomName: roomCache.current.get(String(s.roomId)) || "",
        }));

        if (!cancelled) setShowtimes(enriched);
        console.log(enriched);
      } finally {
        if (!cancelled) setLoadingShow(false);
      }
    })();
    return () => {
      cancelled = true;
    };

    // thêm page, pageSize, reloadTick vào deps
  }, [movieId, page, pageSize, getCinemasPage, getRoomsPage, reloadTick]);

  const langOptions = useMemo(() => {
    const set = new Set(
      (showtimes ?? []).map(
        (s) => (s.language && s.language.trim()) || "Unknown"
      )
    );
    const arr = Array.from(set);
    arr.sort((a, b) => {
      if (a === "Unknown") return 1;
      if (b === "Unknown") return -1;
      return a.localeCompare(b, "vi"); // sắp xếp đẹp hơn cho TV
    });
    return arr; // mảng string: ["Tiếng Anh", "Tiếng Việt", "Unknown", ...]
  }, [showtimes]);

  const filteredShowtimes = useMemo(() => {
    if (!filterLang) return showtimes;
    return (showtimes ?? []).filter(
      (s) => ((s.language && s.language.trim()) || "Unknown") === filterLang
    );
  }, [showtimes, filterLang]);

  useEffect(() => {
    setPage(1);
  }, [filterLang, movieId]);

  const handleAddOpen = () => {
    setEditShowtme(null);
    setOpen(true);
  };

  const handleEditOpen = (s: ShowTime) => {
    setEditShowtme(s);
    setOpen(true);
  };

  const openConfirm = (
    title: string,
    message: ReactNode,
    action: () => void
  ) => {
    setDialogTitle(title);
    setDialogMessage(message);
    setOnConfirm(() => action);
    setIsConfirmDialogOpen(true);
  };

  const handleDelete = useCallback(
    (showtime: ShowTime) => {
      openConfirm(
        "Xác nhận xóa",
        <>
          Bạn có chắc chắn muốn xóa suất chiếu này không?
          <br />
          Việc này không thể hoàn tác.
        </>,
        async () => {
          setIsConfirmDialogOpen(false);
          try {
            await showTimeService.deleteShowTime(showtime.id);
            patchShowtime(showtime.id, { isActive: false });
            setReloadTick((x) => x + 1);
            setDialogTitle("Thành công");
            setDialogMessage("Xóa suất chiếu thành công");
            setIsSuccessDialogOpen(true);
          } catch (err) {
            alert("Thao tác thất bại: " + err);
          }
        }
      );
    },
    [patchShowtime]
  );

  const handleRestore = useCallback(
    (showtime: ShowTime) => {
      openConfirm(
        "Xác nhận khôi phục",
        <>Khôi phục suất chiếu này?</>,
        async () => {
          setIsConfirmDialogOpen(false);
          try {
            await showTimeService.restoreShowTime(showtime.id);
            patchShowtime(showtime.id, { isActive: true });
            setReloadTick((x) => x + 1);
            setDialogTitle("Thành công");
            setDialogMessage("Khôi phục suất chiếu thành công");
            setIsSuccessDialogOpen(true);
          } catch (err) {
            alert("Thao tác thất bại: " + err);
          }
        }
      );
    },
    [patchShowtime]
  );

  const columns: Column<ShowTime>[] = useMemo(
    () => [
      { header: "Rạp", key: "cinemaName" },
      { header: "Phòng", key: "roomName" },
      { header: "Ngôn ngữ", key: "language" },
      { header: "Định dạng", key: "format" },
      {
        header: "Bắt đầu",
        key: "startTime",
        render: (v) =>
          v
            ? Intl.DateTimeFormat("vi-VN", {
                timeZone: "UTC",

                hour: "2-digit",
                minute: "2-digit",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              }).format(new Date(v as string))
            : "—",
      },
      {
        header: "Kết thúc",
        key: "endTime",
        render: (v) =>
          v
            ? Intl.DateTimeFormat("vi-VN", {
                timeZone: "UTC",

                hour: "2-digit",
                minute: "2-digit",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              }).format(new Date(v as string))
            : "—",
      },
      {
        header: "Giá (VND)",
        key: "price",
        render: (v) =>
          v == null ? "—" : new Intl.NumberFormat("vi-VN").format(Number(v)),
      },

      {
        header: "Phụ đề",
        key: "subtitle",
        render: (_: unknown, s: ShowTime) => (
          <Badge variant={s.subtitle ? "default" : "secondary"}>
            {s.subtitle ? "Có" : "Không"}
          </Badge>
        ),
      },
      {
        header: "Hành động",
        key: "actions",
        render: (_: unknown, row: ShowTime) => (
          <div className="flex space-x-3">
            {row.isActive ? (
              <>
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
    ],
    [handleDelete, handleRestore]
  );

  return (
    <div>
      <Card className="shadow-sm">
        {/* Header: Title (dòng 1) + Controls row (dòng 2) */}
        <CardHeader className="border-b space-y-3">
          <CardTitle className="text-2xl">Suất chiếu</CardTitle>

          {/* Hàng control nằm dưới title */}
          <div className="w-full flex flex-wrap items-center justify-between gap-2">
            {/* Bên trái: Select lọc ngôn ngữ */}
            <Select
              value={filterLang}
              onValueChange={(v) =>
                setFilterLang(v === "__ALL__" ? undefined : v)
              }
            >
              <SelectTrigger className="h-9 w-[220px]">
                <SelectValue placeholder="Lọc theo ngôn ngữ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">Tất cả ngôn ngữ</SelectItem>
                {langOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Bên phải: Button thêm suất chiếu */}
            <Button size="sm" className="gap-1" onClick={handleAddOpen}>
              <Plus className="h-4 w-4" />
              Thêm suất chiếu
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 overflow-x-auto">
          {loadingShow ? (
            <div className="text-sm text-muted-foreground">
              Đang tải suất chiếu…
            </div>
          ) : (
            <>
              <Table
                columns={columns}
                data={filteredShowtimes}
                getRowKey={(r) => r.id}
              />
              <div className="mt-3 flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || loadingShow}
                >
                  Trước
                </Button>

                {(() => {
                  const totalPages = Math.max(
                    1,
                    Math.ceil(totalItems / pageSize)
                  );
                  return (
                    <span className="text-sm">
                      Trang {page} / {totalPages}
                    </span>
                  );
                })()}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const totalPages = Math.max(
                      1,
                      Math.ceil(totalItems / pageSize)
                    );
                    setPage((p) => Math.min(totalPages, p + 1));
                  }}
                  disabled={
                    loadingShow ||
                    page >= Math.max(1, Math.ceil(totalItems / pageSize))
                  }
                >
                  Sau
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

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

      <ShowTimeModal
        open={open}
        onClose={() => setOpen(false)}
        mode={editShowtime ? "edit" : "create"}
        showtime={editShowtime || undefined}
        movieId={movieId}
        onSuccess={async () => {
          // setOpen(false);
          // setEditShowtme(null);
          setReloadTick((x) => x + 1);
        }}
      />
    </div>
  );
}
