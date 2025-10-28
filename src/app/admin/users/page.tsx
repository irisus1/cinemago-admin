// app/(admin)/admin/users/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Table, { Column } from "@/components/Table";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { BiRefresh } from "react-icons/bi";
import Dialog from "@/components/ConfirmDialog";
import SuccessDialog from "@/components/SuccessDialog";
import RefreshLoader from "@/components/Loading";
// (tuỳ bạn có UserModal hay không)
// import UserModal from "@/components/UserModal";
import { getAllUsers, deleteUser, restoreUser } from "@/services/UserService";
import { Badge } from "@/components/ui/badge";

type User = {
  id: string;
  email: string;
  fullname: string;
  gender: "Nam" | "Nữ" | null;
  role: "ADMIN" | "USER" | string;
  isActive: boolean;
  createdAt: string; // ISO
};

type ApiPagination = {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};
type ApiResponse<T> = { pagination: ApiPagination; data: T[] };

const UsersListPage: React.FC = () => {
  // Data & filters
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState(""); // debounce input
  const [role, setRole] = useState<"__ALL__" | "ADMIN" | "STAFF" | "USER">(
    "__ALL__"
  );

  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(7);
  const [pagination, setPagination] = useState<ApiPagination | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modal (create/edit) — nếu dùng
  const [open, setOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);

  // Confirm/Success dialogs
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMessage, setDialogMessage] = useState<React.ReactNode>("");
  const [onConfirm, setOnConfirm] = useState<() => void>(() => () => {});

  // debounce 300ms
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // đổi search/role => về trang 1
  useEffect(() => {
    setPage(1);
  }, [search, role]);

  // fetch
  const fetchUsers = async (toPage = page) => {
    try {
      setLoading(true);
      const res = await getAllUsers({
        page: toPage,
        limit: pageSize,
        search: search.trim() || undefined,
        role: role !== "__ALL__" ? role : undefined, // BE yêu cầu uppercase
      });
      const { data, pagination } = res.data as ApiResponse<User>;
      setUsers(data ?? []);
      setPagination(pagination ?? null);
      setTotalPages(pagination?.totalPages ?? 1);
      setTotalItems(pagination?.totalItems ?? 0);
      if (pagination?.currentPage && pagination.currentPage !== page) {
        setPage(pagination.currentPage);
      }
    } catch (e) {
      console.error(e);
      setUsers([]);
      setPagination(null);
      setTotalPages(1);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, role]);

  // handlers
  const handleAddOpen = () => {
    setEditUser(null);
    setOpen(true);
  };
  const handleEditOpen = (u: User) => {
    setEditUser(u);
    setOpen(true);
  };
  const handleRefresh = () => fetchUsers();

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

  const handleDelete = (u: User) => {
    openConfirm(
      "Xác nhận vô hiệu hóa",
      <>Bạn có chắc muốn vô hiệu hóa tài khoản này?</>,
      async () => {
        setIsConfirmDialogOpen(false);
        try {
          await deleteUser(u.id);
          setUsers((prev) =>
            prev.map((it) => (it.id === u.id ? { ...it, isActive: false } : it))
          );
          setDialogTitle("Thành công");
          setDialogMessage("Đã vô hiệu hóa tài khoản.");
          setIsSuccessDialogOpen(true);
        } catch (err) {
          alert("Thao tác thất bại: " + err);
        }
      }
    );
  };

  const handleRestore = (u: User) => {
    openConfirm(
      "Xác nhận kích hoạt",
      <>Kích hoạt lại tài khoản này?</>,
      async () => {
        setIsConfirmDialogOpen(false);
        try {
          await restoreUser(u.id);
          setUsers((prev) =>
            prev.map((it) => (it.id === u.id ? { ...it, isActive: true } : it))
          );
          setDialogTitle("Thành công");
          setDialogMessage("Đã kích hoạt tài khoản.");
          setIsSuccessDialogOpen(true);
        } catch (err) {
          alert("Thao tác thất bại: " + err);
        }
      }
    );
  };

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setRole("__ALL__");
  };

  // columns
  const columns: Column<User>[] = useMemo(
    () => [
      { header: "Email", key: "email" },
      { header: "Họ tên", key: "fullname" },
      {
        header: "Giới tính",
        key: "gender",
        render: (v) => mapGender(v),
      },
      {
        header: "Vai trò",
        key: "role",
        render: (v) => (
          <Badge variant="secondary">{String(v).toUpperCase()}</Badge>
        ),
      },
      {
        header: "Trạng thái",
        key: "isActive",
        render: (_: unknown, r) => (
          <Badge variant={r.isActive ? "default" : "secondary"}>
            {r.isActive ? "Hoạt động" : "Đã khóa"}
          </Badge>
        ),
      },
      {
        header: "Tạo lúc",
        key: "createdAt",
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
        header: "Hành động",
        key: "actions",
        render: (_: unknown, row: User) => (
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
                  title="Vô hiệu hóa"
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                className="text-green-600 hover:text-green-800"
                onClick={() => handleRestore(row)}
                title="Kích hoạt"
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

  type GenderVN = "Nam" | "Nữ" | "Khác" | "—";

  const isGenderVN = (x: string): x is Exclude<GenderVN, "—"> =>
    x === "Nam" || x === "Nữ" || x === "Khác";

  const mapGender = (v: unknown): GenderVN => {
    if (v == null) return "—";
    const s = String(v).trim();
    if (!s) return "—";

    const key = s.normalize("NFC").toLowerCase();

    if (["male", "m", "nam"].includes(key)) return "Nam";
    if (["female", "f", "nu", "nữ"].includes(key)) return "Nữ";
    if (["other", "khac", "khác"].includes(key)) return "Khác";

    // nếu BE đã lưu "Nam"/"Nữ"/"Khác" thì dùng luôn (an toàn nhờ type guard)
    if (isGenderVN(s)) return s;

    return "Khác";
  };

  // render
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-3">
          Quản lý người dùng
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

            {/* Search theo tên/email (server) */}
            <div className="w-[280px]">
              <input
                type="text"
                placeholder="Tìm theo tên hoặc email…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full px-4 py-2 rounded-lg focus:outline-none border"
              />
            </div>

            {/* Lọc theo role (server) */}
            <select
              value={role}
              onChange={(e) =>
                setRole(e.target.value as "__ALL__" | "ADMIN" | "USER")
              }
              className="px-3 py-2 rounded-lg border"
              title="Lọc vai trò"
            >
              <option value="__ALL__">Tất cả vai trò</option>
              <option value="ADMIN">ADMIN</option>
              <option value="USER">Người dùng</option>
            </select>
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
              Thêm người dùng +
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <Table<User> columns={columns} data={users} getRowKey={(r) => r.id} />

        {totalItems > 0 && (
          <div className="flex items-center justify-between px-6 py-4 bg-gray-50">
            <button
              onClick={() =>
                pagination?.hasPrevPage && setPage((p) => Math.max(1, p - 1))
              }
              disabled={!pagination?.hasPrevPage || loading}
              className="px-4 py-2 text-sm text-gray-600 bg-white rounded-lg shadow-sm disabled:opacity-50"
            >
              Trước
            </button>

            <div className="text-sm text-gray-600">
              Trang {pagination?.currentPage ?? page} / {totalPages}
            </div>

            <button
              onClick={() => pagination?.hasNextPage && setPage((p) => p + 1)}
              disabled={!pagination?.hasNextPage || loading}
              className="px-4 py-2 text-sm text-gray-600 bg-white rounded-lg shadow-sm disabled:opacity-50"
            >
              Tiếp
            </button>
          </div>
        )}
      </div>

      {/* Dialogs */}
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

      {/* Modal Thêm/Sửa (nếu có) */}
      {/* <UserModal
        open={open}
        onClose={() => setOpen(false)}
        mode={editUser ? "edit" : "create"}
        user={editUser ?? undefined}
        onSuccess={async () => {
          setOpen(false);
          setEditUser(null);
          await fetchUsers();
        }}
      /> */}

      <RefreshLoader isOpen={loading} />
    </div>
  );
};

export default UsersListPage;
