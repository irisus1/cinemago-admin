"use client";

import React from "react";
import Table, { Column } from "@/components/Table";
import { Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { BiRefresh } from "react-icons/bi";
import { Modal } from "@/components/Modal";
import RefreshLoader from "@/components/Loading";
import UserModal from "@/components/modal/UserModal";
import { Badge } from "@/components/ui/badge";
import type { User } from "@/services";
import { useUsersLogic } from "@/hooks/useUserLogic";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

const VI_ROLE: Record<string, string> = {
  ADMIN: "Quản trị viên",
  MANAGER: "Quản lý rạp",
  EMPLOYEE: "Nhân viên",
  USER: "Người dùng",
};

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
    canClearFilters,

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
    isErrorDialogOpen,
    setIsErrorDialogOpen,
    dialogTitle,
    dialogMessage,

    onConfirm,
    handleAddOpen,
    handleEditOpen,
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
        <Badge variant="secondary">
          {VI_ROLE[String(v).toUpperCase()] ?? String(v)}
        </Badge>
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
      headerClassName: "text-center",
      render: (_: unknown, row: User) => (
        <div className="flex w-full items-center justify-center space-x-3">
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
            <div className="relative w-[280px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm theo tên hoặc email…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="h-10 w-full pl-8 pr-3 border-gray-400 rounded-lg border text-sm"
              />
            </div>

            <div className="h-10">
              <Select
                value={role}
                onValueChange={(val) =>
                  setRole(val as "__ALL__" | "ADMIN" | "USER")
                }
              >
                <SelectTrigger className="h-full w-[200px] rounded-lg border border-gray-300 bg-gray-50">
                  <SelectValue placeholder="Tất cả vai trò" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__ALL__">Tất cả vai trò</SelectItem>
                  <SelectItem value="ADMIN">Quản trị viên</SelectItem>
                  <SelectItem value="MANAGER">Quản lý rạp</SelectItem>
                  <SelectItem value="EMPLOYEE">Nhân viên</SelectItem>
                  <SelectItem value="USER">Người dùng</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="h-10">
              <Select
                value={status}
                onValueChange={(val) =>
                  setStatus(val as "__ALL__" | "ACTIVE" | "INACTIVE")
                }
              >
                <SelectTrigger className="h-10 w-[200px] rounded-lg border border-gray-300 bg-gray-50">
                  <SelectValue placeholder="Tất cả trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__ALL__">Tất cả trạng thái</SelectItem>
                  <SelectItem value="ACTIVE">Hoạt động</SelectItem>
                  <SelectItem value="INACTIVE">Đã khóa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              className={
                "px-4 h-10 rounded-lg text-sm font-medium transition-colors " +
                (canClearFilters
                  ? "bg-red-100 text-red-700 hover:bg-red-200"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed")
              }
              onClick={clearFilters}
              disabled={!canClearFilters}
            >
              Xóa lọc
            </button>

            <Button className="h-10 px-4" onClick={handleAddOpen}>
              <Plus className="w-4 h-4 mr-1" />
              Thêm người dùng
            </Button>
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
