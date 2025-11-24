"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import {
  cinemaService,
  roomService,
  showTimeService,
  type ShowTime,
} from "@/services";
// Giả sử file helper nằm cùng cấp hoặc ở thư mục utils, bạn hãy điều chỉnh import này
import { fetchNamesFromPaginated, PageResp, HasIdName } from "./helper";
import { log } from "console";

export function useShowtimeLogic(movieId: string) {
  // --- State ---
  const [showtimes, setShowtimes] = useState<ShowTime[]>([]);
  const [loadingShow, setLoadingShow] = useState(false);
  const [filterLang, setFilterLang] = useState<string | undefined>(undefined);
  const [reloadTick, setReloadTick] = useState(0);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 6;
  const [totalItems, setTotalItems] = useState(0);

  // Modals & Dialogs
  const [open, setOpen] = useState(false);
  const [editShowtime, setEditShowtme] = useState<ShowTime | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMessage, setDialogMessage] = useState<ReactNode>("");
  const [onConfirm, setOnConfirm] = useState<() => void>(() => () => {});

  // Cache tên rạp/phòng để không phải fetch lại nhiều lần
  const cinemaCache = useRef(new Map<string, string>());
  const roomCache = useRef(new Map<string, string>());

  // --- Helpers ---

  const patchShowtime = useCallback((id: string, patch: Partial<ShowTime>) => {
    setShowtimes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
    );
  }, []);

  // Hàm fetch danh sách rạp cho helper (để mapping ID -> Name)
  const getCinemasPage = useCallback(
    async (p: number, limit: number): Promise<PageResp<HasIdName>> => {
      const res = await cinemaService.getAllCinemas({ page: p, limit });
      return {
        data: (res.data ?? []).map((x) => ({ id: String(x.id), name: x.name })),
        pagination: res.pagination,
      };
    },
    []
  );

  // Hàm fetch danh sách phòng cho helper
  const getRoomsPage = useCallback(
    async (p: number, limit: number): Promise<PageResp<HasIdName>> => {
      const res = await roomService.getRooms({ page: p, limit });
      return {
        data: (res.data ?? []).map((x) => ({ id: String(x.id), name: x.name })),
        pagination: res.pagination,
      };
    },
    []
  );

  // --- Main Data Fetching ---
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingShow(true);

        // 1. Gọi API lấy suất chiếu
        const res = await showTimeService.getShowTimes({
          movieId: movieId,
          page,
          limit: pageSize,
        });

        console.log(res.data);

        const { data, pagination } = res;
        const safeData = data ?? [];

        // 2. Tính toán Total Items
        const totalFromServer = (pagination?.totalItems ?? 0) as number;
        const limitFromServer = (pagination?.pageSize ?? pageSize) || pageSize;
        const totalFallback =
          totalFromServer > 0
            ? totalFromServer
            : (page - 1) * limitFromServer + safeData.length;

        if (!cancelled) setTotalItems(totalFallback);

        // 3. Enrich Data (Lấy tên Rạp & Phòng từ ID)
        // Tìm những ID chưa có trong cache
        const needCinemaIds = new Set<string>();
        const needRoomIds = new Set<string>();

        safeData.forEach((s) => {
          if (s.cinemaId && !cinemaCache.current.has(String(s.cinemaId))) {
            needCinemaIds.add(String(s.cinemaId));
          }
          if (s.roomId && !roomCache.current.has(String(s.roomId))) {
            needRoomIds.add(String(s.roomId));
          }
        });

        // Fetch tên bổ sung (nếu cần)
        const [cinemaMapNew, roomMapNew] = await Promise.all([
          fetchNamesFromPaginated(needCinemaIds, getCinemasPage, 200),
          fetchNamesFromPaginated(needRoomIds, getRoomsPage, 200),
        ]);

        // Cập nhật cache
        cinemaMapNew.forEach((v, k) => cinemaCache.current.set(k, v));
        roomMapNew.forEach((v, k) => roomCache.current.set(k, v));

        // Gán tên vào data
        const enriched = safeData.map((s) => ({
          ...s,
          cinemaName: cinemaCache.current.get(String(s.cinemaId)) || "Unknown",
          roomName: roomCache.current.get(String(s.roomId)) || "Unknown",
        }));

        if (!cancelled) setShowtimes(enriched);
      } catch (e) {
        console.error("Failed to load showtimes", e);
      } finally {
        if (!cancelled) setLoadingShow(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [movieId, page, pageSize, getCinemasPage, getRoomsPage, reloadTick]);

  // --- Filtering Logic ---
  const langOptions = useMemo(() => {
    const set = new Set(
      showtimes.map((s) => (s.language && s.language.trim()) || "Unknown")
    );
    const arr = Array.from(set);
    arr.sort((a, b) => {
      if (a === "Unknown") return 1;
      if (b === "Unknown") return -1;
      return a.localeCompare(b, "vi");
    });
    return arr;
  }, [showtimes]);

  const filteredShowtimes = useMemo(() => {
    if (!filterLang) return showtimes;
    return showtimes.filter(
      (s) => ((s.language && s.language.trim()) || "Unknown") === filterLang
    );
  }, [showtimes, filterLang]);

  // Reset page khi filter đổi
  useEffect(() => {
    setPage(1);
  }, [filterLang, movieId]);

  // --- Handlers ---
  const handleRefresh = () => setReloadTick((x) => x + 1);

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
            handleRefresh();
            setDialogTitle("Thành công");
            setDialogMessage("Xóa suất chiếu thành công");
            setIsSuccessDialogOpen(true);
          } catch (err) {
            console.log(err);
            setDialogTitle("Thất bại");
            setDialogMessage(
              "Thao tác thất bại: " + (err instanceof Error ? err.message : err)
            );
            setIsErrorDialogOpen(true);
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
            handleRefresh();
            setDialogTitle("Thành công");
            setDialogMessage("Khôi phục suất chiếu thành công");
            setIsSuccessDialogOpen(true);
          } catch (err) {
            console.log(err);
            setDialogTitle("Thất bại");
            setDialogMessage(
              "Thao tác thất bại: " + (err instanceof Error ? err.message : err)
            );
            setIsErrorDialogOpen(true);
          }
        }
      );
    },
    [patchShowtime]
  );

  return {
    // Data
    showtimes,
    filteredShowtimes,
    loadingShow,
    langOptions,
    filterLang,
    setFilterLang,

    // Pagination
    page,
    setPage,
    pageSize,
    totalItems,

    // Actions
    handleRefresh,
    handleAddOpen,
    handleEditOpen,
    handleDelete,
    handleRestore,

    // Modal States
    open,
    setOpen,
    editShowtime,
    setEditShowtme,
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
