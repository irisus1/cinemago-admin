"use client";

import { useState, useEffect, useCallback, useRef } from "react";
// @ts-expect-error - goong-js does not have typescript definitions
import goongjs from "@goongmaps/goong-js";
import "@goongmaps/goong-js/dist/goong-js.css";
import {
  Combobox,
  ComboboxInput,
  ComboboxOptions,
  ComboboxOption,
} from "@headlessui/react";
import { Search } from "lucide-react";

const GOONG_MAP_KEY = "vWzybQJmMT6Yn988JBpsM6Wqlhkjs7amXTonI1uH";
const GOONG_API_KEY = "890XAVnVoyi0Ghl8TviAJQr8azO82tc6cz3sYKVr";

type LocationPickerProps = {
  address: string;
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (location: {
    address: string;
    latitude: number;
    longitude: number;
  }) => void;
};

interface GoongSuggestion {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface GoongGeocodeResult {
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  place_id: string;
  name: string;
}

interface GoongMap {
  addControl: (control: unknown) => void;
  on: (event: string, callback: (e: GoongMapEvent) => void) => void;
  remove: () => void;
  flyTo: (options: {
    center: [number, number];
    zoom: number;
    essential: boolean;
  }) => void;
}

interface GoongMarker {
  setLngLat: (lnglat: [number, number]) => GoongMarker;
  addTo: (map: GoongMap) => GoongMarker;
  on: (event: string, callback: () => void) => void;
  getLngLat: () => { lng: number; lat: number };
}

interface GoongMapEvent {
  lngLat: {
    lng: number;
    lat: number;
  };
}

export default function LocationPickerGoong({
  address,
  latitude,
  longitude,
  onLocationChange,
}: LocationPickerProps) {
  const [query, setQuery] = useState(address);
  const [suggestions, setSuggestions] = useState<GoongSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GoongMap | null>(null);
  const markerRef = useRef<GoongMarker | null>(null);

  useEffect(() => {
    if (mapRef.current) return;

    goongjs.accessToken = GOONG_MAP_KEY;

    const defaultLng = longitude || 106.660172;
    const defaultLat = latitude || 10.762622;

    const map = new goongjs.Map({
      container: mapContainerRef.current!,
      style: "https://tiles.goong.io/assets/goong_map_web.json",
      center: [defaultLng, defaultLat],
      zoom: 12,
    }) as GoongMap;

    map.addControl(new goongjs.NavigationControl());

    mapRef.current = map;

    if (longitude && latitude) {
      const marker = new goongjs.Marker({ draggable: true })
        .setLngLat([longitude, latitude])
        .addTo(map) as GoongMarker;

      marker.on("dragend", onDragEnd);
      markerRef.current = marker;
    }

    map.on("click", (e: GoongMapEvent) => {
      const { lng, lat } = e.lngLat;
      updateMarker(lng, lat);
      handleMapAction(lat, lng);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setQuery(address);
  }, [address]);

  const updateMarker = (lng: number, lat: number) => {
    if (!mapRef.current) return;

    if (!markerRef.current) {
      const marker = new goongjs.Marker({ draggable: true })
        .setLngLat([lng, lat])
        .addTo(mapRef.current) as GoongMarker;
      marker.on("dragend", onDragEnd);
      markerRef.current = marker;
    } else {
      markerRef.current.setLngLat([lng, lat]);
    }
  };

  const onDragEnd = () => {
    if (markerRef.current) {
      const lngLat = markerRef.current.getLngLat();
      handleMapAction(lngLat.lat, lngLat.lng);
    }
  };

  const searchAddress = useCallback(async (q: string) => {
    if (!q || q.length < 2) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `https://rsapi.goong.io/Place/AutoComplete?api_key=${GOONG_API_KEY}&input=${encodeURIComponent(
          q,
        )}`,
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
    debounceTimer.current = setTimeout(() => searchAddress(val), 400);
  };

  const handleSelect = async (suggestion: GoongSuggestion | null) => {
    if (!suggestion) return;
    setQuery(suggestion.description);
    setSuggestions([]);
    setLoading(true);

    try {
      const res = await fetch(
        `https://rsapi.goong.io/Place/Detail?place_id=${suggestion.place_id}&api_key=${GOONG_API_KEY}`,
      );
      const data = await res.json();

      if (data.status === "OK" && data.result) {
        const result = data.result as GoongGeocodeResult;
        const { lat, lng } = result.geometry.location;
        const fullAddress = result.formatted_address || result.name;

        onLocationChange({
          address: fullAddress,
          latitude: lat,
          longitude: lng,
        });

        if (mapRef.current) {
          mapRef.current.flyTo({
            center: [lng, lat],
            zoom: 15,
            essential: true,
          });
          updateMarker(lng, lat);
        }
      }
    } catch (error) {
      console.error("Lỗi lấy chi tiết Goong:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMapAction = useCallback(
    async (lat: number, lng: number) => {
      onLocationChange({
        address: "Đang lấy địa chỉ...",
        latitude: lat,
        longitude: lng,
      });

      try {
        const res = await fetch(
          `https://rsapi.goong.io/Geocode?latlng=${lat},${lng}&api_key=${GOONG_API_KEY}`,
        );
        const data = await res.json();

        if (data.status === "OK" && data.results && data.results.length > 0) {
          const bestAddress = data.results[0].formatted_address;
          onLocationChange({
            address: bestAddress,
            latitude: lat,
            longitude: lng,
          });
          setQuery(bestAddress);
        } else {
          onLocationChange({
            address: "Không xác định",
            latitude: lat,
            longitude: lng,
          });
        }
      } catch (error) {
        console.error("Lỗi reverse geocoding Goong:", error);
      }
    },
    [onLocationChange],
  );

  return (
    <div className="space-y-4">
      <div className="relative z-[1001]">
        <label className="block text-sm font-semibold mb-1.5 text-gray-800">
          Địa chỉ <span className="text-red-500">*</span>
        </label>
        <Combobox
          value={null as GoongSuggestion | null}
          onChange={handleSelect}
        >
          <div className="relative">
            <div className="relative w-full overflow-hidden rounded-lg border border-gray-300 bg-white flex items-center">
              <Search className="ml-3 h-4 w-4 text-gray-400" />
              <ComboboxInput
                className="w-full border-none py-2 pl-2 pr-10 text-sm outline-none focus:ring-0"
                displayValue={() => query}
                onChange={handleInputChange}
                placeholder="Nhập địa chỉ (Goong Maps)..."
              />
              {loading && (
                <div className="absolute right-3 top-2.5">
                  <div className="animate-spin h-4 w-4 border-2 border-slate-500 border-t-transparent rounded-full"></div>
                </div>
              )}
            </div>

            {suggestions.length > 0 && (
              <ComboboxOptions className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 z-[1002]">
                {suggestions.map((item) => (
                  <ComboboxOption
                    key={item.place_id}
                    value={item}
                    className={({ active }) =>
                      `cursor-pointer select-none py-2 pl-4 pr-4 ${
                        active ? "bg-slate-100" : ""
                      }`
                    }
                  >
                    <span className="block truncate text-sm">
                      {item.description}
                    </span>
                  </ComboboxOption>
                ))}
              </ComboboxOptions>
            )}
          </div>
        </Combobox>
      </div>

      <div className="w-full h-[300px] rounded-xl overflow-hidden border border-gray-200 shadow-sm relative z-0">
        <div ref={mapContainerRef} className="w-full h-full" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Kinh độ</label>
          <input
            value={longitude || ""}
            readOnly
            className="w-full px-3 py-2 border bg-gray-50 rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Vĩ độ</label>
          <input
            value={latitude || ""}
            readOnly
            className="w-full px-3 py-2 border bg-gray-50 rounded"
          />
        </div>
      </div>
    </div>
  );
}
