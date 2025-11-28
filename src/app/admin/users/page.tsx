"use client";

import React from "react";
import Table, { Column } from "@/components/Table";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { BiRefresh } from "react-icons/bi";
import { Modal } from "@/components/Modal";
import RefreshLoader from "@/components/Loading";
import UserModal from "@/components/modal/UserModal";
import { Badge } from "@/components/ui/badge";
import type { User } from "@/services";
import { useUsersLogic } from "@/hooks/useUserLogic";

const UsersListPage: React.FC = () => {
  const {
    users,
    searchInput,
    setSearchInput,
    role,
    setRole,
    status,
    setStatus,
    loading,
    page,
    setPage,
    totalPages,
    totalItems,
    pagination,
    open,
    setOpen,
    editUser,
    isConfirmDialogOpen,
    setIsConfirmDialogOpen,
    isSuccessDialogOpen,
    setIsSuccessDialogOpen,
    isErrorDialogOpen,
    setIsErrorDialogOpen,
    dialogTitle,
    dialogMessage,
    onConfirm,
    handleAddOpen,
    handleEditOpen,
    handleRefresh,
    handleDelete,
    handleRestore,
    handleSubmitUser,
    clearFilters,
  } = useUsersLogic();

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

    if (isGenderVN(s)) return s;

    return "Khác";
  };

  const columns: Column<User>[] = [
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
            <div className="flex space-x-3">
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
            </div>
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
  ];

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

            <div className="w-[280px]">
              <input
                type="text"
                placeholder="Tìm theo tên hoặc email…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full px-4 py-2 rounded-lg focus:outline-none border"
              />
            </div>

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

            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as "__ALL__" | "ACTIVE" | "INACTIVE")
              }
              className="px-3 py-2 rounded-lg border"
              title="Lọc trạng thái"
            >
              <option value="__ALL__">Tất cả trạng thái</option>
              <option value="ACTIVE">Hoạt động</option>
              <option value="INACTIVE">Đã khóa</option>
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
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50">
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

      <Modal
        isOpen={isErrorDialogOpen}
        onClose={() => setIsErrorDialogOpen(false)}
        type="error"
        title={dialogTitle}
        message={dialogMessage}
        confirmText="Đóng"
      />

      <UserModal
        open={open}
        onClose={() => setOpen(false)}
        mode={editUser ? "edit" : "create"}
        user={editUser ?? undefined}
        onSubmit={handleSubmitUser}
      />

      <RefreshLoader isOpen={loading} />
    </div>
  );
};

export default UsersListPage;
