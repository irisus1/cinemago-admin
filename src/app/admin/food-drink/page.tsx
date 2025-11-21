"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { BiRefresh } from "react-icons/bi";
import { FiEdit2, FiTrash2, FiPlusCircle } from "react-icons/fi";
import { toast } from "sonner";
import RefreshLoader from "@/components/Loading";
import Table, { Column } from "@/components/Table";
import { Modal } from "@/components/Modal";
import { foodDrinkService, type FoodDrink, PaginationMeta } from "@/services";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import FoodDrinkModal from "@/components/modal/FoodDrinkModal";
import Image from "next/image";

const limit = 7;
const VI_TYPE = { SNACK: "Đồ ăn", DRINK: "Thức uống", COMBO: "Combo" };
const VI_AVAIL = { true: "Còn bán", false: "Ngừng bán" };

export default function FoodDrinkListPage() {
  const [rows, setRows] = useState<FoodDrink[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasPrev, setHasPrev] = useState(false);
  const [hasNext, setHasNext] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState("");
  const [type, setType] = useState<string>("");
  const [isAvailable, setIsAvailable] = useState<string>("");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FoodDrink | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [errorOpen, setErrorOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMsg, setDialogMsg] = useState<React.ReactNode>("");
  const [onConfirm, setOnConfirm] = useState<() => void>(() => {});

  const pageCache = useRef(
    new Map<number, { data: FoodDrink[]; pagination: PaginationMeta }>()
  );
  const allCache = useRef<FoodDrink[] | null>(null);

  const clearCache = () => {
    pageCache.current.clear();
    allCache.current = null;
  };

  const fetchPage = useCallback(
    async (p: number) => {
      const cached = pageCache.current.get(p);
      if (cached) return cached;

      const res = await foodDrinkService.getFoodDrinks({
        page: p,
        limit,
        search: q || undefined,
        isAvailable:
          isAvailable === ""
            ? undefined
            : isAvailable === "true"
            ? true
            : false,
      });

      pageCache.current.set(p, res);
      return res;
    },
    [q, isAvailable]
  );

  const ensureAllDataLoaded = useCallback(async () => {
    if (allCache.current) return allCache.current;

    const first = await fetchPage(1);
    const totalPages = first.pagination.totalPages;

    const allResults = await Promise.all(
      Array.from({ length: totalPages }, (_, i) => fetchPage(i + 1))
    );

    const allData = allResults.flatMap((r) => r.data);
    allCache.current = allData;
    return allData;
  }, [fetchPage]);

  const loadPage = useCallback(async () => {
    setLoading(true);
    try {
      const allData = await ensureAllDataLoaded();

      let filtered = allData;
      if (type) filtered = filtered.filter((item) => item.type === type);
      if (q) {
        const keyword = q.toLowerCase().trim();
        filtered = filtered.filter(
          (item) =>
            item.name.toLowerCase().includes(keyword) ||
            item.description.toLowerCase().includes(keyword)
        );
      }

      if (isAvailable !== "") {
        const active = isAvailable === "true";
        filtered = filtered.filter((item) => item.isAvailable === active);
      }

      const start = (page - 1) * limit;
      const paged = filtered.slice(start, start + limit);

      setRows(paged);
      setTotalPages(Math.max(1, Math.ceil(filtered.length / limit)));
      setHasPrev(page > 1);
      setHasNext(page < Math.ceil(filtered.length / limit));
    } catch (e) {
      toast.error(String(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [ensureAllDataLoaded, q, type, isAvailable, page]);

  useEffect(() => {
    loadPage();
  }, [page, q, type, isAvailable, loadPage]);

  useEffect(() => {
    setPage(1);
  }, [q, type, isAvailable]);

  const updateCacheItem = (id: string, patch: Partial<FoodDrink>) => {
    if (allCache.current) {
      allCache.current = allCache.current.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      );
    }

    for (const [pageNum, entry] of pageCache.current.entries()) {
      const updated = entry.data.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      );
      pageCache.current.set(pageNum, { ...entry, data: updated });
    }
  };

  const handleRefresh = async () => {
    clearCache();
    await loadPage();
  };

  const handleAdd = () => {
    setEditing(null);
    setShowForm(true);
  };

  const handleEdit = (fd: FoodDrink) => {
    setEditing(fd);
    setShowForm(true);
  };

  const openConfirm = (
    title: string,
    message: React.ReactNode,
    action: () => void
  ) => {
    setDialogTitle(title);
    setDialogMsg(message);
    setOnConfirm(() => action);
    setConfirmOpen(true);
  };

  const handleDelete = (fd: FoodDrink) => {
    const isCurrentlyAvailable = fd.isAvailable;

    const actionText = isCurrentlyAvailable ? "ngừng bán" : "bán lại";
    const successText = isCurrentlyAvailable ? "Ngừng bán" : "Bán lại";

    openConfirm(
      `Xác nhận ${actionText}`,
      <>
        Bạn có chắc chắn muốn <b>{actionText}</b> món{" "}
        <span className="text-red-600">{fd.name}</span> không?
      </>,
      async () => {
        setConfirmOpen(false);
        try {
          await foodDrinkService.toggleFoodDrinkAvailability(fd.id);
          setDialogTitle("Thành công");
          setDialogMsg(
            <>
              Món <b>{fd.name}</b> đã được <b>{successText.toLowerCase()}</b>{" "}
              thành công.
            </>
          );
          setSuccessOpen(true);
          updateCacheItem(fd.id, { isAvailable: !fd.isAvailable });

          await loadPage();
        } catch (e) {
          toast.error("Thao tác thất bại: " + String(e));
        }
      }
    );
  };

  const handleSubmitFoodDrink = (
    data: {
      name: string;
      description: string;
      price: string;
      type: "SNACK" | "DRINK" | "COMBO";
      file?: File | null;
    },
    mode: "create" | "edit",
    original?: FoodDrink | null
  ) => {
    const isCreate = mode === "create";
    const itemName = data.name || original?.name || "";

    // ✅ ĐÓNG form trước để không bị chồng 2 modal
    setShowForm(false);
    setEditing(original ?? null);

    openConfirm(
      isCreate ? "Xác nhận thêm món" : "Xác nhận cập nhật món",
      <>
        Bạn có chắc muốn <b>{isCreate ? "thêm mới" : "cập nhật"}</b> món{" "}
        <span className="text-blue-600 font-semibold">{itemName}</span> không?
      </>,
      async () => {
        setConfirmOpen(false);
        try {
          setLoading(true);

          const fd = new FormData();
          fd.append("name", data.name);
          fd.append("description", data.description);
          fd.append("price", data.price);
          fd.append("type", data.type);
          if (data.file) fd.append("image", data.file);

          if (isCreate) {
            const created = await foodDrinkService.addFoodDrink(fd);

            if (allCache.current) {
              allCache.current = [created, ...(allCache.current || [])];
            } else {
              allCache.current = [created];
            }
            pageCache.current.delete(1);

            setDialogTitle("Thành công");
            setDialogMsg(
              <>
                Đã thêm món <b>{created.name}</b> thành công.
              </>
            );
            setSuccessOpen(true);
          } else if (original) {
            const updated = await foodDrinkService.updateFoodDrinkById(
              original.id,
              fd
            );

            updateCacheItem(updated.id, updated);

            setDialogTitle("Thành công");
            setDialogMsg(
              <>
                Đã cập nhật món <b>{updated.name}</b> thành công.
              </>
            );
            setSuccessOpen(true);
          }

          setEditing(null);
          await loadPage();
        } catch (e) {
          toast.error("Không thể lưu món: " + String(e));
        } finally {
          setLoading(false);
        }
      }
    );
  };

  async function handleBulkToggle() {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);

    openConfirm(
      "Xác nhận cập nhật",
      <>
        Bạn có chắc chắn muốn <b>chuyển trạng thái</b> cho <b>{ids.length}</b>{" "}
        món đã chọn không?
      </>,
      async () => {
        setConfirmOpen(false);
        try {
          setLoading(true);

          const allItems = allCache.current ?? [];

          await Promise.all(
            ids.map((id) => foodDrinkService.toggleFoodDrinkAvailability(id))
          );

          ids.forEach((id) => {
            const current = allItems.find((x) => x.id === id);
            if (current)
              updateCacheItem(id, { isAvailable: !current.isAvailable });
          });

          loadPage();

          setDialogTitle("Thành công");
          setDialogMsg(
            <>
              Đã cập nhật trạng thái cho <b>{ids.length}</b> món thành công.
            </>
          );
          setSuccessOpen(true);
          clearSelection();
        } catch (e) {
          toast.error("Không thể cập nhật: " + String(e));
        } finally {
          setLoading(false);
        }
      }
    );
  }

  const toggleOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set<string>(prev);

      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }

      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const pageIds = rows.map((r) => r.id);
  const allChecked =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const someChecked = pageIds.some((id) => selectedIds.has(id)) && !allChecked;

  const toggleAllOnPage = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) pageIds.forEach((id) => next.add(id));
      else pageIds.forEach((id) => next.delete(id));
      return next;
    });
  };

  const columns: Column<FoodDrink>[] = [
    {
      header: (
        <input
          type="checkbox"
          aria-label="Chọn tất cả"
          ref={(el) => {
            if (el) el.indeterminate = someChecked;
          }}
          checked={allChecked}
          onChange={(e) => toggleAllOnPage(e.currentTarget.checked)}
        />
      ),
      key: "__select",
      render: (_: unknown, row: FoodDrink) => (
        <input
          type="checkbox"
          aria-label={`Chọn ${row.name}`}
          checked={selectedIds.has(row.id)}
          onChange={(e) => toggleOne(row.id, e.currentTarget.checked)}
        />
      ),
    },
    {
      header: "Hình ảnh",
      key: "image",
      render: (val: unknown, row: FoodDrink) => {
        const src = typeof val === "string" ? val : row.image;
        return src ? (
          <Image
            src={src}
            alt="fooddrink"
            width={50}
            height={50}
            className="rounded-md object-cover"
          />
        ) : (
          "_"
        );
      },
    },
    { header: "Tên món", key: "name" },
    { header: "Mô tả", key: "description" },
    {
      header: "Loại",
      key: "type",
      render: (_, r) => VI_TYPE[r.type] ?? r.type,
    },
    { header: "Giá (VNĐ)", key: "price" },
    {
      header: "Trạng thái",
      key: "isAvailable",
      render: (_, r) => (
        <span
          className={
            r.isAvailable
              ? "text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full"
              : "text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full"
          }
        >
          {VI_AVAIL[String(r.isAvailable) as "true" | "false"]}
        </span>
      ),
    },
    {
      header: "Hành động",
      key: "actions",
      render: (_, r) => (
        <div className="flex space-x-3">
          <button
            className="text-blue-600 hover:text-blue-800"
            onClick={() => handleEdit(r)}
            title="Chỉnh sửa"
          >
            <FiEdit2 className="w-4 h-4" />
          </button>
          <button
            className="text-red-600 hover:text-red-800"
            onClick={() => handleDelete(r)}
            title="Ngừng bán"
          >
            <FiTrash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 pb-6">
          Danh sách đồ ăn & thức uống
        </h2>

        <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
          <div className="flex flex-wrap items-center gap-4 p-4 rounded-lg flex-1 ">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={loading}
              className="h-10 w-10 grid place-items-center"
              title="Làm mới danh sách"
            >
              <BiRefresh
                className={`text-2xl ${
                  loading
                    ? "animate-spin"
                    : "hover:rotate-180 transition-transform duration-300"
                }`}
              />
            </Button>

            <Input
              type="text"
              placeholder="Tìm theo tên món..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-[260px] border-gray-300 focus:ring-2 focus:ring-blue-400"
            />

            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="h-10 rounded-md border border-gray-300 px-3 focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Loại: Tất cả</option>
              <option value="SNACK">Đồ ăn</option>
              <option value="DRINK">Thức uống</option>
              <option value="COMBO">Combo</option>
            </select>

            <select
              value={isAvailable}
              onChange={(e) => setIsAvailable(e.target.value)}
              className="h-10 rounded-md border border-gray-300 px-3 focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Trạng thái: Tất cả</option>
              <option value="true">Còn bán</option>
              <option value="false">Ngừng bán</option>
            </select>
          </div>

          <Button
            onClick={handleAdd}
            className="bg-black text-white hover:bg-blue-700 h-10 px-5 ml-auto shadow-md transition-colors duration-300"
          >
            <FiPlusCircle className="mr-2 text-lg" /> Thêm món
          </Button>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-muted/30 border rounded-lg p-3 mb-3">
          <span className="text-sm">
            Đã chọn <b>{selectedIds.size}</b> món
          </span>
          <Button
            onClick={handleBulkToggle}
            className="bg-black text-white hover:bg-blue-700"
          >
            Chuyển trạng thái
          </Button>
          <Button variant="outline" onClick={clearSelection}>
            Hủy chọn
          </Button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <Table columns={columns} data={rows} getRowKey={(r) => r.id} />

        {loading && (
          <div className="px-6 py-3 text-gray-600 text-sm">
            Đang tải dữ liệu…
          </div>
        )}

        {rows.length > 0 && (
          <div className="flex justify-between items-center px-6 py-4 bg-gray-50">
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!hasPrev || loading}
            >
              Trước
            </Button>
            <span className="text-sm">
              Trang {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setPage((p) => (hasNext ? p + 1 : p))}
              disabled={!hasNext || loading}
            >
              Tiếp
            </Button>
          </div>
        )}
      </div>

      {showForm && (
        <FoodDrinkModal
          open={showForm}
          onClose={() => setShowForm(false)}
          editData={editing}
          onSubmit={handleSubmitFoodDrink}
        />
      )}

      <Modal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        type="info"
        title={dialogTitle}
        message={dialogMsg}
        onCancel={() => {
          setConfirmOpen(false);
          setShowForm(true);
        }}
        onConfirm={onConfirm}
        confirmText="Xác nhận"
        cancelText="Hủy"
      />

      <Modal
        isOpen={successOpen}
        onClose={() => setSuccessOpen(false)}
        type="success"
        title={dialogTitle}
        message={dialogMsg}
        confirmText="Đóng"
      />

      <Modal
        isOpen={errorOpen}
        onClose={() => setErrorOpen(false)}
        type="error"
        title={dialogTitle}
        message={dialogMsg}
        confirmText="Đóng"
      />

      <RefreshLoader isOpen={loading} />
    </div>
  );
}
