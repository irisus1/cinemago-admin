"use client";

import React from "react";
import Image from "next/image";
import { BiRefresh } from "react-icons/bi";
import { FiEdit2, FiTrash2, FiPlusCircle } from "react-icons/fi";

import RefreshLoader from "@/components/Loading";
import Table, { Column } from "@/components/Table";
import { Modal } from "@/components/Modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import FoodDrinkModal from "@/components/modal/FoodDrinkModal";
import { useFoodDrinkLogic } from "@/hooks/useFoodDrinkLogic";
import { type FoodDrink } from "@/services";

const VI_TYPE = { SNACK: "Đồ ăn", DRINK: "Thức uống", COMBO: "Combo" };
const VI_AVAIL = { true: "Còn bán", false: "Ngừng bán" };

export default function FoodDrinkListPage() {
  const {
    rows,
    loading,
    page,
    setPage,
    totalPages,
    hasPrev,
    hasNext,
    q,
    setQ,
    type,
    setType,
    isAvailable,
    setIsAvailable,
    selectedIds,
    toggleOne,
    toggleAllOnPage,
    clearSelection,
    handleBulkToggle,
    showForm,
    setShowForm,
    editing,
    handleAdd,
    handleEdit,
    handleDelete,
    handleRefresh,
    handleSubmitFoodDrink,
    confirmOpen,
    setConfirmOpen,
    successOpen,
    setSuccessOpen,
    errorOpen,
    setErrorOpen,
    dialogTitle,
    dialogMsg,
    onConfirm,
  } = useFoodDrinkLogic();

  // Logic xác định checkbox "Select All"
  const pageIds = rows.map((r) => r.id);
  const allChecked =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const someChecked = pageIds.some((id) => selectedIds.has(id)) && !allChecked;

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
      render: (_, row) => (
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
      render: (val, row) => {
        const src = typeof val === "string" ? val : row.image;
        return src ? (
          <Image
            src={src}
            alt="food"
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
              title="Làm mới"
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
          <div className="flex justify-between items-center px-4 py-2 bg-gray-50">
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
