"use client";

import { useEffect, useState, useMemo } from "react";
import {
  userService,
  type User,
  type PaginationMeta,
  type CreateUserRequest,
} from "@/services";
import { toast } from "sonner";

export function useUsersLogic() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [role, setRole] = useState<"__ALL__" | "ADMIN" | "USER">("__ALL__");
  const [status, setStatus] = useState<"__ALL__" | "ACTIVE" | "INACTIVE">(
    "__ALL__"
  );

  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(7);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [open, setOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);

  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMessage, setDialogMessage] = useState<React.ReactNode>("");

  const [onConfirm, setOnConfirm] = useState<() => void>(() => () => { });

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search, role, status]);

  const fetchUsers = async (toPage = page) => {
    try {
      setLoading(true);

      const isActiveParam =
        status === "__ALL__" ? undefined : status === "ACTIVE";

      const res = await userService.getAllUsers({
        page: toPage,
        limit: pageSize,
        search: search.trim() || undefined,
        role: role !== "__ALL__" ? role : undefined,
        isActive: isActiveParam,
      });

      const { data, pagination } = res;

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
  }, [page, search, role, status]);

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
    action: () => void | Promise<void>
  ) => {
    setDialogTitle(title);
    setDialogMessage(message);
    setOnConfirm(() => action);
    setIsConfirmDialogOpen(true);
  };

  const handleDelete = (u: User) => {
    const doDelete = async () => {
      setIsConfirmDialogOpen(false);
      try {
        await userService.deleteUser(u.id);

        setUsers((prev) =>
          prev.map((it) => (it.id === u.id ? { ...it, isActive: false } : it))
        );

        setDialogTitle("Thành công");
        toast.success("Đã vô hiệu hóa tài khoản.");
      } catch (err) {
        alert("Thao tác thất bại: " + err);
      }
    };

    openConfirm(
      "Xác nhận vô hiệu hóa",
      "Bạn có chắc muốn vô hiệu hóa tài khoản này?",
      doDelete
    );
  };

  const handleRestore = (u: User) => {
    const doRestore = async () => {
      setIsConfirmDialogOpen(false);
      try {
        await userService.restoreUser(u.id);

        setUsers((prev) =>
          prev.map((it) => (it.id === u.id ? { ...it, isActive: true } : it))
        );

        setDialogTitle("Thành công");
        toast.success("Đã kích hoạt tài khoản.");
      } catch (err) {
        alert("Thao tác thất bại: " + err);
      }
    };

    openConfirm(
      "Xác nhận kích hoạt",
      "Kích hoạt lại tài khoản này?",
      doRestore
    );
  };

  const handleSubmitUser = (
    payload: CreateUserRequest,
    mode: "create" | "edit",
    user?: User
  ) => {
    const isCreate = mode === "create";

    const doSubmit = async () => {
      setIsConfirmDialogOpen(false);
      try {
        if (isCreate) {
          await userService.createUser(payload);
        } else if (user) {
          await userService.updateUser(user.id, payload);
        }

        setDialogTitle("Thành công");
        toast.success(
          isCreate
            ? "Đã tạo người dùng mới."
            : "Đã cập nhật thông tin người dùng."
        );

        await fetchUsers();
        setOpen(false);
        setEditUser(null);
      } catch (err) {
        console.error(err);
        setDialogTitle("Thất bại");
        setDialogMessage(
          isCreate
            ? "Đã có lỗi trong quá trình tạo người dùng mới."
            : "Đã có lỗi trong quá trình cập nhật thông tin người dùng."
        );
        setIsErrorDialogOpen(true);
      }
    };

    openConfirm(
      isCreate ? "Xác nhận tạo người dùng" : "Xác nhận cập nhật người dùng",
      `Bạn có chắc muốn ${isCreate ? "tạo tài khoản người dùng này?" : "cập nhật tài khoản này?"
      }`,
      doSubmit
    );
  };

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setRole("__ALL__");
    setStatus("__ALL__");
  };

  const canClearFilters = useMemo(
    () => search.trim() !== "" || role !== "__ALL__" || status !== "__ALL__",
    [search, role, status]
  );

  return {
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
    setEditUser,
    isConfirmDialogOpen,
    setIsConfirmDialogOpen,
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
  };
}
