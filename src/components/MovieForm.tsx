"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { BiArrowBack } from "react-icons/bi";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, X, Check, ChevronsUpDown, Plus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import RefreshLoader from "./Loading";
import { Modal } from "./Modal";
import { genreService, movieService, type Genre, Movie } from "@/services";

export default function MovieForm({
  mode,
  film,
  readOnly = false,
  onSuccess,
}: {
  mode: "create" | "edit" | "view";
  readOnly?: boolean;
  film?: Movie;
  onSuccess?: () => void;
}) {
  // =============== State từ props (sync lại nếu props đổi) ===============
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState<string>("");
  const [releaseDate, setReleaseDate] = useState<Date | undefined>(undefined);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [openGenreBox, setOpenGenreBox] = useState(false);
  const [trailerUrl, setTrailerUrl] = useState<string>("");
  const [thumbUrl, setThumbUrl] = useState<string | undefined>(undefined);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"COMING_SOON" | "SHOWING" | "ENDED">(
    "COMING_SOON"
  );
  const [openStatusBox, setOpenStatusBox] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  const [trailerFile, setTrailerFile] = useState<File | null>(null);
  const [trailerMode, setTrailerMode] = useState<"file" | "url">(
    trailerFile ? "file" : trailerUrl ? "url" : "file"
  );

  const isValidUrl = (s: string) => {
    try {
      new URL(s);
      return true;
    } catch {
      return false;
    }
  };

  const [allGenres, setAllGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [failOpen, setFailOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMsg, setDialogMsg] = useState<React.ReactNode>("");

  // đổ dữ liệu khi film đổi
  useEffect(() => {
    if (!film) return;
    setTitle(film.title ?? "");
    setDescription(film.description ?? "");
    setDuration(film.duration ? String(film.duration) : "");
    setReleaseDate(film.releaseDate ? new Date(film.releaseDate) : undefined);
    // setIsActive(Boolean(film.isActive));
    setGenres(film.genres ?? []);
    setTrailerUrl(film.trailerUrl ?? "");
    setThumbUrl(film.thumbnail ?? undefined);
    setStatus(
      (film.status as "COMING_SOON" | "SHOWING" | "ENDED") ?? "COMING_SOON"
    );
  }, [film]);

  // ======== fetch genres bên trong component ========
  useEffect(() => {
    (async () => {
      try {
        const res = await genreService.getAllGenres();
        const list: Genre[] = res?.data ?? [];
        setAllGenres(list);
      } catch (e) {
        console.error("getAllGenres error", e);
      }
    })();
  }, []);

  // ======== thumbnail ========
  const thumbPreview = useMemo(() => {
    if (thumbFile) return URL.createObjectURL(thumbFile);
    if (thumbUrl) return thumbUrl;
    return "";
  }, [thumbFile, thumbUrl]);

  const onPickThumb = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setThumbFile(f);
    if (f) setThumbUrl(undefined); // tuỳ bạn: xoá URL cũ khi có file mới
  };

  // ======== trailer ========
  const trailerPreview = useMemo(() => {
    if (trailerFile) return URL.createObjectURL(trailerFile);
    if (trailerUrl) return trailerUrl;
    return "";
  }, [trailerFile, trailerUrl]);

  const onPickTrailer = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setTrailerFile(f);
    if (f) {
      setTrailerMode("file");
      setTrailerUrl("");
    } // chỉ 1 trong 2
  };

  const onChangeTrailerUrl = (v: string) => {
    let url = v.trim();
    if (url.includes("youtube.com/watch?v=")) {
      const id = new URL(url).searchParams.get("v");
      if (id) url = `https://www.youtube.com/embed/${id}`;
    } else if (url.includes("youtu.be/")) {
      const id = url.split("youtu.be/")[1]?.split("?")[0];
      if (id) url = `https://www.youtube.com/embed/${id}`;
    }
    setTrailerUrl(url);
    if (url) {
      setTrailerMode("url");
      setTrailerFile(null);
    }
  };
  // ======== genre handlers ========
  const addGenre = (g: Genre) =>
    setGenres((prev) =>
      prev.some((x) => x.id === g.id) ? prev : [...prev, g]
    );
  const removeGenre = (id: string) =>
    setGenres((prev) => prev.filter((g) => g.id !== id));

  // ======== validation ========
  const baseValid =
    !!title && !!description && !!duration && !!releaseDate && !!genres;

  const hasTrailer =
    trailerMode === "file"
      ? !!trailerFile
      : !!trailerUrl && isValidUrl(trailerUrl);

  const isValid =
    mode === "create" ? baseValid && !!thumbFile && hasTrailer : baseValid;

  // ======== submit ========
  const handleSubmit = async () => {
    setConfirmOpen(false);
    setLoading(true);
    const fd = new FormData();

    fd.append("title", title);
    fd.append("description", description);
    fd.append("duration", String(Number(duration)));
    if (releaseDate) {
      const dateStr = format(releaseDate, "yyyy-MM-dd"); // "2025-10-08"
      fd.append("releaseDate", dateStr);
    }
    fd.append("genresIds", genres.map((g) => g.id).join(","));
    // media
    if (thumbFile) fd.append("thumbnail", thumbFile);
    else if (thumbUrl) fd.append("thumbnailUrl", thumbUrl);
    if (trailerFile) fd.append("trailer", trailerFile);
    else if (trailerUrl) fd.append("trailerPath", trailerUrl);
    fd.append("status", status);

    try {
      if (mode === "edit") {
        await movieService.updateMovie(film?.id || "", fd);
        setDialogTitle("Thành công");
        setDialogMsg("Cập nhật thành công");
      } else {
        await movieService.addMovie(fd);
        setDialogTitle("Thành công");
        setDialogMsg("Tạo phim thành công");
      }
      setSuccessOpen(true);
    } catch {
      setDialogTitle("Lỗi");
      setDialogMsg("Thao tác thất bại.");
      setFailOpen(true);
    } finally {
      setLoading(false);
    }
  };

  // =============== UI ===============
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {mode === "edit"
              ? "Chỉnh sửa phim"
              : mode === "create"
              ? "Thêm phim"
              : "Xem chi tiết phim"}
          </h1>
        </div>
      </div>
      {readOnly && (
        <button
          type="button"
          onClick={() => history.back()}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border hover:bg-gray-50 bg-white"
          aria-label="Quay lại"
          title="Quay lại"
        >
          <BiArrowBack className="text-xl" />
          Quay lại
        </button>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left */}
        <div className="lg:col-span-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Thumbnail</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* 1) Ẩn input file */}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPickThumb}
                disabled={readOnly}
              />

              {/* 2) Ảnh đóng vai trò nút chọn file */}
              <div
                role="button"
                tabIndex={0}
                aria-label="Chọn/đổi ảnh thumbnail"
                onClick={() => fileRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileRef.current?.click();
                  }
                }}
                className="relative aspect-[3/4] overflow-hidden rounded-2xl border bg-muted cursor-pointer group"
                title="Bấm để đổi ảnh"
              >
                {thumbPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbPreview}
                    alt="Thumbnail"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="h-full w-full grid place-items-center text-muted-foreground">
                    Bấm để chọn ảnh
                  </div>
                )}

                {/* overlay nhắc người dùng */}
                <div className="pointer-events-none absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                <div
                  className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2
                      rounded-full bg-white/90 px-3 py-1 text-xs font-medium shadow
                      opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Đổi ảnh
                </div>
              </div>

              {/* 3) Nút xoá (tuỳ chọn) */}
              {(thumbFile || thumbUrl) && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setThumbFile(null);
                    setThumbUrl(undefined);
                    fileRef.current && (fileRef.current.value = "");
                  }}
                >
                  Xoá ảnh
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right */}

        <div className="lg:col-span-8 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Thông tin</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xl">
              <div className="md:col-span-3 space-y-2">
                <Label>Tiêu đề</Label>
                <Input
                  value={title}
                  disabled={readOnly}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="md:col-span-3 space-y-2">
                <Label>Mô tả</Label>
                <Textarea
                  rows={5}
                  disabled={readOnly}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Thời lượng (phút)</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  disabled={readOnly}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Ngày phát hành</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={readOnly}
                      className={cn(
                        "w-full justify-start",
                        !releaseDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {releaseDate
                        ? format(releaseDate, "dd/MM/yyyy")
                        : "Chọn ngày"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={releaseDate}
                      onSelect={(d) => setReleaseDate(d)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Trạng thái phim</Label>
                <Popover open={openStatusBox} onOpenChange={setOpenStatusBox}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openStatusBox}
                      disabled={readOnly}
                      className="w-full justify-between"
                    >
                      {status === "COMING_SOON"
                        ? "Sắp chiếu"
                        : status === "SHOWING"
                        ? "Đang chiếu"
                        : "Đã kết thúc"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    className="p-1 w-[var(--radix-popover-trigger-width)]"
                  >
                    <Command>
                      <CommandList>
                        <CommandGroup>
                          <CommandItem
                            onSelect={() => {
                              setStatus("COMING_SOON");
                              setOpenStatusBox(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                status === "COMING_SOON"
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            Sắp chiếu
                          </CommandItem>

                          <CommandItem
                            onSelect={() => {
                              setStatus("SHOWING");
                              setOpenStatusBox(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                status === "SHOWING"
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            Đang chiếu
                          </CommandItem>

                          <CommandItem
                            onSelect={() => {
                              setStatus("ENDED");
                              setOpenStatusBox(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                status === "ENDED" ? "opacity-100" : "opacity-0"
                              )}
                            />
                            Đã kết thúc
                          </CommandItem>
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="md:col-span-3">
                <Label className="mb-2 inline-block">Thể loại</Label>

                {/* các tag đã chọn */}
                <div className="flex flex-wrap gap-2 mb-2">
                  {genres.map((g) => (
                    <Badge
                      key={g.id}
                      variant="secondary"
                      className="px-2 py-1 rounded-full"
                    >
                      {g.name}
                      <button
                        className="ml-2 opacity-70 hover:opacity-100"
                        onClick={(e) => {
                          e.preventDefault();
                          removeGenre(g.id);
                        }}
                        disabled={readOnly}
                        title="Bỏ chọn"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>

                {/* Combobox tìm & chọn từ toàn bộ thể loại */}
                <Popover open={openGenreBox} onOpenChange={setOpenGenreBox}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openGenreBox}
                      disabled={readOnly}
                      className="w-full justify-between"
                    >
                      {/* {genres.length
                        ? `${genres.length} thể loại đã chọn`
                        : "Tìm thể loại…"} */}
                      Chọn thể loại
                      <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>

                  {/* chiều rộng = đúng chiều rộng trigger */}
                  <PopoverContent
                    align="start"
                    className="p-0 w-[var(--radix-popover-trigger-width)]"
                  >
                    <Command>
                      <CommandInput placeholder="Nhập từ khóa…" />
                      <CommandList className="max-h-60 overflow-auto">
                        <CommandEmpty>
                          {genres.length === allGenres.length
                            ? "Bạn đã chọn tất cả thể loại"
                            : "Không tìm thấy thể loại"}
                        </CommandEmpty>
                        <CommandGroup heading="Thể loại">
                          {allGenres
                            .filter(
                              (opt) => !genres.some((g) => g.id === opt.id)
                            ) // loại trùng
                            .map((opt) => (
                              <CommandItem
                                key={opt.id}
                                value={opt.name}
                                onSelect={() => {
                                  addGenre(opt);
                                  setOpenGenreBox(false); // đóng sau khi chọn
                                }}
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                {opt.name}
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Trailer </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-2xl overflow-hidden border bg-black">
                {trailerPreview ? (
                  trailerPreview.includes("youtube.com/embed/") ? (
                    <iframe
                      src={trailerPreview}
                      className="w-full aspect-video"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  ) : (
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    <video src={trailerPreview} controls className="w-full" />
                  )
                ) : (
                  <div className="aspect-video grid place-items-center text-muted-foreground">
                    Chưa có trailer
                  </div>
                )}
              </div>

              {/* Upload file */}
              <div className="flex items-center gap-3">
                <Input
                  type="file"
                  accept="video/*"
                  onChange={onPickTrailer}
                  disabled={(trailerMode === "url" && !!trailerUrl) || readOnly} // khóa khi đang nhập URL
                />
                {trailerFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setTrailerFile(null);
                    }}
                  >
                    Xoá file
                  </Button>
                )}
              </div>

              {/* Hoặc dán URL */}
              <div>
                <Label className="mb-1 inline-block">Hoặc dán URL</Label>
                <Input
                  placeholder="https://…"
                  value={trailerUrl}
                  onChange={(e) => onChangeTrailerUrl(e.target.value)}
                  disabled={
                    (trailerMode === "file" && !!trailerFile) || readOnly
                  } // khóa khi đã chọn file
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      {readOnly ? null : (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => history.back()}>
            Huỷ
          </Button>

          <Button
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
            variant={isValid ? "default" : "ghost"}
            title={isValid ? "" : "Điền đủ thông tin để lưu"}
          >
            <Check className="mr-2 h-4 w-4" />
            {mode === "edit" ? "Lưu thay đổi" : "Tạo phim"}
          </Button>
        </div>
      )}

      <Modal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        type="info"
        title={dialogTitle}
        message={dialogMsg}
        onCancel={() => setConfirmOpen(false)}
        cancelText="Hủy"
        onConfirm={() => {
          handleSubmit();
          setConfirmOpen(false);
        }}
        confirmText="Xác nhận"
      />

      <Modal
        isOpen={successOpen}
        onClose={() => setSuccessOpen(false)}
        type="success"
        title={dialogTitle}
        message={dialogMsg}
        onConfirm={() => onSuccess?.()}
        confirmText="Đóng"
      />

      <Modal
        isOpen={failOpen}
        onClose={() => setFailOpen(false)}
        type="error"
        title={dialogTitle}
        message={dialogMsg}
        confirmText="Đóng"
      />
      <RefreshLoader isOpen={loading} />
    </div>
  );
}
