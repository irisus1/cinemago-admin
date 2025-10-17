import React from "react";
const isKeyOf = <T extends object>(obj: T, key: PropertyKey): key is keyof T =>
  key in obj;

export type Column<T> = {
  header: React.ReactNode;
  key?: keyof T | string;
  render?: (value: unknown, row: T) => React.ReactNode;
  getValue?: (row: T) => unknown;
};

export type TableProps<T> = {
  columns: ReadonlyArray<Column<T>>;
  data: ReadonlyArray<T>;
  getRowKey?: (row: T, index: number) => React.Key;
};

const isPrimitive = (x: unknown): x is string | number | boolean =>
  typeof x === "string" || typeof x === "number" || typeof x === "boolean";

const isRecord = (x: unknown): x is Record<string, unknown> =>
  typeof x === "object" && x !== null;

const hasName = (x: unknown): x is { name: unknown } =>
  isRecord(x) && "name" in x;

export function formatTitle(v: unknown): string {
  if (v == null) return "";

  if (isPrimitive(v)) return String(v);

  if (Array.isArray(v)) {
    const items = (v as unknown[]).map((item) => {
      if (isPrimitive(item)) return String(item);
      if (hasName(item)) {
        const n = item.name;
        return isPrimitive(n) ? String(n) : "";
      }
      return "";
    });
    return items.filter(Boolean).join(", ");
  }

  return "";
}

export default function Table<T extends Record<string, unknown>>({
  columns,
  data,
  getRowKey,
}: TableProps<T>) {
  return (
    <div className="w-full">
      {data.length ? (
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b">
              {columns.map((c, i) => (
                <th
                  key={i}
                  className="px-6 py-3 text-left text-sm font-medium text-gray-500"
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIdx) => {
              const key = getRowKey ? getRowKey(row, rowIdx) : rowIdx;
              return (
                <tr key={key} className="border-b hover:bg-gray-50">
                  {columns.map((col, colIdx) => {
                    const value =
                      col.getValue?.(row) ??
                      (col.key && isKeyOf(row, col.key)
                        ? row[col.key]
                        : undefined);

                    return (
                      <td
                        key={colIdx}
                        className="px-6 py-4 text-sm text-gray-500 truncate max-w-xs"
                        title={formatTitle(value)}
                      >
                        {col.render
                          ? col.render(value, row)
                          : (value as React.ReactNode)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <div className="text-center text-gray-500 py-4">Không có dữ liệu</div>
      )}
    </div>
  );
}
