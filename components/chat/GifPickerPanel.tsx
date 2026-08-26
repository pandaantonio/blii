// components/chat/GifPickerPanel.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { FaSearch, FaTimes } from "react-icons/fa";
import { GifData } from "./types";

const GIPHY_KEY =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_GIPHY_KEY) ||
  "GlVGYHkr3WSBn87g1H4F";

interface GifPickerPanelProps {
  onSelect: (gif: GifData) => void;
  onClose: () => void;
}

export default function GifPickerPanel({ onSelect, onClose }: GifPickerPanelProps) {
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<GifData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestIdRef = useRef(0);

  const searchGifs = useCallback(async (q: string) => {
    const rid = ++requestIdRef.current;
    setLoading(true);
    setError("");
    try {
      const trimmed = q.trim();
      const endpoint = trimmed
        ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(trimmed)}&limit=30&rating=pg-13&lang=pt`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_KEY}&limit=30&rating=pg-13`;
      const res = await fetch(endpoint);
      const json = await res.json();
      if (requestIdRef.current !== rid) return;
      setGifs(
        json.data
          ? json.data.map((g: any) => ({
              id: g.id,
              url: g.images?.fixed_height?.url || g.images?.original?.url,
              preview:
                g.images?.fixed_height_small?.url ||
                g.images?.preview_gif?.url ||
                g.images?.fixed_height?.url,
              title: g.title,
            }))
          : []
      );
    } catch {
      if (requestIdRef.current !== rid) return;
      setGifs([]);
      setError("N\u00e3o foi poss\u00edvel buscar GIFs");
    } finally {
      if (requestIdRef.current === rid) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchGifs(query), query.trim() ? 400 : 0);
    return () => clearTimeout(t);
  }, [query, searchGifs]);

  return (
    <div
      data-gif-panel
      className="absolute bottom-[60px] left-4 z-50 w-[400px] max-h-[400px] bg-[#2b2d31] border border-[#1e1f22] rounded-[8px] shadow-[0_8px_24px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden"
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#1e1f22] flex-shrink-0">
        <div className="flex-1 relative">
          <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6d6f78] text-xs" />
          <input
            type="text"
            placeholder="Buscar GIFs..."
            className="w-full h-8 pl-7 pr-2.5 bg-[#1e1f22] border border-[#1e1f22] rounded-[4px] text-[#dbdee1] text-sm font-inherit outline-none min-w-0 placeholder:text-[#6d6f78] focus:border-[#5865f2]"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
        <button
          type="button"
          className="flex items-center justify-center w-6 h-6 bg-transparent border-none rounded-[4px] text-[#b5bac1] text-xs cursor-pointer transition-colors duration-100 hover:bg-[#35373c] hover:text-[#f2f3f5]"
          onClick={onClose}
        >
          <FaTimes />
        </button>
      </div>

      {!query.trim() && !loading && gifs.length > 0 && (
        <p className="m-0 px-3 pt-2 text-[0.7rem] font-bold text-[#b5bac1] uppercase tracking-wide">
          {"\u{1F525}"} Em alta agora
        </p>
      )}

      <div className="grid grid-cols-3 gap-1 p-2 overflow-y-auto flex-1 min-h-[140px]">
        {loading ? (
          <div className="col-span-3 text-center py-6 text-[#b5bac1] text-sm">
            Carregando GIFs...
          </div>
        ) : error ? (
          <div className="col-span-3 text-center py-6 text-[#b5bac1] text-sm">{error}</div>
        ) : gifs.length === 0 ? (
          <div className="col-span-3 text-center py-6 text-[#b5bac1] text-sm">
            {query.trim()
              ? `Nenhum GIF para "${query.trim()}"`
              : "Nenhum GIF encontrado"}
          </div>
        ) : (
          gifs.map((g) => (
            <button
              key={g.id}
              type="button"
              className="relative aspect-square border-none rounded-[4px] overflow-hidden p-0 cursor-pointer bg-[#1e1f22] transition-all duration-100 hover:scale-[1.03] hover:shadow-[0_0_0_2px_#5865f2]"
              onClick={() => onSelect(g)}
              title={g.title}
            >
              <img
                src={g.preview || g.url}
                alt={g.title}
                className="w-full h-full object-cover block"
                loading="lazy"
              />
            </button>
          ))
        )}
      </div>
      <p className="m-0 px-3 pb-1.5 text-[0.6rem] text-[#6d6f78] text-right flex-shrink-0">
        Powered by GIPHY
      </p>
    </div>
  );
}