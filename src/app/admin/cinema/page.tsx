// app/(admin)/admin/cinemas/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Table, { Column } from "@/components/Table";
import { FiEdit2, FiTrash2, FiEye } from "react-icons/fi";
import { BiRefresh } from "react-icons/bi";

import RefreshLoader from "@/components/Loading";
import { Modal } from "@/components/Modal";
import CinemaModal from "@/components/CinemaModal";
import { cinemaService, type Cinema, PaginationMeta } from "@/services";

type Mode = "server" | "client";

const CinemasListPage: React.FC = () => {
  const router = useRouter();

  // ===== Server data + pagination =====
  const [cinemas, setCinemas] = useState<Cinema[]>([]); // 1 trang từ server
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(5);

  // ===== Client full data (khi có filter city/address) =====
  const [allRows, setAllRows] = useState<Cinema[]>([]);
  const [mode, setMode] = useState<Mode>("server");

  // ===== Filters =====
  const [temp, setTemp] = useState(""); // input tạm cho tên rạp (debounce)
  const [nameKw, setNameKw] = useState(""); // gửi lên BE qua "search"
  const [cityKw, setCityKw] = useState(""); // filter client
  const [addrKw, setAddrKw] = useState(""); // filter client
  const hasClientFilter = cityKw.trim() !== "" || addrKw.trim() !== "";

  // ===== UI state =====
  const [loading, setLoading] = useState(false);

  // ===== Modal (create/edit) =====
  const [open, setOpen] = useState(false);
  const [editCinema, setEditCinema] = useState<Cinema | null>(null);

  // ===== Confirm/Success dialogs =====
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMessage, setDialogMessage] = useState<React.ReactNode>("");
  const [onConfirm, setOnConfirm] = useState<() => void>(() => () => {});

  // ========== Fetch helpers ==========
  const fetchPage = async (toPage = page) => {
    setLoading(true);
    try {
      const res = await cinemaService.getAllCinemas({
        page: toPage,
        limit,
        search: nameKw.trim() || undefined, // BE chỉ lọc theo tên rạp
      });

      setCinemas(res?.data ?? []);
      setPagination(res?.pagination ?? null);

      // nếu BE normalize currentPage
      if (res?.pagination?.currentPage && res.pagination.currentPage !== page) {
        setPage(res.pagination.currentPage);
      }
    } catch (err) {
      console.error("Error fetching cinemas:", err);
      setCinemas([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  };

  // Gọi lần lượt đến khi hết trang (hasNextPage=false)
  const fetchAllForClient = async (opts?: {
    search?: string;
    pageSize?: number;
  }) => {
    setLoading(true);
    try {
      const result: Cinema[] = [];
      let nextPage = 1;
      let pageSizeLocal = opts?.pageSize ?? limit;

      while (true) {
        const res = await cinemaService.getAllCinemas({
          page: nextPage,
          limit: pageSizeLocal,
          search: opts?.search?.trim() || undefined, // vẫn áp dụng search theo tên ở BE
        });
        const { data, pagination } = res;
        result.push(...(data ?? []));

        // nếu BE trả pageSize khác tham số, đồng bộ lại để bước nhảy ổn định
        if (pagination?.pageSize && pagination.pageSize !== pageSizeLocal) {
          pageSizeLocal = pagination.pageSize;
        }

        if (!pagination?.hasNextPage) break;
        nextPage = (pagination?.currentPage ?? nextPage) + 1;

        // Guard an toàn nếu BE lỗi
        if (pagination?.totalPages && nextPage > pagination.totalPages) break;
      }

      setAllRows(result);
    } catch (err) {
      console.error("Error fetching all pages:", err);
      setAllRows([]);
    } finally {
      setLoading(false);
    }
  };

  // ========== Effects ==========
  // Debounce tên rạp
  useEffect(() => {
    const t = setTimeout(() => setNameKw(temp), 400);
    return () => clearTimeout(t);
  }, [temp]);

  // Đổi trạng thái client filter => chuyển mode & về trang 1
  useEffect(() => {
    const nextMode: Mode = hasClientFilter ? "client" : "server";
    setMode(nextMode);
    setPage(1);
  }, [hasClientFilter]);

  // Server mode: fetch theo page/limit/nameKw
  useEffect(() => {
    if (mode === "server") fetchPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, page, limit, nameKw]);

  // Client mode: mỗi khi nameKw đổi (ảnh hưởng tập dữ liệu), tải toàn bộ
  useEffect(() => {
    if (mode === "client")
      fetchAllForClient({ search: nameKw, pageSize: limit });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, nameKw, limit]);

  // Đổi city/address trong client mode -> chỉ cần về trang 1
  useEffect(() => {
    if (mode === "client") setPage(1);
  }, [cityKw, addrKw, mode]);

  // ========== Data to display ==========
  const source = mode === "client" ? allRows : cinemas;

  const filtered = useMemo(() => {
    if (mode !== "client") return source; // server mode: không lọc client
    const c = cityKw.trim().toLowerCase();
    const a = addrKw.trim().toLowerCase();
    return source.filter((x) => {
      const okCity = c ? x.city?.toLowerCase().includes(c) : true;
      const okAddr = a ? x.address?.toLowerCase().includes(a) : true;
      return okCity && okAddr;
    });
  }, [mode, source, cityKw, addrKw]);

  const clientTotalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const displayRows =
    mode === "client"
      ? filtered.slice((page - 1) * limit, (page - 1) * limit + limit)
      : source;

  // ========== Handlers ==========
  const handleAddOpen = () => {
    setEditCinema(null);
    setOpen(true);
  };
  const handleEditOpen = (g: Cinema) => {
    setEditCinema(g);
    setOpen(true);
  };
  const handleViewNavigate = (g: Cinema) =>
    router.push(`/admin/cinema/${g.id}`);

  const handleRefresh = async () => {
    if (mode === "server") await fetchPage();
    else await fetchAllForClient({ search: nameKw, pageSize: limit });
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
      <>Bạn có chắc chắn muốn xóa rạp phim này không?</>,
      async () => {
        setIsConfirmDialogOpen(false);
        try {
          await cinemaService.deleteCinema(g.id);
          if (mode === "server") {
            await fetchPage();
          } else {
            await fetchAllForClient({ search: nameKw, pageSize: limit });
          }
          setDialogTitle("Thành công");
          setDialogMessage("Đã ẩn (soft-delete) rạp phim.");
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
          await cinemaService.restoreCinema(g.id);
          if (mode === "server") {
            await fetchPage();
          } else {
            await fetchAllForClient({ search: nameKw, pageSize: limit });
          }
          setDialogTitle("Thành công");
          setDialogMessage("Khôi phục rạp phim thành công");
          setIsSuccessDialogOpen(true);
        } catch (err) {
          alert("Thao tác thất bại: " + err);
        }
      }
    );
  };

  const clearFilters = () => {
    setTemp("");
    setNameKw("");
    setCityKw("");
    setAddrKw("");
  };

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
      className: "text-right w-[120px]",
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

        <div className="flex items-center justify-between gap-4 w-full">
          {/* LEFT: refresh + filters (tự wrap khi hẹp) */}
          <div className="flex items-center gap-3 flex-1 flex-wrap">
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

            {/* Tên rạp (server) */}
            <div className="basis-[240px]">
              <input
                type="text"
                placeholder="Tên rạp"
                value={temp}
                onChange={(e) => setTemp(e.target.value)}
                className="w-full px-4 py-2 rounded-lg focus:outline-none border"
              />
            </div>

            {/* Thành phố (client) */}
            <div className="basis-[200px]">
              <input
                type="text"
                placeholder="Thành phố"
                value={cityKw}
                onChange={(e) => setCityKw(e.target.value)}
                className="w-full px-4 py-2 rounded-lg focus:outline-none border"
              />
            </div>

            {/* Địa chỉ (client) */}
            <div className="basis-[260px]">
              <input
                type="text"
                placeholder="Địa chỉ"
                value={addrKw}
                onChange={(e) => setAddrKw(e.target.value)}
                className="w-full px-4 py-2 rounded-lg focus:outline-none border"
              />
            </div>
          </div>

          {/* RIGHT: actions (luôn dính bên phải) */}
          <div className="flex items-center gap-3 shrink-0">
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
        <Table<Cinema>
          columns={columns}
          data={displayRows}
          getRowKey={(r) => r.id}
        />

        {/* Footer phân trang */}
        {mode === "server" && pagination && (
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

        {mode === "client" && (
          <div className="flex items-center justify-between px-6 py-4 bg-gray-50">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="px-4 py-2 text-sm text-gray-600 bg-white rounded-lg shadow-sm disabled:opacity-50"
            >
              Trước
            </button>
            <span className="text-sm text-gray-600">
              Trang {page} / {clientTotalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(clientTotalPages, p + 1))}
              disabled={page === clientTotalPages || loading}
              className="px-4 py-2 text-sm text-gray-600 bg-white rounded-lg shadow-sm disabled:opacity-50"
            >
              Tiếp
            </button>
          </div>
        )}
      </div>

      {/* Confirm & Success */}

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

      {/* Modal Thêm/Sửa */}
      <CinemaModal
        open={open}
        onClose={() => setOpen(false)}
        mode={editCinema ? "edit" : "create"}
        cinema={editCinema ?? undefined}
        onSuccess={async () => {
          setOpen(false);
          setEditCinema(null);
          if (mode === "server") {
            await fetchPage(); // reload trang hiện tại
          } else {
            await fetchAllForClient({ search: nameKw, pageSize: limit });
          }
        }}
      />

      <RefreshLoader isOpen={loading} />
    </div>
  );
};

export default CinemasListPage;
