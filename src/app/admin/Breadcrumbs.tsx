// app/(admin)/_components/Breadcrumbs.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const RESOURCES: Record<string, string> = {
  movies: "Phim",
  theaters: "Rạp",
  users: "Người dùng",
  genres: "Thể loại",
  // thêm ở đây: categories: "Danh mục", showtimes: "Suất chiếu", ...
};

export default function Breadcrumbs() {
  const pathname = usePathname(); // vd: /admin/movies/new
  const segs = pathname.split("/").filter(Boolean); // ["admin","movies","new"]

  // Không hiện ở /admin
  if (segs.length <= 1) return null;

  const [, resource, s3, s4] = segs; // s3 có thể là "new" hoặc "[id]", s4 có thể là "edit"
  const resourceLabel =
    RESOURCES[resource] || decodeURIComponent(resource || "");

  // Suy luận nhãn theo pattern
  let parts: { href: string; label: string; last?: boolean }[] = [];

  // 1) Danh sách
  const listHref = `/admin/${resource}`;
  parts.push({ href: listHref, label: `Danh sách ${resourceLabel}` });

  // 2) Thêm
  if (s3 === "new") {
    parts.push({
      href: `${listHref}/new`,
      label: `Thêm ${resourceLabel.toLowerCase()}`,
      last: true,
    });
  }

  // 3) Chỉnh sửa (…/<id>/edit)
  if (s3 && s4 === "edit") {
    parts.push({
      href: `${listHref}/${s3}/edit`,
      label: "Chỉnh sửa",
      last: true,
    });
  }

  // 4) Trường hợp khác (tùy biến, ví dụ: /admin/<resource>/import)
  if (s3 && !s4 && s3 !== "new") {
    parts.push({
      href: `${listHref}/${s3}`,
      label: decodeURIComponent(s3),
      last: true,
    });
  }

  return (
    <nav aria-label="Breadcrumb" className="text-sm">
      <ol className="flex flex-wrap gap-2">
        {parts.map((it, i) => (
          <li key={it.href} className="flex items-center">
            {it.last ? (
              <span className="font-medium">{it.label}</span>
            ) : (
              <Link href={it.href} className="hover:underline">
                {it.label}
              </Link>
            )}
            {i < parts.length - 1 && <span className="mx-2">›</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
