import React, { useMemo, useState } from "react";
import Image from "next/image";
import {
  FaTag,
  FaRegClock,
  FaGlobeAmericas,
  FaCommentDots,
} from "react-icons/fa";
import { FaRegCirclePlay } from "react-icons/fa6";
import TrailerModal from "./TrailerModal";

type MovieCardProps = {
  filmId?: string | number;
  imageUrl?: string;
  name?: string;
  type?: string[] | string | null | undefined;
  duration?: number | string;
  ageLimit?: string;
  isShowing?: unknown;
  trailerURL?: string;
  twoDthreeD?: string[] | null | undefined;
  languages?: string[] | string | null | undefined;
  subtitle?: unknown;
  onSelect?: (movieId?: string | number) => void;
};

const FALLBACK_POSTER =
  "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=1200&auto=format&fit=crop";

const MovieCard: React.FC<MovieCardProps> = ({
  filmId,
  imageUrl,
  name,
  type,
  duration,
  ageLimit,
  isShowing,
  trailerURL,
  twoDthreeD,
  languages,
  subtitle,
  onSelect,
}) => {
  const linkDetail = `/admin/ticket/${filmId ?? ""}`;
  const [videoOpen, setVideoOpen] = useState(false);

  const formatFlags = useMemo(
    () => (Array.isArray(twoDthreeD) ? twoDthreeD.map(String) : []),
    [twoDthreeD],
  );

  const typeText = useMemo(() => {
    if (!type) return "";
    return Array.isArray(type) ? type.filter(Boolean).join(", ") : String(type);
  }, [type]);

  const languageText = useMemo(() => {
    if (!languages) return "";
    return Array.isArray(languages)
      ? languages.filter(Boolean).map(String).join(", ")
      : String(languages);
  }, [languages]);

  const subtitleText = useMemo(() => (subtitle ? "Có" : "Không"), [subtitle]);

  return (
    <div className="flex flex-wrap justify-center gap-6 p-2 text-[0.7rem]">
      <div className="group flex w-[300px] flex-col items-start gap-2">
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl border border-gray-300 shadow-md transition duration-300 hover:shadow-lg">
          {/* <img
            src={imageUrl || FALLBACK_POSTER}
            alt={name || "Movie Poster"}
            className="h-full w-full object-cover"
          /> */}
          <Image
            src={imageUrl || FALLBACK_POSTER}
            alt={name || "Movie Poster"}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 300px"
            priority={false}
          />

          <div className="absolute left-0 top-0 flex items-center transition-transform duration-300 ease-in-out sm:group-hover:-translate-y-full">
            <div className="flex flex-wrap">
              {formatFlags.map((fmt) => {
                let badgeClass =
                  "flex h-[45px] w-[46px] items-center justify-center shadow-md ";
                let spanClass = "rounded-md border-2 p-0.5 text-xs font-bold ";

                switch (fmt.toUpperCase()) {
                  case "2D":
                    badgeClass += "bg-[#FF9933]";
                    spanClass += "border-black text-black";
                    break;
                  case "3D":
                    badgeClass += "bg-[#663399]";
                    spanClass += "border-white text-white";
                    break;
                  case "IMAX":
                    badgeClass += "bg-[#0054A6]";
                    spanClass += "border-white text-white";
                    break;
                  case "4DX":
                    badgeClass += "bg-black";
                    spanClass += "border-[#DA291C] text-[#DA291C]";
                    break;
                  default:
                    badgeClass += "bg-gray-800";
                    spanClass += "border-gray-200 text-white";
                }

                return (
                  <div key={fmt} className={badgeClass}>
                    <span className={spanClass}>{fmt}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            onClick={() => setVideoOpen(true)}
            className="absolute inset-0 z-10 hidden items-center justify-center bg-black/70 text-center opacity-0 transition-opacity duration-300 sm:flex sm:group-hover:opacity-100 text-[#F3EA28]"
          >
            <div className="flex w-full max-w-[85%] flex-col items-start justify-start space-y-4 px-6 text-left">
              <h3 className="mb-2 text-xl">{name}</h3>

              {typeText && (
                <p className="mt-2 flex items-center text-sm">
                  <FaTag className="mr-2 h-5 w-5 align-middle" />
                  {typeText}
                </p>
              )}

              {duration ? (
                <p className="mt-2 flex items-center text-sm">
                  <FaRegClock className="mr-2 h-5 w-5 align-middle" />
                  {typeof duration === "number" ? `${duration} phút` : duration}
                </p>
              ) : null}

              {languageText && (
                <p className="mt-2 flex items-center text-sm">
                  <FaGlobeAmericas className="mr-2 h-5 w-5 align-middle" />
                  Ngôn ngữ: {languageText}
                </p>
              )}

              <p className="mt-2 flex items-center text-sm">
                <FaCommentDots className="mr-2 h-5 w-5 align-middle" />
                Phụ đề: {subtitleText}
              </p>
            </div>
          </div>
        </div>

        <div className="w-full">
          <a
            href={onSelect ? undefined : linkDetail}
            onClick={onSelect ? () => onSelect(filmId) : undefined}
            className="mt-3 line-clamp-2 h-[48px] cursor-pointer text-center text-lg font-bold text-black"
          >
            {name} {ageLimit ? `(${ageLimit})` : ""}
          </a>

          <div className=" flex items-center justify-between text-base">
            <button
              className="hidden items-center sm:flex cursor-pointer"
              onClick={() => setVideoOpen(true)}
            >
              <div className="mr-2 flex items-center justify-center ">
                <FaRegCirclePlay className="h-[31px] w-[31px] rounded-full bg-[#d9d9d9] text-[#fe1e3e]" />
              </div>
              <span className="border-b-2 text-black">Xem trailer</span>
            </button>

            <TrailerModal
              videoOpen={videoOpen}
              setVideoOpen={setVideoOpen}
              videoUrl={trailerURL}
            />

            <button
              className="h-[42px] w-full rounded-md bg-gray-900 text-white sm:w-[132px] cursor-pointer"
              onClick={onSelect ? () => onSelect(filmId) : undefined}
            >
              {isShowing ? "Đặt vé" : "Tìm hiểu thêm"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovieCard;
