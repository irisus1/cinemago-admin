"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Combobox, ComboboxInput, ComboboxOptions, ComboboxOption } from "@headlessui/react";
import { Search } from "lucide-react";

// --- CẤU HÌNH KEY CỦA GOONG ---
const GOONG_MAP_KEY = "YOUR_MAP_KEY_HERE"; // Key hiển thị bản đồ (Map Tiles)
const GOONG_API_KEY = "YOUR_API_KEY_HERE"; // Key tìm kiếm/Geocoding

// Fix icon lỗi mặc định của Leaflet
const DefaultIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

type LocationPickerProps = {
    address: string;
    latitude: number | null;
    longitude: number | null;
    onLocationChange: (location: { address: string; latitude: number; longitude: number }) => void;
};

// Component con để cập nhật view khi props thay đổi
function MapUpdater({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, map.getZoom());
    }, [center, map]);
    return null;
}

// Component xử lý click trên bản đồ
function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
    useMapEvents({
        click(e) {
            onClick(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

export default function LocationPickerGoong({
    address,
    latitude,
    longitude,
    onLocationChange,
}: LocationPickerProps) {
    const [query, setQuery] = useState(address);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);

    const center: [number, number] = useMemo(() => {
        if (latitude && longitude) return [latitude, longitude];
        return [10.762622, 106.660172]; // Mặc định HCM
    }, [latitude, longitude]);

    useEffect(() => {
        setQuery(address);
    }, [address]);

    // --- 1. HÀM TÌM KIẾM (AUTOCOMPLETE) ---
    const searchAddress = useCallback(async (q: string) => {
        if (!q || q.length < 2) {
            setSuggestions([]);
            return;
        }

        setLoading(true);
        try {
            // Dùng API AutoComplete của Goong
            const res = await fetch(
                `https://rsapi.goong.io/Place/AutoComplete?api_key=${GOONG_API_KEY}&input=${encodeURIComponent(q)}`
            );
            const data = await res.json();

            if (data.status === "OK") {
                setSuggestions(data.predictions);
            } else {
                setSuggestions([]);
            }
        } catch (error) {
            console.error("Lỗi tìm kiếm Goong:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => searchAddress(val), 400); // Debounce 400ms
    };

    // --- 2. HÀM LẤY CHI TIẾT TỪ GỢI Ý (PLACE DETAIL) ---
    // Khác với OSM, Goong AutoComplete chỉ trả về ID, cần gọi thêm 1 bước để lấy tọa độ
    const handleSelect = async (suggestion: any) => {
        setQuery(suggestion.description);
        setSuggestions([]);
        setLoading(true);

        try {
            const res = await fetch(
                `https://rsapi.goong.io/Place/Detail?place_id=${suggestion.place_id}&api_key=${GOONG_API_KEY}`
            );
            const data = await res.json();

            if (data.status === "OK" && data.result) {
                const { lat, lng } = data.result.geometry.location;
                const fullAddress = data.result.formatted_address || data.result.name;

                onLocationChange({
                    address: fullAddress,
                    latitude: lat,
                    longitude: lng,
                });
            }
        } catch (error) {
            console.error("Lỗi lấy chi tiết Goong:", error);
        } finally {
            setLoading(false);
        }
    };

    // --- 3. HÀM REVERSE GEOCODING (Lấy địa chỉ từ tọa độ khi click map) ---
    const handleMapAction = useCallback(async (lat: number, lng: number) => {
        onLocationChange({
            address: "Đang lấy địa chỉ...",
            latitude: lat,
            longitude: lng
        });

        try {
            const res = await fetch(
                `https://rsapi.goong.io/Geocode?latlng=${lat},${lng}&api_key=${GOONG_API_KEY}`
            );
            const data = await res.json();

            if (data.status === "OK" && data.results && data.results.length > 0) {
                const bestAddress = data.results[0].formatted_address;
                onLocationChange({
                    address: bestAddress,
                    latitude: lat,
                    longitude: lng
                });
            } else {
                onLocationChange({ address: "Không xác định", latitude: lat, longitude: lng });
            }
        } catch (error) {
            console.error("Lỗi reverse geocoding Goong:", error);
        }
    }, [onLocationChange]);

    const markerRef = useRef<L.Marker>(null);
    const eventHandlers = useMemo(() => ({
        dragend() {
            const marker = markerRef.current;
            if (marker) {
                const { lat, lng } = marker.getLatLng();
                handleMapAction(lat, lng);
            }
        },
    }), [handleMapAction]);

    return (
        <div className="space-y-4">
            {/* INPUT TÌM KIẾM */}
            <div className="relative z-[1001]">
                <label className="block text-sm font-semibold mb-1.5 text-gray-800">
                    Địa chỉ <span className="text-red-500">*</span>
                </label>
                <Combobox value={null} onChange={handleSelect}>
                    <div className="relative">
                        <div className="relative w-full overflow-hidden rounded-lg border border-gray-300 bg-white flex items-center">
                            <Search className="ml-3 h-4 w-4 text-gray-400" />
                            <ComboboxInput
                                className="w-full border-none py-2 pl-2 pr-10 text-sm outline-none focus:ring-0"
                                displayValue={() => query}
                                onChange={handleInputChange}
                                placeholder="Nhập địa chỉ (Goong Maps)..."
                            />
                            {loading && <div className="absolute right-3 top-2.5"><div className="animate-spin h-4 w-4 border-2 border-slate-500 border-t-transparent rounded-full"></div></div>}
                        </div>

                        {suggestions.length > 0 && (
                            <ComboboxOptions className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 z-[1002]">
                                {suggestions.map((item) => (
                                    <ComboboxOption
                                        key={item.place_id}
                                        value={item}
                                        className={({ active }) => `cursor-pointer select-none py-2 pl-4 pr-4 ${active ? "bg-slate-100" : ""}`}
                                    >
                                        <span className="block truncate text-sm">{item.description}</span>
                                    </ComboboxOption>
                                ))}
                            </ComboboxOptions>
                        )}
                    </div>
                </Combobox>
            </div>

            {/* BẢN ĐỒ */}
            <div className="w-full h-[300px] rounded-xl overflow-hidden border border-gray-200 shadow-sm relative z-0">
                <MapContainer center={center} zoom={15} style={{ height: "100%", width: "100%" }}>

                    {/* THAY ĐỔI QUAN TRỌNG: TILE LAYER CỦA GOONG */}
                    <TileLayer
                        attribution='&copy; Goong Maps'
                        url={`https://tiles.goong.io/assets/goong_map_web/{z}/{x}/{y}.png?api_key=${GOONG_MAP_KEY}`}
                    />

                    <MapUpdater center={center} />
                    <MapClickHandler onClick={handleMapAction} />

                    {latitude && longitude && (
                        <Marker
                            position={[latitude, longitude]}
                            draggable={true}
                            eventHandlers={eventHandlers}
                            ref={markerRef}
                        />
                    )}
                </MapContainer>
            </div>

            {/* Read-only Coords (Giữ nguyên như cũ) */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-semibold mb-1">Kinh độ</label>
                    <input value={longitude || ""} readOnly className="w-full px-3 py-2 border bg-gray-50 rounded" />
                </div>
                <div>
                    <label className="block text-sm font-semibold mb-1">Vĩ độ</label>
                    <input value={latitude || ""} readOnly className="w-full px-3 py-2 border bg-gray-50 rounded" />
                </div>
            </div>
        </div>
    );
}