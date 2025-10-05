// app/(admin)/admin/movies/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Table from "@/components/Table";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { BiRefresh } from "react-icons/bi";
import Dialog from "@/components/ConfirmDialog";
import SuccessDialog from "@/components/SuccessDialog";
import RefreshLoader from "@/components/Loading";
import { getAllMovies, deleteMovie } from "@/services/MovieService";
import { log } from "console";

// ===== Types =====
type Film = {
  id: number | string;
  title: string;
  description: string;
  duration: number;
  rating: number;
  trailerUrl: string;
  imageUrl: string;
  releaseDate: string; // ISO date string
  originatedCountry: string;
  ageRestriction: string;
  deleted?: boolean;
};

type AgeTag = {
  id: number;
  symbol: string;
  description: string;
};

type Column<T> = {
  header: string;
  key: keyof T | "actions";
  render?: (value: T[keyof T], row: T) => React.ReactNode;
};

const FilmsListPage: React.FC = () => {
  const router = useRouter();

  const [films, setFilms] = useState<Film[]>([]);
  const [queryName, setQueryName] = useState("");
  const [queryCountry, setQueryCountry] = useState("");
  const [queryAge, setQueryAge] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedFilm, setSelectedFilm] = useState<Film | null>(null); // (giữ cho đồng bộ, không dùng modal)
  const [ageTags, setAgeTags] = useState<AgeTag[]>([]);

  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMessage, setDialogMessage] = useState<React.ReactNode>("");

  const [loading, setLoading] = useState(false);
  const [onConfirm, setOnConfirm] = useState<() => void>(() => () => {});

  const itemsPerPage = 7;

  // ===== Data fetching =====
  const fetchFilms = async () => {
    try {
      setLoading(true);

      //   const [activeRes, deletedRes] = await Promise.all([
      //     getAllMovies(),
      //     getAllFilmsDeleted(),
      //   ]);

      //   const activeFilms: Film[] =
      //     activeRes?.data?._embedded?.filmResponseDtoList?.map((f: Film) => ({
      //       ...f,
      //       deleted: false,
      //     })) ?? [];

      //   const deletedFilms: Film[] =
      //     deletedRes?.data?._embedded?.filmResponseDtoList?.map((f: Film) => ({
      //       ...f,
      //       deleted: true,
      //     })) ?? [];

      //   setFilms([...activeFilms, ...deletedFilms]);
      const res = await getAllMovies();
      const { data: films, pagination } = res.data;

      console.log(films); // <-- lúc này mới là Array<Film>
      console.log(pagination);

      setFilms(films ?? []);
    } catch (err) {
      console.error("Error fetching films:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilms();
    setAgeTags([
      { id: 1, symbol: "P", description: "Phổ biến cho mọi lứa tuổi" },
      { id: 2, symbol: "K", description: "Dành cho trẻ em" },
      { id: 3, symbol: "C", description: "Cấm trẻ em dưới 13 tuổi" },
      { id: 4, symbol: "T13", description: "Trên 13 tuổi" },
      { id: 5, symbol: "T16", description: "Trên 16 tuổi" },
      { id: 6, symbol: "T18", description: "Trên 18 tuổi" },
    ]);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [queryName, queryCountry, queryAge]);

  // ===== Handlers =====
  const handleAddNavigate = () => {
    router.push("/admin/movies/new");
  };

  const handleEditNavigate = (film: Film) => {
    setSelectedFilm(film);
    router.push(`/admin/movies/${film.id}/edit`);
  };

  const handleRefresh = async () => {
    setLoading(true);
    await fetchFilms();
    setLoading(false);
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

  const handleDelete = (film: Film) => {
    openConfirm(
      "Xác nhận xóa",
      <>
        Bạn có chắc chắn muốn xóa phim này không?
        <br />
        Việc này không thể trở lại.
      </>,
      async () => {
        setIsConfirmDialogOpen(false);
        try {
          //await deleteFilm(film.id);
          await fetchFilms();
          setDialogTitle("Thành công");
          setDialogMessage("Xóa phim thành công");
          setIsSuccessDialogOpen(true);
        } catch (err) {
          alert("Thao tác thất bại: " + err);
        }
      }
    );
  };

  const handleRestore = (film: Film) => {
    openConfirm(
      "Xác nhận khôi phục",
      <>Bạn có chắc chắn muốn khôi phục phim này không?</>,
      async () => {
        setIsConfirmDialogOpen(false);
        try {
          // await undeleteFilm(film.id);
          await fetchFilms();
          setDialogTitle("Thành công");
          setDialogMessage("Khôi phục phim thành công");
          setIsSuccessDialogOpen(true);
        } catch (err) {
          alert("Thao tác thất bại: " + err);
        }
      }
    );
  };

  const clearFilters = () => {
    setQueryName("");
    setQueryCountry("");
    setQueryAge("");
  };

  // ===== Filtering & pagination =====
  const filteredFilms = useMemo(() => {
    return films.filter((f) => {
      const matchName = queryName
        ? f.title.toLowerCase().includes(queryName.toLowerCase())
        : true;

      const matchCountry = queryCountry
        ? f.originatedCountry.toLowerCase().includes(queryCountry.toLowerCase())
        : true;

      const matchAge =
        queryAge === "" || queryAge === "all"
          ? true
          : f.ageRestriction === queryAge;

      return matchName && matchCountry && matchAge;
    });
  }, [films, queryName, queryCountry, queryAge]);

  const totalPages = Math.ceil(filteredFilms.length / itemsPerPage) || 1;
  const paginatedFilms = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredFilms.slice(start, start + itemsPerPage);
  }, [filteredFilms, currentPage]);

  // ===== Table columns =====
  const columns: Column<Film>[] = [
    { header: "Tên phim", key: "title" },
    { header: "Thời lượng", key: "duration" },
    { header: "Quốc gia", key: "originatedCountry" },
    { header: "Độ tuổi", key: "ageRestriction" },
    {
      header: "Hành động",
      key: "actions",
      render: (_, row) => (
        <div className="flex space-x-3">
          {row.deleted ? (
            <button
              className="text-green-600 hover:text-green-800"
              onClick={() => handleRestore(row)}
              title="Khôi phục"
            >
              <BiRefresh className="w-4 h-4" />
            </button>
          ) : (
            <>
              <button
                className="text-blue-600 hover:text-blue-800"
                onClick={() => handleEditNavigate(row)}
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
          )}
        </div>
      ),
    },
  ];

  // ===== Render =====
  return (
    <div>
      <div className="mb-6 flex justify-between items-center pr-10">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Danh sách phim
          </h2>

          <div className="flex items-center gap-4">
            <button
              onClick={handleRefresh}
              className="p-3 rounded-full hover:bg-gray-100 transition-all duration-300"
              disabled={loading}
              title="Làm mới"
            >
              <BiRefresh
                className={`text-3xl ${
                  loading
                    ? "animate-spin"
                    : "hover:rotate-180 transition-transform duration-300"
                }`}
              />
            </button>

            <div className="flex items-center w-[280px]">
              <input
                type="text"
                placeholder="Tên phim…"
                value={queryName}
                onChange={(e) => setQueryName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg focus:outline-none border"
              />
            </div>

            <div className="flex items-center w-[280px]">
              <input
                type="text"
                placeholder="Quốc gia…"
                value={queryCountry}
                onChange={(e) => setQueryCountry(e.target.value)}
                className="w-full px-4 py-2 rounded-lg focus:outline-none border"
              />
            </div>

            <div className="flex items-center w-[220px]">
              <select
                name="age"
                value={queryAge}
                onChange={(e) => setQueryAge(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="" disabled>
                  Độ tuổi
                </option>
                <option value="all">Tất cả</option>
                {ageTags.map((a) => (
                  <option key={a.id} value={a.symbol}>
                    {a.symbol}
                  </option>
                ))}
              </select>
            </div>

            <button
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              onClick={clearFilters}
            >
              Xóa lọc
            </button>

            <button
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
              onClick={handleAddNavigate}
            >
              Thêm phim +
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <Table columns={columns as any} data={paginatedFilms} />

        {filteredFilms.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 bg-gray-50">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm text-gray-600 bg-white rounded-lg shadow-sm disabled:opacity-50"
            >
              Trước
            </button>
            <span className="text-sm text-gray-600">
              Trang {currentPage} trên {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm text-gray-600 bg-white rounded-lg shadow-sm disabled:opacity-50"
            >
              Tiếp
            </button>
          </div>
        )}
      </div>

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

      <RefreshLoader isOpen={loading} />
    </div>
  );
};

export default FilmsListPage;
