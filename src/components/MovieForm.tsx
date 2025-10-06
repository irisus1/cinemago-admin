"use client";

import { useEffect, useMemo, useState } from "react";
import { Combobox } from "@headlessui/react";
import { FiSearch, FiX } from "react-icons/fi";
import slugify from "slugify";
import slugifyOption from "@/utils/slugifyOption";
import ConfirmDialog from "@/components/ConfirmDialog";
import SuccessDialog from "@/components/SuccessDialog";
import RefreshLoader from "@/components/Loading";
import { addMovie, getAllGenres } from "@/services/MovieService";

type Genre = { id: string; name: string };
type Film = {
  id?: string;
  title: string;
  description: string;
  duration: number;
  releaseDate: string; // ISO
  genres?: Genre[];
  thumbnail?: string;
  trailerUrl?: string;
};

export default function FilmForm({
  mode,
  film,
  onSuccess,
}: {
  mode: "create" | "edit";
  film?: Film;
  onSuccess?: () => void;
}) {
  // ======== Genres ========
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<Genre[]>(
    film?.genres ?? []
  );
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await getAllGenres();
        const list: Genre[] = res?.data?.data ?? res?.data ?? [];
        setGenres(list);
      } catch (e) {
        console.error("getAllGenres error", e);
      }
    })();
  }, []);

  const filteredGenres =
    query === ""
      ? genres
      : genres.filter((g) =>
          slugify(g.name, slugifyOption).includes(slugify(query, slugifyOption))
        );

  const addGenre = (g: Genre | null) => {
    if (!g) return;
    setSelectedGenres((prev) =>
      prev.some((x) => x.id === g.id) ? prev : [...prev, g]
    );
  };
  const removeGenre = (g: Genre) =>
    setSelectedGenres((prev) => prev.filter((x) => x.id !== g.id));

  const genreIdsCsv = useMemo(
    () => selectedGenres.map((g) => String(g.id)).join(","),
    [selectedGenres]
  );

  // ======== Form state ========
  const [title, setTitle] = useState(film?.title ?? "");
  const [description, setDescription] = useState(film?.description ?? "");
  const [duration, setDuration] = useState(
    film?.duration ? String(film.duration) : ""
  );
  const [releaseDate, setReleaseDate] = useState(
    film?.releaseDate?.slice(0, 10) ?? "" // yyyy-mm-dd cho <input type="date">
  );

  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [trailerFile, setTrailerFile] = useState<File | null>(null);

  const [thumbnailPreview, setThumbnailPreview] = useState<string>(
    film?.thumbnail ?? ""
  );
  const [trailerPreview, setTrailerPreview] = useState<string>(
    film?.trailerUrl ?? ""
  );

  const isValid =
    !!title &&
    !!description &&
    !!duration &&
    !!releaseDate &&
    !!genreIdsCsv &&
    (mode === "edit" ? true : !!thumbnailFile && !!trailerFile);

  // ======== Dialog / Loading ========
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMsg, setDialogMsg] = useState<React.ReactNode>("");

  async function handleSubmit() {
    try {
      setConfirmOpen(false);
      setLoading(true);

      const fd = new FormData();
      fd.append("title", title);
      fd.append("description", description);
      fd.append("duration", String(Number(duration)));
      fd.append("releaseDate", releaseDate);
      fd.append("genresIds", genreIdsCsv);
      if (thumbnailFile) fd.append("thumbnail", thumbnailFile);
      if (trailerFile) fd.append("trailer", trailerFile);

      console.log(
        fd.get("title"),
        fd.get("description"),
        fd.get("duration"),
        fd.get("releaseDate"),
        fd.get("genresIds"),
        fd.get("thumbnail"),
        fd.get("trailer")
      );

      await addMovie(fd);

      setDialogTitle("Thành công");
      setDialogMsg(
        mode === "create" ? "Thêm phim thành công" : "Cập nhật thành công"
      );
      setSuccessOpen(true);
      onSuccess?.();
    } catch (e: any) {
      console.error(e);
      setDialogTitle("Lỗi");
      setDialogMsg(e?.response?.data?.message ?? "Thao tác thất bại.");
      setSuccessOpen(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full min-h-screen px-4 md:px-6 py-6">
      <h2 className="text-2xl font-bold mb-6">
        {mode === "create" ? "Thêm mới phim" : "Chỉnh sửa phim"}
      </h2>

      {/* GRID 12 cột: Thumbnail dọc (4) | Trailer (4) | Thông tin (4) */}
      <div className="grid grid-cols-12 gap-6">
        {/* Thumbnail (vertical) */}
        <div className="col-span-12 lg:col-span-4 space-y-3">
          <label className="block text-sm font-medium">Thumbnail (file)</label>
          <div className="w-full h-[540px] rounded-lg bg-gray-100 overflow-hidden border">
            {thumbnailPreview ? (
              <img
                src={thumbnailPreview}
                alt="thumbnail"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                Xem trước thumbnail
              </div>
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setThumbnailFile(f);
              setThumbnailPreview(
                f ? URL.createObjectURL(f) : thumbnailPreview
              );
            }}
            className="file:px-4 file:py-2 file:bg-gray-600 file:text-white file:rounded hover:file:bg-blue-700"
          />
        </div>

        {/* Trailer */}
        <div className="col-span-12 lg:col-span-4 space-y-3">
          <label className="block text-sm font-medium">Trailer (file)</label>
          <div className="w-full h-[320px] rounded-lg bg-gray-100 overflow-hidden border">
            {trailerPreview ? (
              <video src={trailerPreview} controls className="w-full h-full" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                Xem trước trailer
              </div>
            )}
          </div>
          <input
            type="file"
            accept="video/*"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setTrailerFile(f);
              setTrailerPreview(f ? URL.createObjectURL(f) : trailerPreview);
            }}
            className="file:px-4 file:py-2 file:bg-gray-600 file:text-white file:rounded hover:file:bg-blue-700"
          />
        </div>

        {/* Thông tin */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Tiêu đề</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="VD: Thám tử lừng danh Conan"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Mô tả</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Thời lượng (phút)
              </label>
              <input
                inputMode="numeric"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="95"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Ngày phát hành
              </label>
              <input
                type="date"
                lang="vi"
                value={releaseDate}
                onChange={(e) => setReleaseDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          {/* Genres multi-select */}
          <div>
            <label className="block text-sm font-medium mb-1">Thể loại</label>
            <Combobox value={null} onChange={addGenre}>
              <div className="relative">
                <div className="relative w-full overflow-hidden rounded-lg bg-white text-left border focus-within:ring-2 focus-within:ring-blue-500">
                  <Combobox.Input
                    className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:outline-none"
                    onChange={(e) => setQuery(e.target.value)}
                    displayValue={() => ""}
                    placeholder="Tìm thể loại…"
                  />
                  <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <FiSearch className="h-5 w-5 text-gray-400" />
                  </Combobox.Button>
                </div>
                <Combobox.Options className="absolute mt-1 max-h-56 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-10">
                  {filteredGenres.length === 0 && query !== "" ? (
                    <div className="cursor-default select-none py-2 px-4 text-gray-700">
                      Không tìm thấy kết quả
                    </div>
                  ) : (
                    filteredGenres.map((g) => (
                      <Combobox.Option
                        key={g.id}
                        className={({ active }) =>
                          `cursor-default select-none py-2 pl-10 pr-4 ${
                            active ? "bg-blue-600 text-white" : "text-gray-900"
                          }`
                        }
                        value={g}
                      >
                        {g.name}
                      </Combobox.Option>
                    ))
                  )}
                </Combobox.Options>
              </div>
            </Combobox>

            <div className="mt-2 flex flex-wrap gap-2">
              {selectedGenres.map((g) => (
                <span
                  key={g.id}
                  className="inline-flex items-center bg-blue-100 text-blue-800 rounded-full px-3 py-1 text-sm"
                >
                  {g.name}
                  <button
                    onClick={() => removeGenre(g)}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                    type="button"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                </span>
              ))}
            </div>

            <p className="text-xs text-gray-500 mt-1">
              Sẽ gửi: <code>genresIds="{genreIdsCsv}"</code>
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 mt-8">
        <button
          type="button"
          onClick={() => history.back()}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          Hủy
        </button>
        <button
          type="button"
          disabled={!isValid}
          onClick={() => {
            setDialogTitle(
              mode === "create" ? "Xác nhận thêm phim" : "Xác nhận cập nhật"
            );
            setDialogMsg(
              mode === "create" ? "Thêm phim mới?" : "Lưu thay đổi?"
            );
            setConfirmOpen(true);
          }}
          className={`px-4 py-2 rounded-lg text-white ${
            isValid
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-gray-400 cursor-not-allowed"
          }`}
        >
          {mode === "create" ? "Thêm phim" : "Lưu"}
        </button>
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleSubmit}
        title={dialogTitle}
        message={dialogMsg}
      />
      <SuccessDialog
        isOpen={successOpen}
        onClose={() => setSuccessOpen(false)}
        title={dialogTitle}
        message={dialogMsg}
      />
      <RefreshLoader isOpen={loading} />
    </div>
  );
}
