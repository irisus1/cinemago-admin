"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  bookingService,
  userService,
  showTimeService,
  movieService,
  roomService,
  cinemaService,
  type User,
  ShowTime,
  Booking,
  Movie,
  Room,
  Cinema,
} from "@/services";

// Định nghĩa các Map
type UserMap = Record<string, User>;
type ShowTimeMap = Record<string, ShowTime>;
type MovieMap = Record<string, Movie>;
type RoomMap = Record<string, Room>;
type CinemaMap = Record<string, Cinema>;

export function useBookingLogic() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);

  // --- STATE HIỂN THỊ (Lấy từ Cache ra để render) ---
  const [userMap, setUserMap] = useState<UserMap>({});
  const [showTimeMap, setShowTimeMap] = useState<ShowTimeMap>({});
  const [movieMap, setMovieMap] = useState<MovieMap>({});
  const [roomMap, setRoomMap] = useState<RoomMap>({});
  const [cinemaMap, setCinemaMap] = useState<CinemaMap>({});

  // --- CACHE (Lưu trữ dữ liệu vĩnh viễn trong vòng đời component) ---
  // Dùng useRef để thay đổi không gây re-render, chỉ update khi cần thiết
  const cache = useRef({
    users: {} as UserMap,
    showTimes: {} as ShowTimeMap,
    movies: {} as MovieMap,
    rooms: {} as RoomMap,
    cinemas: {} as CinemaMap,
  });

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit] = useState(3);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modal states
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Lấy danh sách Booking (Luôn luôn lấy mới)
      // Dùng getAllBookings cho trang Admin
      const res = await bookingService.getMyBookings({ page, limit });
      const bookingList = res.data;

      setBookings(bookingList);
      setTotalPages(res.pagination.totalPages);
      setTotalItems(res.pagination.totalItems);

      // ============================================================
      // LOGIC CACHING: CHỈ GỌI API CHO NHỮNG GÌ CHƯA CÓ TRONG CACHE
      // ============================================================

      // --- BƯỚC 1: XỬ LÝ USER ---
      // Lọc ra list User ID có trong trang này
      const allUserIdsInPage = Array.from(
        new Set(
          bookingList.map((b) => b.userId).filter((id): id is string => !!id)
        )
      );

      // Chỉ lấy những ID chưa có trong cache
      const missingUserIds = allUserIdsInPage.filter(
        (id) => !cache.current.users[id]
      );

      // --- BƯỚC 2: XỬ LÝ SHOWTIME ---
      const allShowTimeIdsInPage = Array.from(
        new Set(bookingList.map((b) => b.showtimeId))
      );
      const missingShowTimeIds = allShowTimeIdsInPage.filter(
        (id) => !cache.current.showTimes[id]
      );

      // --- GỌI API (Chỉ gọi cái thiếu) ---
      const [newUsers, newShowTimes] = await Promise.all([
        Promise.all(
          missingUserIds.map((id) =>
            userService.getUserById(id).catch(() => null)
          )
        ),
        Promise.all(
          missingShowTimeIds.map((id) =>
            showTimeService.getShowTimeById(id).catch(() => null)
          )
        ),
      ]);

      // --- CẬP NHẬT CACHE (USER & SHOWTIME) ---
      newUsers.forEach((u) => {
        if (u) cache.current.users[u.id] = u;
      });
      newShowTimes.forEach((st) => {
        if (st) cache.current.showTimes[st.id] = st;
      });

      // ------------------------------------------------------------
      // SAU KHI CÓ SHOWTIME MỚI -> KIỂM TRA MOVIE, ROOM, CINEMA
      // ------------------------------------------------------------

      // Gom tất cả ID cần thiết từ ShowTime (cả cũ trong cache và mới vừa lấy)
      // Lý do: ShowTime cũ có thể tham chiếu đến Movie mà ta chưa từng lấy (nếu logic trước đó bị sót)
      // Nhưng để tối ưu, ta chỉ quét các showTime liên quan đến booking hiện tại

      const relatedShowTimes = allShowTimeIdsInPage
        .map((id) => cache.current.showTimes[id])
        .filter(Boolean);

      const neededMovieIds = new Set<string>();
      const neededRoomIds = new Set<string>();
      const neededCinemaIds = new Set<string>();

      relatedShowTimes.forEach((st) => {
        if (st.movieId && !cache.current.movies[st.movieId])
          neededMovieIds.add(st.movieId);
        if (st.roomId && !cache.current.rooms[st.roomId])
          neededRoomIds.add(st.roomId);
        if (st.cinemaId && !cache.current.cinemas[st.cinemaId])
          neededCinemaIds.add(st.cinemaId);
      });

      // Gọi API lấy thông tin Movie/Room/Cinema còn thiếu
      const [newMovies, newRooms, newCinemas] = await Promise.all([
        Promise.all(
          Array.from(neededMovieIds).map((id) =>
            movieService.getMovieById(id).catch(() => null)
          )
        ),
        Promise.all(
          Array.from(neededRoomIds).map((id) =>
            roomService.getRoomById(id).catch(() => null)
          )
        ),
        Promise.all(
          Array.from(neededCinemaIds).map((id) =>
            cinemaService.getCinemaById(id).catch(() => null)
          )
        ),
      ]);

      // --- CẬP NHẬT CACHE (MOVIE, ROOM, CINEMA) ---
      newMovies.forEach((m) => {
        if (m) cache.current.movies[m.id] = m;
      });
      newRooms.forEach((r) => {
        const room = (r as Room) || r;
        if (room?.id) cache.current.rooms[room.id] = room;
      });
      newCinemas.forEach((c) => {
        const cinema = (c as Cinema) || c;
        if (cinema?.id) cache.current.cinemas[cinema.id] = cinema;
      });

      // ============================================================
      // CẬP NHẬT STATE ĐỂ RENDER UI
      // ============================================================
      // Lưu ý: Phải set state bằng object mới (shallow copy) thì React mới re-render
      setUserMap({ ...cache.current.users });
      setShowTimeMap({ ...cache.current.showTimes });
      setMovieMap({ ...cache.current.movies });
      setRoomMap({ ...cache.current.rooms });
      setCinemaMap({ ...cache.current.cinemas });
    } catch (error) {
      console.error("Error fetching bookings data", error);
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Pagination Object
  const pagination = {
    currentPage: page,
    totalPages: totalPages,
    totalItems: totalItems,
    pageSize: limit,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };

  return {
    bookings,
    userMap,
    showTimeMap,
    movieMap,
    roomMap,
    cinemaMap,
    loading,
    pagination,
    page,
    setPage,
    totalPages,
    totalItems,
    detailOpen,
    setDetailOpen,
    selectedBooking,

    handleViewDetail: (b: Booking) => {
      setSelectedBooking(b);
      setDetailOpen(true);
    },
    refresh: fetchBookings,
  };
}
