// components/TrailerModal.tsx
import React, { useEffect, useMemo, useRef } from "react";
import { IoClose } from "react-icons/io5";

type TrailerModalProps = {
  /** Có thể là bất kỳ giá trị truthy/falsy; dùng !!videoOpen để hiển thị */
  videoOpen?: unknown;
  /** Nhận true/false; nếu bạn dùng setState(prev => !prev) vẫn OK */
  setVideoOpen: (open: boolean) => void;
  /** URL youtube (watch?v=, youtu.be/, hoặc đã là embed/) */
  videoUrl?: string;
};

const TrailerModal: React.FC<TrailerModalProps> = ({
  videoOpen,
  setVideoOpen,
  videoUrl,
}) => {
  const modalRef = useRef<HTMLDivElement | null>(null);

  // Chuẩn hoá URL → embed
  const embedUrl = useMemo(() => {
    const url = String(videoUrl || "");
    if (!url) return "";

    // 1) đã là /embed/
    if (/youtube\.com\/embed\//i.test(url)) return url;

    // 2) dạng watch?v=VIDEO_ID
    const vMatch = url.match(/[?&]v=([^&]+)/);
    if (vMatch?.[1]) return `https://www.youtube.com/embed/${vMatch[1]}`;

    // 3) dạng youtu.be/VIDEO_ID
    const short = url.match(/youtu\.be\/([^?]+)/);
    if (short?.[1]) return `https://www.youtube.com/embed/${short[1]}`;

    // fallback: trả về nguyên URL (đề phòng link nhúng khác)
    return url;
  }, [videoUrl]);

  // Click ngoài modal để đóng + phím ESC để đóng
  useEffect(() => {
    const handleOutsideClick = (ev: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(ev.target as Node)) {
        setVideoOpen(false);
      }
    };
    const handleEsc = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setVideoOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [setVideoOpen]);

  // không mở hoặc không có URL → không render
  if (!videoOpen || !embedUrl) return null;

  // autoplay + mute để trình duyệt cho phép tự phát
  const src = `${embedUrl}${
    embedUrl.includes("?") ? "&" : "?"
  }autoplay=1&mute=1`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      <div ref={modalRef} className="relative w-full max-w-[937px] bg-white">
        <iframe
          className="w-full h-[528px]"
          src={src}
          title="Trailer"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
        <button
          onClick={() => setVideoOpen(false)}
          className="absolute top-2 right-2 flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-white hover:bg-black"
          aria-label="Close trailer modal"
        >
          <IoClose className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
};

export default TrailerModal;
