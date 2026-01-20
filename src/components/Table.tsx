import React from "react";
import {
  Table as STable,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";

const isKeyOf = <T extends object>(obj: T, key: PropertyKey): key is keyof T =>
  key in obj;

export type Column<T> = {
  header: React.ReactNode;
  key?: keyof T | string;
  render?: (value: unknown, row: T) => React.ReactNode;
  getValue?: (row: T) => unknown;
  className?: string;
  headerClassName?: string;
};

export type TableProps<T> = {
  columns: ReadonlyArray<Column<T>>;
  data: ReadonlyArray<T>;
  getRowKey?: (row: T, index: number) => React.Key;
  striped?: boolean;
  hoverable?: boolean;
  dense?: boolean;
};

export default function TableGeneric<T extends object>({
  columns,
  data,
  getRowKey,
  striped = true,
  hoverable = true,
  dense = false,
}: TableProps<T>) {
  return (
    <div className="w-full overflow-x-auto rounded-t-xl  border border-gray-200 shadow-sm">
      <STable className="w-full">
        <TableHeader className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur supports-[backdrop-filter]:bg-gray-50/75">
          <TableRow className="hover:bg-transparent">
            {columns.map((c, i) => (
              <TableHead
                key={i}
                className={[
                  "text-gray-700 font-semibold",
                  dense ? "px-4 py-2 text-sm" : "px-6 py-3 text-sm",
                  c.headerClassName ?? "",
                ].join(" ")}
              >
                {c.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {data.length ? (
            data.map((row, rowIdx) => {
              const key = getRowKey ? getRowKey(row, rowIdx) : rowIdx;
              return (
                <TableRow
                  key={key}
                  className={[
                    "border-t border-gray-100",
                    striped && rowIdx % 2 === 1 ? "bg-gray-50/60" : "",
                    hoverable ? "hover:bg-gray-50" : "",
                  ].join(" ")}
                >
                  {columns.map((col, colIdx) => {
                    const value =
                      col.getValue?.(row) ??
                      (col.key && isKeyOf(row, col.key)
                        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          (row as any)[col.key]
                        : undefined);

                    return (
                      <TableCell
                        key={colIdx}
                        title={typeof value === "string" ? value : undefined}
                        className={[
                          "text-gray-800",
                          dense ? "px-4 py-2 text-sm" : "px-6 py-3 text-sm",
                          "max-w-[28rem] truncate align-middle",
                          col.className ?? "",
                        ].join(" ")}
                      >
                        {col.render
                          ? col.render(value, row)
                          : (value as React.ReactNode)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="px-6 py-10 text-center text-gray-500"
              >
                Không có dữ liệu
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </STable>
    </div>
  );
}
