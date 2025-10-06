// "use client";

// import { useEffect, useMemo, useState } from "react";
// import { FiSearch, FiX } from "react-icons/fi";
// import { Combobox } from "@headlessui/react";
// import slugify from "slugify";
// import SuccessDialog from "@/components/SuccessDialog";
// import ConfirmDialog from "@/components/ConfirmDialog";
// import RefreshLoader from "@/components/Loading";
// import { addMovie, updateMovie, getAllGenres } from "@/services/MovieService";
// import slugifyOption from "@/utils/slugifyOption";

// type Film = {
//   id?: number | string;
//   name: string;
//   trailerUrl?: string;
//   thumbnailUrl?: string;
//   tagIds?: (number | string)[];
//   duration: number | string;
//   ageRestriction: string;
//   voice: string;
//   originatedCountry: string;
//   is3D: boolean;
//   description: string;
//   content: string;
//   beginDate: string; // YYYY-MM-DD
// };

// type Tag = { id: number | string; name: string };

// type Props = {
//   mode: "create" | "edit";
//   film?: Film;
//   onSuccess?: () => void;
// };

// export default function FilmForm({ mode, film, onSuccess }: Props) {
//   const isEdit = mode === "edit";
//   const title = isEdit ? "Cập nhật nội dung phim" : "Thêm mới phim";

//   // ----- Age data (mock) -----
//   const [ageResData] = useState([
//     { id: 1, symbol: "P", description: "Phổ biến cho mọi lứa tuổi" },
//     { id: 2, symbol: "K", description: "Dành cho trẻ em" },
//     { id: 3, symbol: "C", description: "Cấm trẻ em dưới 13 tuổi" },
//     { id: 4, symbol: "T13", description: "Trên 13 tuổi" },
//     { id: 5, symbol: "T16", description: "Trên 16 tuổi" },
//     { id: 6, symbol: "T18", description: "Trên 18 tuổi" },
//   ]);

//   // ----- Tags -----
//   const [allTags, setAllTags] = useState<Tag[]>([]);
//   const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
//   const [tagQuery, setTagQuery] = useState("");

//   useEffect(() => {
//     (async () => {
//       try {
//         const res = await getAllGenres();
//         const list: Tag[] = res?.data?._embedded?.tagResponseDtoList ?? [];
//         setAllTags(list);

//         // init selected tags in edit mode
//         if (isEdit && film?.tagIds?.length) {
//           const preset = list.filter((t) => film.tagIds!.includes(t.id));
//           setSelectedTags(preset);
//         }
//       } catch (e) {
//         console.error("getAllTags error:", e);
//       }
//     })();
//   }, [isEdit, film?.tagIds]);

//   const filteredTags =
//     tagQuery === ""
//       ? allTags
//       : allTags.filter((t) =>
//           slugify(t.name, slugifyOption).includes(
//             slugify(tagQuery, slugifyOption)
//           )
//         );

//   const addTag = (tag: Tag | null) => {
//     if (!tag) return;
//     if (!selectedTags.some((x) => x.id === tag.id)) {
//       setSelectedTags((prev) => [...prev, tag]);
//     }
//   };

//   const removeTag = (tag: Tag) => {
//     setSelectedTags((prev) => prev.filter((x) => x.id !== tag.id));
//   };

//   // ----- Form state -----
//   const [form, setForm] = useState({
//     name: film?.name ?? "",
//     originatedCountry: film?.originatedCountry ?? "",
//     ageRestriction: film?.ageRestriction ?? "",
//     filmDuration: film?.duration ?? "",
//     voice: film?.voice ?? "",
//     twoDthreeD: film?.is3D ? "2D, 3D" : film ? "2D" : "",
//     beginDate: film?.beginDate
//       ? film.beginDate.includes("T")
//         ? film.beginDate.split("T")[0]
//         : film.beginDate
//       : "",
//     filmDescription: film?.description ?? "",
//     filmContent: film?.content ?? "",

//     // Media
//     thumbnailUrl: film?.thumbnailUrl ?? "",
//     thumbnailFile: null as File | null,

//     trailerUrl: film?.trailerUrl ?? "",
//     trailerFile: null as File | null,
//   });

//   // keep tagIds in sync
//   const tagIds = useMemo(() => selectedTags.map((t) => t.id), [selectedTags]);

//   // ----- Validation -----
//   const isValid = useMemo(() => {
//     const required =
//       form.name &&
//       (form.thumbnailUrl || form.thumbnailFile) &&
//       (form.trailerUrl || form.trailerFile) &&
//       tagIds.length > 0 &&
//       form.filmDuration &&
//       form.ageRestriction &&
//       form.voice &&
//       form.originatedCountry &&
//       form.twoDthreeD &&
//       form.filmDescription &&
//       form.filmContent &&
//       form.beginDate;
//     return Boolean(required);
//   }, [form, tagIds]);

//   // ----- Dialogs & loading -----
//   const [confirmOpen, setConfirmOpen] = useState(false);
//   const [successOpen, setSuccessOpen] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [dialogTitle, setDialogTitle] = useState("");
//   const [dialogMsg, setDialogMsg] = useState<React.ReactNode>("");

//   const openSubmitConfirm = () => {
//     setDialogTitle(
//       isEdit ? "Xác nhận cập nhật thông tin phim" : "Xác nhận thêm mới phim"
//     );
//     setDialogMsg(isEdit ? "Cập nhật thông tin phim?" : "Thêm mới phim?");
//     setConfirmOpen(true);
//   };

//   // ----- Submit -----
//   const handleSubmit = async () => {
//     try {
//       setConfirmOpen(false);
//       setLoading(true);

//       // 1) Upload files nếu có
//       //   let thumbnailUrl = form.thumbnailUrl;
//       //   if (form.thumbnailFile) {
//       //     const upThumb = await uploadThumbnail(form.thumbnailFile);
//       //     thumbnailUrl = upThumb?.data?.url ?? upThumb?.url ?? thumbnailUrl;
//       //   }

//       //   let trailerUrl = form.trailerUrl;
//       //   if (form.trailerFile) {
//       //     const upTrailer = await uploadTrailer(form.trailerFile);
//       //     trailerUrl = upTrailer?.data?.url ?? upTrailer?.url ?? trailerUrl;
//       //   }

//       // 2) Build payload
//       const payload = {
//         name: form.name,
//         trailerUrl,
//         thumbnailUrl,
//         tagIds,
//         duration: Number(form.filmDuration),
//         ageRestriction: form.ageRestriction,
//         voice: form.voice,
//         originatedCountry: form.originatedCountry,
//         is3D: form.twoDthreeD.includes("3D"),
//         description: form.filmDescription,
//         content: form.filmContent,
//         beginDate: form.beginDate,
//       };

//       // 3) Call API
//       if (isEdit && film?.id != null) {
//         await updateMovie(film.id, payload);
//         setDialogTitle("Thành công");
//         setDialogMsg("Cập nhật phim thành công");
//       } else {
//         await addMovie(payload);
//         setDialogTitle("Thành công");
//         setDialogMsg("Thêm phim thành công");
//       }

//       setSuccessOpen(true);
//     } catch (e) {
//       console.error(e);
//       setDialogTitle("Lỗi");
//       setDialogMsg("Thao tác thất bại. Vui lòng thử lại.");
//       setSuccessOpen(true); // có thể chuyển sang FailedDialog nếu muốn
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="max-w-5xl mx-auto py-6">
//       <div className="flex justify-between items-center mb-6">
//         <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
//       </div>

//       <div className="flex gap-6">
//         {/* LEFT */}
//         <div className="flex-1 space-y-4">
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Tên phim
//             </label>
//             <input
//               type="text"
//               value={form.name}
//               onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
//               className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
//             />
//           </div>

//           {/* Tags */}
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Thể loại (tags)
//             </label>
//             <Combobox value={null} onChange={addTag}>
//               <div className="relative">
//                 <div className="relative w-full overflow-hidden rounded-lg bg-white text-left border focus-within:ring-2 focus-within:ring-blue-500">
//                   <Combobox.Input
//                     className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:outline-none"
//                     onChange={(e) => setTagQuery(e.target.value)}
//                     displayValue={() => ""}
//                     placeholder="Tìm tag…"
//                   />
//                   <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
//                     <FiSearch className="h-5 w-5 text-gray-400" />
//                   </Combobox.Button>
//                 </div>
//                 <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-10">
//                   {filteredTags.length === 0 && tagQuery !== "" ? (
//                     <div className="cursor-default select-none py-2 px-4 text-gray-700">
//                       Không tìm thấy kết quả
//                     </div>
//                   ) : (
//                     filteredTags.map((tag) => (
//                       <Combobox.Option
//                         key={tag.id}
//                         className={({ active }) =>
//                           `cursor-default select-none py-2 pl-10 pr-4 ${
//                             active ? "bg-blue-600 text-white" : "text-gray-900"
//                           }`
//                         }
//                         value={tag}
//                       >
//                         {tag.name}
//                       </Combobox.Option>
//                     ))
//                   )}
//                 </Combobox.Options>
//               </div>
//             </Combobox>

//             <div className="mt-2 flex flex-wrap gap-2">
//               {selectedTags.map((tag) => (
//                 <span
//                   key={tag.id}
//                   className="inline-flex items-center bg-blue-100 text-blue-800 rounded-full px-3 py-1 text-sm"
//                 >
//                   {tag.name}
//                   <button
//                     onClick={() => removeTag(tag)}
//                     className="ml-2 text-blue-600 hover:text-blue-800"
//                     type="button"
//                   >
//                     <FiX className="w-4 h-4" />
//                   </button>
//                 </span>
//               ))}
//             </div>
//           </div>

//           {/* Country */}
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Quốc gia
//             </label>
//             <input
//               type="text"
//               value={form.originatedCountry}
//               onChange={(e) =>
//                 setForm((p) => ({ ...p, originatedCountry: e.target.value }))
//               }
//               className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
//             />
//           </div>

//           {/* Age */}
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Độ tuổi
//             </label>
//             <select
//               value={form.ageRestriction || ""}
//               onChange={(e) =>
//                 setForm((p) => ({ ...p, ageRestriction: e.target.value }))
//               }
//               className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
//             >
//               <option value="" disabled>
//                 Vui lòng chọn độ tuổi
//               </option>
//               {ageResData.map((a) => (
//                 <option key={a.id} value={a.symbol}>
//                   {a.symbol}
//                 </option>
//               ))}
//             </select>
//           </div>

//           {/* Duration */}
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Thời lượng (phút)
//             </label>
//             <input
//               inputMode="numeric"
//               value={form.filmDuration}
//               onChange={(e) =>
//                 setForm((p) => ({ ...p, filmDuration: e.target.value }))
//               }
//               className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
//             />
//           </div>

//           {/* Voice */}
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Âm thanh
//             </label>
//             <input
//               value={form.voice}
//               onChange={(e) =>
//                 setForm((p) => ({ ...p, voice: e.target.value }))
//               }
//               className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
//             />
//           </div>

//           {/* 2D/3D */}
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Dạng
//             </label>
//             <select
//               value={form.twoDthreeD || ""}
//               onChange={(e) =>
//                 setForm((p) => ({ ...p, twoDthreeD: e.target.value }))
//               }
//               className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
//             >
//               <option value="" disabled>
//                 Vui lòng chọn dạng
//               </option>
//               <option value="2D">2D</option>
//               <option value="2D, 3D">2D, 3D</option>
//             </select>
//           </div>

//           {/* Begin date */}
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Ngày khởi chiếu
//             </label>
//             <input
//               type="date"
//               value={form.beginDate}
//               onChange={(e) =>
//                 setForm((p) => ({ ...p, beginDate: e.target.value }))
//               }
//               className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
//             />
//           </div>
//         </div>

//         {/* RIGHT: Media */}
//         <div className="w-1/3 space-y-4">
//           {/* Thumbnail */}
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Ảnh poster / thumbnail
//             </label>
//             {form.thumbnailUrl && (
//               <img
//                 src={form.thumbnailUrl}
//                 alt="Thumbnail"
//                 className="w-full h-64 object-cover rounded-lg mb-2"
//               />
//             )}
//             <input
//               type="file"
//               accept="image/*"
//               onChange={(e) => {
//                 const file = e.target.files?.[0] ?? null;
//                 if (!file) return;
//                 const url = URL.createObjectURL(file);
//                 setForm((p) => ({
//                   ...p,
//                   thumbnailFile: file,
//                   thumbnailUrl: url,
//                 }));
//               }}
//               className="w-full"
//             />
//           </div>

//           {/* Trailer file */}
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Trailer (file video)
//             </label>
//             {form.trailerFile ? (
//               <div className="text-sm text-gray-700 mb-2">
//                 File:{" "}
//                 <span className="font-medium">{form.trailerFile.name}</span>
//               </div>
//             ) : form.trailerUrl ? (
//               <video
//                 src={form.trailerUrl}
//                 controls
//                 className="w-full h-48 rounded-lg mb-2"
//               />
//             ) : null}
//             <input
//               type="file"
//               accept="video/*"
//               onChange={(e) => {
//                 const file = e.target.files?.[0] ?? null;
//                 if (!file) return;
//                 const url = URL.createObjectURL(file);
//                 setForm((p) => ({ ...p, trailerFile: file, trailerUrl: url }));
//               }}
//               className="w-full"
//             />
//           </div>
//         </div>
//       </div>

//       {/* Text areas */}
//       <div className="mt-4">
//         <label className="block text-sm font-medium text-gray-700 mb-1">
//           Trailer ghi chú (tùy chọn)
//         </label>
//         <input
//           type="text"
//           disabled
//           value="(Đã chuyển sang upload file trailer)"
//           className="w-full px-3 py-2 border rounded-lg bg-gray-100 text-gray-500"
//         />
//       </div>

//       <div className="mt-4">
//         <label className="block text-sm font-medium text-gray-700 mb-1">
//           Mô tả phim
//         </label>
//         <textarea
//           value={form.filmDescription}
//           onChange={(e) =>
//             setForm((p) => ({ ...p, filmDescription: e.target.value }))
//           }
//           rows={4}
//           className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
//         />
//       </div>

//       <div className="mt-4">
//         <label className="block text-sm font-medium text-gray-700 mb-1">
//           Nội dung phim
//         </label>
//         <textarea
//           value={form.filmContent}
//           onChange={(e) =>
//             setForm((p) => ({ ...p, filmContent: e.target.value }))
//           }
//           rows={4}
//           className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
//         />
//       </div>

//       {/* Actions */}
//       <div className="flex justify-end gap-3 mt-6">
//         <button
//           type="button"
//           onClick={() => history.back()}
//           className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
//         >
//           Hủy
//         </button>
//         <button
//           type="button"
//           onClick={openSubmitConfirm}
//           disabled={!isValid}
//           className={`px-4 py-2 rounded-lg text-white ${
//             isValid
//               ? "bg-blue-600 hover:bg-blue-700"
//               : "bg-gray-400 cursor-not-allowed"
//           }`}
//         >
//           {isEdit ? "Lưu thay đổi" : "Thêm phim"}
//         </button>
//       </div>

//       {/* Dialogs */}
//       <ConfirmDialog
//         isOpen={confirmOpen}
//         onClose={() => setConfirmOpen(false)}
//         onConfirm={handleSubmit}
//         title={dialogTitle}
//         message={dialogMsg}
//       />
//       <SuccessDialog
//         isOpen={successOpen}
//         onClose={() => {
//           setSuccessOpen(false);
//           onSuccess?.();
//         }}
//         title={dialogTitle}
//         message={dialogMsg}
//       />
//       <RefreshLoader isOpen={loading} />
//     </div>
//   );
// }

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

export default function FilmForm() {
  // ----------- Genres -----------
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<Genre[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await getAllGenres();
        // tuỳ payload của bạn, chuẩn hoá thành mảng Genre
        const list: Genre[] =
          res?.data?._embedded?.tagResponseDtoList ??
          res?.data?.data ??
          res?.data ??
          [];
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

  // ----------- Form state -----------
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [releaseDate, setReleaseDate] = useState(""); // YYYY-MM-DD
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [trailerFile, setTrailerFile] = useState<File | null>(null);

  // preview
  const [thumbnailPreview, setThumbnailPreview] = useState<string>("");
  const [trailerPreview, setTrailerPreview] = useState<string>("");

  const isValid =
    title &&
    description &&
    duration &&
    releaseDate &&
    genreIdsCsv &&
    thumbnailFile &&
    trailerFile;

  // ----------- Dialogs / Loading -----------
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMsg, setDialogMsg] = useState<React.ReactNode>("");

  const handleSubmit = async () => {
    try {
      setConfirmOpen(false);
      setLoading(true);

      // BE sẽ tự upload 2 file này ⇒ chỉ cần append đúng key
      const fd = new FormData();
      fd.append("title", title);
      fd.append("description", description);
      fd.append("duration", String(Number(duration))); // BE parse number
      fd.append("releaseDate", releaseDate); // "YYYY-MM-DD"
      fd.append("genresIds", genreIdsCsv); // "id1,id2,id3"
      if (thumbnailFile) fd.append("thumbnail", thumbnailFile);
      if (trailerFile) fd.append("trailer", trailerFile);

      await addMovie(fd);

      setDialogTitle("Thành công");
      setDialogMsg("Thêm phim thành công");
      setSuccessOpen(true);
      // TODO: reset form nếu cần
    } catch (e: any) {
      console.error(e);
      setDialogTitle("Lỗi");
      setDialogMsg(
        e?.response?.data?.message ||
          "Thao tác thất bại. Vui lòng kiểm tra dữ liệu và thử lại."
      );
      setSuccessOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6">
      <h2 className="text-2xl font-bold mb-6">Thêm mới phim</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* LEFT (2 cols) */}
        <div className="md:col-span-2 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Tiêu đề (title)
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Ví dụ: Thám tử lừng danh Conan"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Mô tả (description)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Thời lượng (duration, phút)
              </label>
              <input
                inputMode="numeric"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="95"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">
                Ngày phát hành (releaseDate)
              </label>
              <input
                type="date"
                value={releaseDate}
                onChange={(e) => setReleaseDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          {/* Genres combobox (multi-select) */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Thể loại (genresIds)
            </label>
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
                <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-10">
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

            {/* selected chips */}
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

            {/* hint: BE expects CSV */}
            <p className="text-xs text-gray-500 mt-1">
              Sẽ gửi: <code>genresIds="{genreIdsCsv}"</code>
            </p>
          </div>
        </div>

        {/* RIGHT (files) */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Thumbnail (file)
            </label>
            {thumbnailPreview && (
              <img
                src={thumbnailPreview}
                alt="preview"
                className="w-full h-56 object-cover rounded-lg mb-2"
              />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setThumbnailFile(f);
                setThumbnailPreview(f ? URL.createObjectURL(f) : "");
              }}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Trailer (file)
            </label>
            {trailerPreview && (
              <video
                src={trailerPreview}
                controls
                className="w-full h-40 rounded-lg mb-2"
              />
            )}
            <input
              type="file"
              accept="video/*"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setTrailerFile(f);
                setTrailerPreview(f ? URL.createObjectURL(f) : "");
              }}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 mt-6">
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
            setDialogTitle("Xác nhận thêm mới phim");
            setDialogMsg("Thêm phim?");
            setConfirmOpen(true);
          }}
          className={`px-4 py-2 rounded-lg text-white ${
            isValid
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-gray-400 cursor-not-allowed"
          }`}
        >
          Thêm phim
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
