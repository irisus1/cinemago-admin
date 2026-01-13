"use client";

import React, { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import Table, { Column } from "@/components/Table";
import { Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { BiRefresh } from "react-icons/bi";
import { Modal } from "@/components/Modal";
import RefreshLoader from "@/components/Loading";
import UserModal from "@/components/modal/UserModal";
import { Badge } from "@/components/ui/badge";
import {
    userService,
    type User,
    type PaginationMeta,
    type CreateUserRequest,
} from "@/services";
import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";

const VI_ROLE: Record<string, string> = {
    ADMIN: "Quản trị viên",
    MANAGER: "Quản lý rạp",
    EMPLOYEE: "Nhân viên",
    USER: "Người dùng",
};

export default function EmployeesPage() {
    const { user: currentUser } = useAuth();

    // --- Logic State ---
    const [users, setUsers] = useState<User[]>([]);
    const [search, setSearch] = useState("");
    const [searchInput, setSearchInput] = useState("");
    // Chỉ hiện Employee, không cho chọn role khác
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

    // --- Effects ---
    useEffect(() => {
        const t = setTimeout(() => setSearch(searchInput), 300);
        return () => clearTimeout(t);
    }, [searchInput]);

    useEffect(() => {
        setPage(1);
    }, [search, status]);

    const fetchUsers = async (toPage = page) => {
        if (!currentUser) return;

        try {
            setLoading(true);
            const isActiveParam =
                status === "__ALL__" ? undefined : status === "ACTIVE";

            // FORCE filters: role=EMPLOYEE, cinemaId=currentUser.cinemaId
            const res = await userService.getAllUsers({
                page: toPage,
                limit: pageSize,
                search: search.trim() || undefined,
                role: "EMPLOYEE",
                isActive: isActiveParam,
                cinemaId: currentUser.cinemaId, // Filter theo rạp của manager
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
    }, [page, search, status, currentUser]);

    // --- Handlers ---
    const handleAddOpen = () => {
        // Khi add employee, cần gán cinemaId mặc định là của manager
        // UserModal hiện tại có lẽ chưa support hidden fields hoặc preset
        // Ta setEditUser(null)
        setEditUser(null);
        setOpen(true);
    };

    const handleEditOpen = (u: User) => {
        setEditUser(u);
        setOpen(true);
    };

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
                setUsers((prev) =>
                    prev.map((it) => (it.id === u.id ? { ...it, isActive: false } : it))
                );
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
                setUsers((prev) =>
                    prev.map((it) => (it.id === u.id ? { ...it, isActive: true } : it))
                );
                toast.success("Đã kích hoạt tài khoản.");
            } catch (err) {
                alert("Thao tác thất bại: " + err);
            }
        };
        openConfirm("Xác nhận kích hoạt", "Kích hoạt lại tài khoản này?", doRestore);
    };

    const handleSubmitUser = (
        payload: CreateUserRequest,
        mode: "create" | "edit",
        user?: User
    ) => {
        const isCreate = mode === "create";

        // Inject cinemaId for new employee
        // payload từ UserModal có thể thiếu cinemaId nếu manager ko chọn được
        // Ta tự inject currentUser.cinemaId vào payload nếu create
        const finalPayload = { ...payload };
        if (isCreate && currentUser?.cinemaId) {
            finalPayload.role = "EMPLOYEE"; // Force role
            finalPayload.cinemaId = currentUser.cinemaId;
        }

        const doSubmit = async () => {
            setIsConfirmDialogOpen(false);
            try {
                if (isCreate) {
                    await userService.createUser(finalPayload);
                } else if (user) {
                    await userService.updateUser(user.id, finalPayload);
                }

                toast.success(
                    isCreate
                        ? "Đã tạo nhân viên mới."
                        : "Đã cập nhật thông tin nhân viên."
                );
                await fetchUsers();
                setOpen(false);
                setEditUser(null);
            } catch (err) {
                console.error(err);
                setDialogTitle("Thất bại");
                setDialogMessage("Có lỗi xảy ra. " + (err as Error).message);
                setIsErrorDialogOpen(true);
            }
        };

        openConfirm(
            isCreate ? "Xác nhận tạo" : "Xác nhận cập nhật",
            `Bạn có chắc muốn ${isCreate ? "tạo" : "cập nhật"} nhân viên này?`,
            doSubmit
        );
    };

    const clearFilters = () => {
        setSearchInput("");
        setSearch("");
        setStatus("__ALL__");
    };

    const canClearFilters = useMemo(
        () => search.trim() !== "" || status !== "__ALL__",
        [search, status]
    );

    // --- Columns ---
    const mapGender = (v: unknown) => {
        if (v == null) return "—";
        const s = String(v).trim().toLowerCase();
        if (["male", "m", "nam"].includes(s)) return "Nam";
        if (["female", "f", "nu", "nữ"].includes(s)) return "Nữ";
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
                <Badge variant="outline">
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
            header: "Hành động",
            key: "actions",
            headerClassName: "text-center",
            render: (_: unknown, row: User) => (
                <div className="flex w-full items-center justify-center space-x-3">
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
    ];

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-3">
                    Quản lý nhân viên
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
                            Thêm nhân viên
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

            {isConfirmDialogOpen && (
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
                        // setIsConfirmDialogOpen(false); // Do logic inside onConfirm calls it
                    }}
                    confirmText="Xác nhận"
                />
            )}



            {isErrorDialogOpen && (
                <Modal
                    isOpen={isErrorDialogOpen}
                    onClose={() => setIsErrorDialogOpen(false)}
                    type="error"
                    title={dialogTitle}
                    message={dialogMessage}
                    confirmText="Đóng"
                />
            )}

            {open && (
                <UserModal
                    open={open}
                    onClose={() => setOpen(false)}
                    mode={editUser ? "edit" : "create"}
                    user={editUser ?? undefined}
                    onSubmit={handleSubmitUser}
                    fixedRole="EMPLOYEE"
                    hideCinemaSelect={true}
                />
            )}

            <RefreshLoader isOpen={loading} />
        </div>
    );
}
