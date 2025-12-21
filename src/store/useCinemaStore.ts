import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CinemaStore {
    selectedCinemaId: string | null;
    selectedCinemaName: string | null;
    setSelectedCinema: (id: string, name: string) => void;
    clearSelectedCinema: () => void;
}

export const useCinemaStore = create<CinemaStore>()(
    persist(
        (set) => ({
            selectedCinemaId: null,
            selectedCinemaName: null,
            setSelectedCinema: (id, name) =>
                set({ selectedCinemaId: id, selectedCinemaName: name }),
            clearSelectedCinema: () =>
                set({ selectedCinemaId: null, selectedCinemaName: null }),
        }),
        {
            name: "cinema-store",
        }
    )
);
