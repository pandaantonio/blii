// components/ProfilePictureUpload.tsx
"use client";

import { useState, useCallback } from "react";
import { FaLink, FaSpinner, FaTrash, FaCheck } from "react-icons/fa";

interface Props {
  currentPhotoURL: string | null;
  onUpdate: (url: string | null) => void;
  size?: number;
}

export default function ProfilePictureUpload({
  currentPhotoURL,
  onUpdate,
  size = 88,
}: Props) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;

    try {
      new URL(trimmed);
    } catch {
      setError("URL inválida");
      return;
    }

    setLoading(true);
    setError(null);

    // Verifica se a imagem carrega
    const img = new Image();
    img.onload = () => {
      onUpdate(trimmed);
      setInput("");
      setLoading(false);
    };
    img.onerror = () => {
      setError("Imagem não encontrada ou bloqueada");
      setLoading(false);
    };
    img.src = trimmed;
  }, [input, onUpdate]);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Avatar */}
      <div
        className="relative rounded-full overflow-hidden border-2 border-white/10"
        style={{ width: size, height: size }}
      >
        {currentPhotoURL ? (
          <img
            src={currentPhotoURL}
            alt="Avatar"
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[rgba(255,255,255,0.04)] text-[#7a6a9a]">
            <span className="text-[length:clamp(1rem,3vw,1.5rem)] font-bold">
              ?
            </span>
          </div>
        )}
      </div>

      {/* Input de URL */}
      <div className="flex items-center gap-2 w-full max-w-[260px]">
        <div className="flex-1 relative">
          <FaLink className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a6a9a] text-[10px]" />
          <input
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && !loading && handleSubmit()}
            placeholder="Cole o link da imagem"
            className="w-full h-9 pl-8 pr-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-lg text-[#f0ebff] text-xs outline-none placeholder:text-[#7a6a9a] focus:border-[#a78bfa] transition-colors font-inherit"
          />
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !input.trim()}
          className="h-9 px-3 rounded-lg bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] border-none text-white text-xs font-semibold cursor-pointer flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none flex-shrink-0"
        >
          {loading ? (
            <FaSpinner className="animate-spin text-xs" />
          ) : (
            <FaCheck className="text-xs" />
          )}
        </button>
      </div>

      {/* Remover */}
      {currentPhotoURL && (
        <button
          type="button"
          onClick={() => onUpdate(null)}
          className="flex items-center gap-1.5 text-[10px] sm:text-xs text-[#7a6a9a] hover:text-red-400 transition-colors cursor-pointer bg-transparent border-none font-inherit"
        >
          <FaTrash className="text-[9px]" /> Remover
        </button>
      )}

      {error && (
        <p className="text-[10px] sm:text-xs text-red-400 m-0">{error}</p>
      )}
    </div>
  );
}