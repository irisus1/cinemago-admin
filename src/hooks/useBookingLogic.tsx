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

  const [userMap, setUserMap] = useState<UserMap>({});
  const [showTimeMap, setShowTimeMap] = useState<ShowTimeMap>({});
  const [movieMap, setMovieMap] = useState<MovieMap>({});
  const [roomMap, setRoomMap] = useState<RoomMap>({});
  const [cinemaMap, setCinemaMap] = useState<CinemaMap>({});

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

  //filter
  const [showtimeFilter, setShowtimeFilter] = useState<"__ALL__" | string>(
    "__ALL__"
  );
  const [typeFilter, setTypeFilter] = useState<
    "__ALL__" | "online" | "offline"
  >("__ALL__");

  const canClearFilters =
    showtimeFilter !== "__ALL__" || typeFilter !== "__ALL__";

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);

      const res = await bookingService.getAllBookings({
        page,
        limit,
        showtimeId: showtimeFilter === "__ALL__" ? undefined : showtimeFilter,
        type: typeFilter === "__ALL__" ? undefined : typeFilter,
      });

      const bookingList = res.data;

      setBookings(bookingList);
      setTotalPages(res.pagination.totalPages);
      setTotalItems(res.pagination.totalItems);

      // ==== Caching users & showtimes ====
      const allUserIdsInPage = Array.from(
        new Set(
          bookingList.map((b) => b.userId).filter((id): id is string => !!id)
        )
      );
      const missingUserIds = allUserIdsInPage.filter(
        (id) => !cache.current.users[id]
      );

      const allShowTimeIdsInPage = Array.from(
        new Set(bookingList.map((b) => b.showtimeId))
      );
      const missingShowTimeIds = allShowTimeIdsInPage.filter(
        (id) => !cache.current.showTimes[id]
      );

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

      newUsers.forEach((u) => {
        if (u) cache.current.users[u.id] = u;
      });
      newShowTimes.forEach((st) => {
        if (st) cache.current.showTimes[st.id] = st;
      });

      const relatedShowTimes = allShowTimeIdsInPage
        .map((id) => cache.current.showTimes[id])
        .filter(Boolean) as ShowTime[];

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
  }, [page, limit, showtimeFilter, typeFilter]);

  useEffect(() => {
    setPage(1);
  }, [showtimeFilter, typeFilter]);

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

  const clearFilters = () => {
    setShowtimeFilter("__ALL__");
    setTypeFilter("__ALL__");
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

    // filters
    showtimeFilter,
    setShowtimeFilter,
    typeFilter,
    setTypeFilter,
    clearFilters,
    canClearFilters,

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
