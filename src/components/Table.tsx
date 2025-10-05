import React from "react";

type Column<T> = {
  key: keyof T;
  header: string;
  render?: (value: any, row: T) => React.ReactNode;
};

type TableProps<T> = {
  columns: Column<T>[];
  data: T[];
};

function Table<T extends { [key: string]: any }>({
  columns,
  data,
}: TableProps<T>) {
  return (
    <div className="w-full">
      {data && data.length > 0 ? (
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b">
              {columns.map((col, index) => (
                <th
                  key={index}
                  className="px-6 py-3 text-left text-sm font-medium text-gray-500"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b hover:bg-gray-50">
                {columns.map((col, colIndex) => (
                  <td
                    key={colIndex}
                    className="px-6 py-4 text-sm text-gray-500 truncate max-w-xs"
                    title={String(row[col.key])}
                  >
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="text-center text-gray-500 py-4">Không có dữ liệu</div>
      )}
    </div>
  );
}

export default Table;
