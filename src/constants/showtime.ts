export const LANGUAGE_OPTIONS = [
  { value: "English", label: "Tiếng Anh" },
  { value: "Vietnamese", label: "Tiếng Việt" },
  { value: "Korean", label: "Tiếng Hàn" },
  { value: "Japanese", label: "Tiếng Nhật" },
] as const;

export const LANGUAGE_LABEL_MAP: Record<string, string> =
  LANGUAGE_OPTIONS.reduce((acc, cur) => {
    acc[cur.value] = cur.label;
    return acc;
  }, {} as Record<string, string>);
