// app/(admin)/admin/genres/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Table, { Column } from "@/components/Table";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { BiRefresh } from "react-icons/bi";
import Dialog from "@/components/ConfirmDialog";
import SuccessDialog from "@/components/SuccessDialog";
import RefreshLoader from "@/components/Loading";
import GenreModal from "@/components/GenreModal";
import {
  getAllGenres,
  deleteGenre,
  restoreGenre,
} from "@/services/MovieService";

// ===== Types =====
type Genre = {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
};

const GenresListPage: React.FC = () => {
  // Data & filters
  const [genres, setGenres] = useState<Genre[]>([]);
  const [queryName, setQueryName] = useState("");
  const itemsPerPage = 7;

  // UI state
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // Modal (create/edit)
  const [open, setOpen] = useState(false);
  const [editGenre, setEditGenre] = useState<Genre | null>(null);

  // Confirm/Success dialogs
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMessage, setDialogMessage] = useState<React.ReactNode>("");
  const [onConfirm, setOnConfirm] = useState<() => void>(() => () => {});

  // ===== Data fetching =====
  const fetchGenres = async () => {
    try {
      setLoading(true);
      const res = await getAllGenres();
      const { data } = res.data; // tuỳ payload của bạn
      setGenres(data ?? []);
    } catch (err) {
      console.error("Error fetching genres:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGenres();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [queryName]);

  // ===== Handlers =====
  const handleAddOpen = () => {
    setEditGenre(null);
    setOpen(true);
  };

  const handleEditOpen = (g: Genre) => {
    setEditGenre(g);
    setOpen(true);
  };

  const handleRefresh = async () => {
    setLoading(true);
    await fetchGenres();
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

  const handleDelete = (g: Genre) => {
    openConfirm(
      "Xác nhận xóa",
      <>
        Bạn có chắc chắn muốn xóa thể loại này không?
        <br />
        Việc này không thể hoàn tác.
      </>,
      async () => {
        setIsConfirmDialogOpen(false);
        try {
          await deleteGenre(g.id);
          await fetchGenres();
          setDialogTitle("Thành công");
          setDialogMessage("Xóa thể loại thành công");
          setIsSuccessDialogOpen(true);
        } catch (err) {
          alert("Thao tác thất bại: " + err);
        }
      }
    );
  };

  const handleRestore = (g: Genre) => {
    openConfirm(
      "Xác nhận khôi phục",
      <>Khôi phục thể loại này?</>,
      async () => {
        setIsConfirmDialogOpen(false);
        try {
          await restoreGenre(g.id);
          await fetchGenres();
          setDialogTitle("Thành công");
          setDialogMessage("Khôi phục thể loại thành công");
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
    return genres.filter((f) =>
      queryName ? f.name.toLowerCase().includes(queryName.toLowerCase()) : true
    );
  }, [genres, queryName]);

  const totalPages = Math.ceil(filteredGenres.length / itemsPerPage) || 1;
  const paginatedGenres = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredGenres.slice(start, start + itemsPerPage);
  }, [filteredGenres, currentPage]);

  // ===== Table columns =====
  const columns: Column<Genre>[] = [
    { header: "Tên thể loại", key: "name" },
    { header: "Mô tả", key: "description" },
    {
      header: "Hành động",
      key: "actions",
      render: (_: unknown, row: Genre) => (
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
  ];

  // ===== Render =====
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-3">
          Danh sách thể loại
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
                placeholder="Tên thể loại…"
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
              Thêm thể loại +
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        {/* <Table columns={columns as any} data={paginatedGenres} /> */}

        <Table<Genre>
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
      <GenreModal
        open={open}
        onClose={() => setOpen(false)}
        mode={editGenre ? "edit" : "create"}
        genre={editGenre ?? undefined}
        onSuccess={async () => {
          setOpen(false);
          setEditGenre(null);
          await fetchGenres(); // reload list
        }}
      />

      <RefreshLoader isOpen={loading} />
    </div>
  );
};

export default GenresListPage;
