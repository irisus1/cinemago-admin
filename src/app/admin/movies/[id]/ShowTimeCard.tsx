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
import {
  getShowTimesByMovieId,
  deleteShowTime,
  restoreShowTime,
} from "@/services/ShowtimeService";
import { getCinemaById, getAllCinemas } from "@/services/CinemaService";
import { getAllRooms } from "@/services/RoomService";
import { fetchNamesFromPaginated, PageResp, HasIdName } from "./helper";
import Dialog from "@/components/ConfirmDialog";
import SuccessDialog from "@/components/SuccessDialog";
import ShowTimeModal from "@/components/ShowtimeModal";

type ShowTime = {
  id: string;
  cinemaName: string;
  cinemaId: string;
  format: string;
  roomId: string;
  roomName: string;
  startTime: string; // ISO
  endTime?: string; // ISO
  price?: number;
  status?: string;
  subtitle?: boolean;
  // các field ngôn ngữ có thể khác nhau tùy backend:
  language?: string;
  isActive?: boolean;
};

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
      const res = await getAllCinemas({ page, limit });
      const raw = (res.data?.data ?? []) as Array<{
        id: string | number;
        name: string;
      }>;
      return {
        data: raw.map((x) => ({ id: String(x.id), name: x.name })),
        pagination: res.data?.pagination,
      };
    },
    []
  );

  const getRoomsPage = useCallback(
    async (page: number, limit: number): Promise<PageResp<HasIdName>> => {
      const res = await getAllRooms({ page, limit });
      const raw = (res.data?.data ?? []) as Array<{
        id: string | number;
        name: string;
      }>;
      return {
        data: raw.map((x) => ({ id: String(x.id), name: x.name })),
        pagination: res.data?.pagination,
      };
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingShow(true);
        const res = await getShowTimesByMovieId({ movieid: movieId });
        const raw = (res.data?.data || []) as ShowTime[];

        const needCinemaIds = new Set(
          raw
            .filter((s) => !s.cinemaName && s.cinemaId)
            .map((s) => String(s.cinemaId))
        );
        const needRoomIds = new Set(
          raw
            .filter((s) => !s.roomName && s.roomId)
            .map((s) => String(s.roomId))
        );

        const [cinemaMapNew, roomMapNew] = await Promise.all([
          fetchNamesFromPaginated(needCinemaIds, getCinemasPage, 200),
          fetchNamesFromPaginated(needRoomIds, getRoomsPage, 200),
        ]);

        // Cập nhật cache global
        cinemaMapNew.forEach((v, k) => cinemaCache.current.set(k, v));
        roomMapNew.forEach((v, k) => roomCache.current.set(k, v));

        // Join tên vào danh sách
        const enriched = raw.map((s) => ({
          ...s,
          cinemaName:
            s.cinemaName || cinemaCache.current.get(String(s.cinemaId)) || "",
          roomName: s.roomName || roomCache.current.get(String(s.roomId)) || "",
        }));

        if (!cancelled) setShowtimes(enriched);
      } finally {
        if (!cancelled) setLoadingShow(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [movieId, getCinemasPage, getRoomsPage, reloadTick]);

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

  const handleDelete = (showtime: ShowTime) => {
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
          await deleteShowTime(showtime.id);
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
  };

  const handleRestore = (showtime: ShowTime) => {
    openConfirm(
      "Xác nhận khôi phục",
      <>Khôi phục suất chiếu này?</>,
      async () => {
        setIsConfirmDialogOpen(false);
        try {
          await restoreShowTime(showtime.id);
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
  };

  const columns: Column<ShowTime>[] = useMemo(
    () => [
      { header: "Rạp", key: "cinemaName" },
      { header: "Phòng", key: "roomName" },
      { header: "Ngôn ngữ", key: "language" },
      { header: "Định dạng", key: "format" },
      { header: "Phụ đề", key: "format" },
      {
        header: "Bắt đầu",
        key: "startTime",
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
        header: "Kết thúc",
        key: "endTime",
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
    []
  );

  console.log(showtimes);

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
            <Table
              columns={columns}
              data={filteredShowtimes}
              getRowKey={(r) => r.id}
            />
          )}
        </CardContent>
      </Card>
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
      <ShowTimeModal
        open={open}
        onClose={() => setOpen(false)}
        mode={editShowtime ? "edit" : "create"}
        showtime={editShowtime || undefined}
        movieId={movieId}
        onSuccess={async () => {
          setOpen(false);
          setEditShowtme(null);
          // await fetchGenres(); // reload list
        }}
      />
    </div>
  );
}
