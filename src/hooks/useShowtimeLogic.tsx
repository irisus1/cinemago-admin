"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { toast } from "sonner";
import {
  cinemaService,
  roomService,
  showTimeService,
  movieService,
  type ShowTime,
  Movie,
  Cinema,
  ShowTimeQuery,
} from "@/services";
import {
  fetchNamesFromPaginated,
  fetchAllPaginatedCached,
  PageResp,
  HasIdName,
} from "./helper";

import { useAuth } from "@/context/AuthContext";

type MovieOpt = { id: string; title: string };
type CinemaOpt = { id: string; name: string; city?: string };

export function useShowtimeLogic() {
  const { user } = useAuth();
  const isManager = user?.role === "MANAGER";

  const [showtimes, setShowtimes] = useState<ShowTime[]>([]);
  const [loadingShow, setLoadingShow] = useState(false);

  const [movieOptions, setMovieOptions] = useState<MovieOpt[]>([]);
  const [cinemaOptions, setCinemaOptions] = useState<CinemaOpt[]>([]);

  const [movieId, setMovieId] = useState<string>("__ALL__");
  const [cinemaId, setCinemaId] = useState<string>("__ALL__");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "showing" | "ended" | "stopped"
  >("all");
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");

  const [filterLang, setFilterLang] = useState<string | undefined>(undefined);

  const [reloadTick, setReloadTick] = useState(0);

  const [page, setPage] = useState(1);
  const pageSize = 9;
  const [totalItems, setTotalItems] = useState(0);

  const [open, setOpen] = useState(false);
  const [editShowtime, setEditShowtme] = useState<ShowTime | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMessage, setDialogMessage] = useState<ReactNode>("");
  const [onConfirm, setOnConfirm] = useState<() => void>(() => { });

  const cinemaCache = useRef(new Map<string, string>());
  const roomCache = useRef(new Map<string, string>());

  const patchShowtime = useCallback((id: string, patch: Partial<ShowTime>) => {
    setShowtimes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
    );
  }, []);

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

  useEffect(() => {
    (async () => {
      try {
        if (isManager && user?.cinemaId) {
          setCinemaId(user.cinemaId);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setCinemaOptions([{ id: user.cinemaId, name: (user as any).cinemaName || "Rạp hiện tại" }]);
          const movies = await fetchAllPaginatedCached<Movie>("all-movies", (page, limit) =>
            movieService.getAllMovies({ page, limit }).then((res) => ({
              data: res.data ?? [],
              pagination: res.pagination,
            }))
          );
          setMovieOptions(movies.map((m: Movie) => ({
            id: String(m.id),
            title: m.title,
          })));
          return;
        }

        const [movies, cinemas] = await Promise.all([
          fetchAllPaginatedCached<Movie>("all-movies", (page, limit) =>
            movieService.getAllMovies({ page, limit }).then((res) => ({
              data: res.data ?? [],
              pagination: res.pagination,
            }))
          ),
          fetchAllPaginatedCached<Cinema>("all-cinemas", (page, limit) =>
            cinemaService.getAllCinemas({ page, limit }).then((res) => ({
              data: res.data ?? [],
              pagination: res.pagination,
            }))
          ),
        ]);

        const mOpts: MovieOpt[] = movies.map((m: Movie) => ({
          id: String(m.id),
          title: m.title,
        }));
        const cOpts: CinemaOpt[] = cinemas.map((c: Cinema) => ({
          id: String(c.id),
          name: c.name,
          city: c.city,
        }));

        setMovieOptions(mOpts);
        setCinemaOptions(cOpts);
      } catch (err) {
        console.error("Failed to load movie/cinema options", err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isManager, user?.cinemaId]);



  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingShow(true);

        const params: ShowTimeQuery = {
          page,
          limit: pageSize,
        };

        if (movieId && movieId !== "__ALL__") {
          params.movieId = movieId;
        }

        if (cinemaId && cinemaId !== "__ALL__") {
          params.cinemaId = cinemaId;
        }


        if (statusFilter === "stopped") {
          params.isActive = false;
        } else if (statusFilter === "showing") {
          params.isActive = true;

        } else if (statusFilter === "ended") {
          params.isActive = true;
        }

        if (startTime) params.startTime = startTime;
        if (endTime) params.endTime = endTime;

        const res = await showTimeService.getShowTimes(params);

        const data = res.data ?? [];
        const pagination = res.pagination;

        const safeData: ShowTime[] = data ?? [];

        const totalFromServer = (pagination?.totalItems ?? 0) as number;
        const limitFromServer = (pagination?.pageSize ?? pageSize) || pageSize;
        const totalFallback =
          totalFromServer > 0
            ? totalFromServer
            : (page - 1) * limitFromServer + safeData.length;

        if (!cancelled) setTotalItems(totalFallback);

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

        const [cinemaMapNew, roomMapNew] = await Promise.all([
          fetchNamesFromPaginated(needCinemaIds, getCinemasPage),
          fetchNamesFromPaginated(needRoomIds, getRoomsPage),
        ]);

        cinemaMapNew.forEach((v, k) => cinemaCache.current.set(k, v));
        roomMapNew.forEach((v, k) => roomCache.current.set(k, v));

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
  }, [
    movieId,
    cinemaId,
    statusFilter,
    startTime,
    endTime,
    page,
    getCinemasPage,
    getRoomsPage,
    reloadTick,
  ]);

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
    let result = showtimes;

    if (filterLang) {
      result = result.filter(
        (s) => ((s.language && s.language.trim()) || "Unknown") === filterLang
      );
    }

    if (statusFilter === "showing") {
      const now = Date.now();
      result = result.filter((s) => new Date(s.endTime).getTime() > now);
    } else if (statusFilter === "ended") {
      const now = Date.now();
      result = result.filter((s) => new Date(s.endTime).getTime() <= now);
    }

    return result;
  }, [showtimes, filterLang, statusFilter]);

  useEffect(() => {
    setPage(1);
    setPage(1);
  }, [movieId, cinemaId, statusFilter, startTime, endTime, filterLang]);

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
        "Xác nhận lưu trữ",
        <>Bạn có chắc chắn muốn lưu trữ suất chiếu này không?</>,
        async () => {
          setIsConfirmDialogOpen(false);
          try {
            await showTimeService.deleteShowTime(showtime.id);
            patchShowtime(showtime.id, { isActive: false });
            handleRefresh();
            setDialogTitle("Thành công");
            setDialogTitle("Thành công");
            toast.success("Xóa suất chiếu thành công");
          } catch (err) {
            console.log(err);
            setDialogTitle("Thất bại");
            setDialogMessage(
              "Thao tác thất bại: " +
              (err instanceof Error ? err.message : String(err))
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
            setDialogTitle("Thành công");
            toast.success("Khôi phục suất chiếu thành công");
          } catch (err) {
            console.log(err);
            setDialogTitle("Thất bại");
            setDialogMessage(
              "Thao tác thất bại: " +
              (err instanceof Error ? err.message : String(err))
            );
            setIsErrorDialogOpen(true);
          }
        }
      );
    },
    [patchShowtime]
  );

  const clearFilters = () => {
    setMovieId("__ALL__");

    if (isManager && user?.cinemaId) {
      setCinemaId(user.cinemaId);
    } else {
      setCinemaId("__ALL__");
    }
    setStatusFilter("all");
    setStartTime("");
    setEndTime("");
    setFilterLang(undefined);
    setPage(1);
  };

  const canClearFilters = useMemo(() => {
    const isDefaultMovie = movieId === "__ALL__" || !movieId;

    const isDefaultCinema = isManager && user?.cinemaId
      ? cinemaId === user.cinemaId
      : cinemaId === "__ALL__";

    const isDefaultStatus = statusFilter === "all";
    const isDefaultStart = !startTime;
    const isDefaultEnd = !endTime;
    const isDefaultLang = !filterLang;

    return !(
      isDefaultMovie &&
      isDefaultCinema &&
      isDefaultStatus &&
      isDefaultStart &&
      isDefaultEnd &&
      isDefaultLang
    );
  }, [movieId, cinemaId, statusFilter, startTime, endTime, filterLang]);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return {
    showtimes,
    filteredShowtimes,
    loadingShow,

    page,
    setPage,
    pageSize,
    totalItems,
    totalPages,

    movieOptions,
    cinemaOptions,
    movieId,
    setMovieId,
    cinemaId,
    setCinemaId,

    statusFilter,
    setStatusFilter,
    startTime,
    setStartTime,
    endTime,
    setEndTime,
    langOptions,
    filterLang,
    setFilterLang,

    handleRefresh,
    handleAddOpen,
    handleEditOpen,
    handleDelete,
    handleRestore,

    canClearFilters,
    clearFilters,

    open,
    setOpen,
    editShowtime,
    setEditShowtme,
    isConfirmDialogOpen,
    setIsConfirmDialogOpen,
    isErrorDialogOpen,
    setIsErrorDialogOpen,
    dialogTitle,
    dialogMessage,
    onConfirm,

    isManager,
    user,
  };
}
