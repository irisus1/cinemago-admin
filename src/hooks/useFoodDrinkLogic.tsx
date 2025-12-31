"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  foodDrinkService,
  type FoodDrink,
  PaginationMeta,
  cinemaService,
  Cinema,
} from "@/services";
import { useAuth } from "@/context/AuthContext";
import { SelectOption } from "@/components/SearchableCombobox";

const limit = 7;

export function useFoodDrinkLogic() {
  // --- STATE ---
  const [rows, setRows] = useState<FoodDrink[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasPrev, setHasPrev] = useState(false);
  const [hasNext, setHasNext] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState<string>("");
  const [isAvailable, setIsAvailable] = useState<string>("");
  const { user } = useAuth();
  const isManager = user?.role === "MANAGER";

  const [cinemaId, setCinemaId] = useState("");
  const [cinemaOptions, setCinemaOptions] = useState<SelectOption[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FoodDrink | null>(null);

  // Dialog states
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [errorOpen, setErrorOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMsg, setDialogMsg] = useState<React.ReactNode>("");
  const [onConfirm, setOnConfirm] = useState<() => void>(() => { });

  // --- CACHE ---
  const pageCache = useRef(
    new Map<number, { data: FoodDrink[]; pagination: PaginationMeta }>()
  );
  const allCache = useRef<FoodDrink[] | null>(null);

  const clearCache = () => {
    pageCache.current.clear();
    allCache.current = null;
  };

  // --- CINEMA LOADING ---
  // --- CINEMA LOADING ---
  useEffect(() => {
    const initCinemaData = async () => {

      if (isManager && user?.cinemaId) {
        setCinemaId(user.cinemaId);
        // setCinemaOptions([{
        //   value: user.cinemaId,
        //   label: (user as any).cinemaName || "Rạp hiện tại",
        //   meta: ""
        // }]);
        return;
      }

      try {
        const first = await cinemaService.getAllCinemas({ page: 1, limit: 7 });
        const total = first.pagination.totalPages;
        let allCinemas = first.data;

        if (total > 1) {
          const promises = [];
          for (let i = 2; i <= total; i++) {
            promises.push(cinemaService.getAllCinemas({ page: i, limit: 7 }));
          }
          const results = await Promise.all(promises);
          const others = results.flatMap((r) => r.data);
          allCinemas = [...allCinemas, ...others];
        }

        const opts = allCinemas.map((c) => ({
          value: c.id,
          label: c.name,
          meta: c.city,
        }));

        // Removed "All" option
        // opts.unshift({ value: "", label: "Tất cả rạp", meta: "" });

        setCinemaOptions(opts);

        // Logic chọn rạp mặc định cho Admin nếu chưa chọn
        if (!cinemaId && opts.length > 0) {
          setCinemaId(opts[0].value);
        }
      } catch (e) {
        console.error("Load cinemas error", e);
        toast.error("Không thể tải danh sách rạp");
      }
    };

    initCinemaData();
  }, [isManager, user?.cinemaId]);

  // --- DATA FETCHING ---
  const fetchPage = useCallback(
    async (p: number) => {
      // Backend requires cinemaId. If not set (e.g. loading), return empty.
      if (!cinemaId) {
        return {
          data: [],
          pagination: {
            totalItems: 0,
            totalPages: 1,
            currentPage: 1,
            pageSize: limit,
            hasNextPage: false,
            hasPrevPage: false,
          },
        };
      }

      const cached = pageCache.current.get(p);
      if (cached) return cached;

      const res = await foodDrinkService.getFoodDrinks({
        page: p,
        limit,
        search: search || undefined,
        isAvailable:
          isAvailable === ""
            ? undefined
            : isAvailable === "true"
              ? true
              : false,
        cinemaId: cinemaId,
      });

      pageCache.current.set(p, res);
      return res;
    },
    [search, isAvailable, cinemaId, isManager]
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
      if (search) {
        const keyword = search.toLowerCase().trim();
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
  }, [ensureAllDataLoaded, search, type, isAvailable, page, cinemaId]);

  // Effects
  useEffect(() => {
    const t = setTimeout(() => setSearch(q), 400);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setPage(1);
    clearCache(); // Filter changed -> clear cache to force refetch
  }, [search, type, isAvailable, cinemaId]);

  useEffect(() => {
    loadPage();
  }, [page, search, type, isAvailable, loadPage]);

  const handleCinemaChange = useCallback((id: string) => {
    if (!id) return; // Prevent clearing cinema
    setCinemaId(id);
    setPage(1);
    clearCache();
  }, []);
  // --- HELPERS ---
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

  // --- HANDLERS ---
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
      cinemaId?: string;
    },
    mode: "create" | "edit",
    original?: FoodDrink | null
  ) => {
    const isCreate = mode === "create";
    const itemName = data.name || original?.name || "";

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
          if (data.cinemaId) fd.append("cinemaId", data.cinemaId);

          if (isCreate) {
            const created = await foodDrinkService.addFoodDrink(fd);

            // Logic OPTIMISTIC UPDATE: 
            // Chỉ thêm vào cache hiển thị nếu đang view đúng rạp mà món này vừa được thêm vào.
            // "Tất cả" không còn tồn tại.
            const isVisibleInCurrentFilter = cinemaId === data.cinemaId;

            if (isVisibleInCurrentFilter) {
              if (allCache.current) {
                allCache.current = [created, ...(allCache.current || [])];
              } else {
                allCache.current = [created];
              }
              pageCache.current.delete(1);
            }
            // Nếu không match filter thì không cần update cache client, 
            // người dùng sẽ không thấy nó ngay lập tức (đúng logic).

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

  // --- SELECTION LOGIC ---
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

  const toggleAllOnPage = (checked: boolean) => {
    const pageIds = rows.map((r) => r.id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) pageIds.forEach((id) => next.add(id));
      else pageIds.forEach((id) => next.delete(id));
      return next;
    });
  };

  const handleBulkToggle = async () => {
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
  };

  // --- FILTERS CONTROL ---
  const clearFilters = () => {
    setQ("");
    setSearch("");
    setType("");
    setIsAvailable("");
    // Do not clear cinemaId
    setPage(1);
  };

  const canClearFilters = useMemo(
    () =>
      q.trim() !== "" ||
      type.trim() !== "" ||
      isAvailable.trim() !== "",
    [q, type, isAvailable]
  );

  return {
    // Data
    rows,
    loading,
    page,
    setPage,
    totalPages,
    hasPrev,
    hasNext,

    // Filters
    q,
    setQ,
    type,
    setType,
    isAvailable,
    setIsAvailable,
    clearFilters,
    canClearFilters,

    // Selection
    selectedIds,
    toggleOne,
    toggleAllOnPage,
    clearSelection,
    handleBulkToggle,

    // Actions & Modal
    showForm,
    setShowForm,
    editing,
    setEditing,
    handleAdd,
    handleEdit,
    handleDelete,
    handleRefresh,
    handleSubmitFoodDrink,

    // Dialogs
    confirmOpen,
    setConfirmOpen,
    successOpen,
    setSuccessOpen,
    errorOpen,
    setErrorOpen,
    dialogTitle,
    dialogMsg,
    onConfirm,

    // Cinema
    cinemaId,
    setCinemaId: handleCinemaChange,
    cinemaOptions,
    isManager,
    user,
  };
}
