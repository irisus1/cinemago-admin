"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Table, { Column } from "@/components/Table";
import { FiEdit2, FiTrash2, FiEye } from "react-icons/fi";
import { BiRefresh } from "react-icons/bi";
import Dialog from "@/components/ConfirmDialog";
import SuccessDialog from "@/components/SuccessDialog";
import RefreshLoader from "@/components/Loading";
import CinemaModal from "@/components/CinemaModal";
import {
  getAllCinemas,
  deleteCinema,
  restoreCinema,
} from "@/services/CinemaService";

// ===== Types =====
type Cinema = {
  id: string;
  name: string;
  address: string;
  city: string;
  longitude: number;
  latitude: number;

  isActive: boolean;
};

const GenresListPage: React.FC = () => {
  const router = useRouter();
  // Data & filters
  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [queryName, setQueryName] = useState("");
  const itemsPerPage = 7;

  // UI state
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // Modal (create/edit)
  const [open, setOpen] = useState(false);
  const [editCinema, setEditCinema] = useState<Cinema | null>(null);

  // Confirm/Success dialogs
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMessage, setDialogMessage] = useState<React.ReactNode>("");
  const [onConfirm, setOnConfirm] = useState<() => void>(() => () => {});

  // ===== Data fetching =====
  const fetchCinemas = async () => {
    try {
      setLoading(true);
      const res = await getAllCinemas();
      const { data } = res.data; // tuỳ payload của bạn
      setCinemas(data ?? []);
    } catch (err) {
      console.error("Error fetching genres:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCinemas();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [queryName]);

  // ===== Handlers =====
  const handleAddOpen = () => {
    setEditCinema(null);
    setOpen(true);
  };

  const handleEditOpen = (g: Cinema) => {
    setEditCinema(g);
    setOpen(true);
  };

  const handleViewNavigate = (g: Cinema) => {
    router.push(`/admin/cinema/${g.id}`);
  };

  const handleRefresh = async () => {
    setLoading(true);
    await fetchCinemas();
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

  const handleDelete = (g: Cinema) => {
    openConfirm(
      "Xác nhận xóa",
      <>
        Bạn có chắc chắn muốn xóa rạp phim này không?
        <br />
        Việc này không thể hoàn tác.
      </>,
      async () => {
        setIsConfirmDialogOpen(false);
        try {
          await deleteCinema(g.id);
          await fetchCinemas();
          setDialogTitle("Thành công");
          setDialogMessage("Xóa rạp phim thành công");
          setIsSuccessDialogOpen(true);
        } catch (err) {
          alert("Thao tác thất bại: " + err);
        }
      }
    );
  };

  const handleRestore = (g: Cinema) => {
    openConfirm(
      "Xác nhận khôi phục",
      <>Khôi phục rạp phim này?</>,
      async () => {
        setIsConfirmDialogOpen(false);
        try {
          await restoreCinema(g.id);
          await fetchCinemas();
          setDialogTitle("Thành công");
          setDialogMessage("Khôi phục rạp phim thành công");
          setIsSuccessDialogOpen(true);
        } catch (err) {
          alert("Thao tác thất bại: " + err);
        }
      }
    );
  };

  const clearFilters = () => setQueryName("");

  // ===== Filtering & pagination =====
  const filteredGenres = useMemo(() => {
    return cinemas.filter((f) =>
      queryName ? f.name.toLowerCase().includes(queryName.toLowerCase()) : true
    );
  }, [cinemas, queryName]);

  const totalPages = Math.ceil(filteredGenres.length / itemsPerPage) || 1;
  const paginatedGenres = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredGenres.slice(start, start + itemsPerPage);
  }, [filteredGenres, currentPage]);

  // ===== Table columns =====
  const columns: Column<Cinema>[] = [
    { header: "Tên rạp phim", key: "name" },
    { header: "Thành phố", key: "city" },
    { header: "Địa chỉ", key: "address" },
    {
      header: "Kinh độ",
      key: "longitude",
      render: (v) => (v == null ? "Chưa có" : Number(v).toFixed(6)),
    },
    {
      header: "Vĩ độ",
      key: "latitude",
      render: (v) => (v == null ? "Chưa có" : Number(v).toFixed(6)),
    },
    {
      header: "Hành động",
      key: "actions",
      render: (_: unknown, row: Cinema) => (
        <div className="flex space-x-3">
          {row.isActive ? (
            <>
              <button
                className="text-green-600 hover:text-green-800"
                onClick={() => handleViewNavigate(row)}
                title="Xem chi tiết"
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

  // ===== Render =====
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-3">
          Danh sách rạp phim
        </h2>

        <div className="flex items-center justify-between w-full">
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

            <div className="w-[280px]">
              <input
                type="text"
                placeholder="Tên rạp phim…"
                value={queryName}
                onChange={(e) => setQueryName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg focus:outline-none border"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              onClick={clearFilters}
            >
              Xóa lọc
            </button>
            <button
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
              onClick={handleAddOpen}
            >
              Thêm rạp phim +
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        {/* <Table columns={columns as any} data={paginatedGenres} /> */}

        <Table<Cinema>
          columns={columns}
          data={paginatedGenres}
          getRowKey={(r) => r.id}
        />

        {filteredGenres.length > 0 && (
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

      {/* Confirm & Success */}
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

      {/* Modal Thêm/Sửa */}
      <CinemaModal
        open={open}
        onClose={() => setOpen(false)}
        mode={editCinema ? "edit" : "create"}
        cinema={editCinema ?? undefined}
        onSuccess={async () => {
          setOpen(false);
          setEditCinema(null);
          await fetchCinemas(); // reload list
        }}
      />

      <RefreshLoader isOpen={loading} />
    </div>
  );
};

export default GenresListPage;
