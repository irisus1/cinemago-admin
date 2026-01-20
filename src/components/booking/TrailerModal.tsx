import React, { useEffect, useMemo, useRef } from "react";
import { IoClose } from "react-icons/io5";

type TrailerModalProps = {
  videoOpen?: unknown;
  setVideoOpen: (open: boolean) => void;
  videoUrl?: string;
};

const TrailerModal: React.FC<TrailerModalProps> = ({
  videoOpen,
  setVideoOpen,
  videoUrl,
}) => {
  const modalRef = useRef<HTMLDivElement | null>(null);

  const embedUrl = useMemo(() => {
    const url = String(videoUrl || "");
    if (!url) return "";

    if (/youtube\.com\/embed\//i.test(url)) return url;

    const vMatch = url.match(/[?&]v=([^&]+)/);
    if (vMatch?.[1]) return `https://www.youtube.com/embed/${vMatch[1]}`;

    const short = url.match(/youtu\.be\/([^?]+)/);
    if (short?.[1]) return `https://www.youtube.com/embed/${short[1]}`;

    return url;
  }, [videoUrl]);

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

  if (!videoOpen || !embedUrl) return null;

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
