// components/chat/EmojiPickerPanel.tsx
"use client";

import { FaTimes } from "react-icons/fa";
import dynamic from "next/dynamic";
import { Categories } from "emoji-picker-react";

const EmojiPicker = dynamic(
  () => import("emoji-picker-react").then((mod) => mod.default),
  { ssr: false }
);

interface EmojiPickerPanelProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPickerPanel({ onSelect, onClose }: EmojiPickerPanelProps) {
  return (
    <div
      data-emoji-panel
      className="absolute bottom-[60px] left-4 z-50 w-[352px] h-[400px] bg-[#2b2d31] border border-[#1e1f22] rounded-[8px] shadow-[0_8px_24px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden"
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1e1f22] flex-shrink-0">
        <span className="text-sm font-bold text-[#f2f3f5] uppercase tracking-wide">
          Emojis
        </span>
        <button
          type="button"
          className="flex items-center justify-center w-6 h-6 bg-transparent border-none rounded-[4px] text-[#b5bac1] text-xs cursor-pointer transition-colors duration-100 hover:bg-[#35373c] hover:text-[#f2f3f5]"
          onClick={onClose}
        >
          <FaTimes />
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        <EmojiPicker
          onEmojiClick={(data: any) => onSelect(data.emoji || data.native || "")}
          width="100%"
          height={360}
          searchPlaceHolder="Buscar emoji..."
          previewConfig={{ showPreview: true, defaultEmoji: "1f60a" }}
          skinTonesDisabled
          lazyLoadEmojis
          categories={[
            { category: Categories.SMILEYS_PEOPLE, name: "Smileys & Pessoas" },
            { category: Categories.ANIMALS_NATURE, name: "Animais & Natureza" },
            { category: Categories.FOOD_DRINK, name: "Comida & Bebida" },
            { category: Categories.ACTIVITIES, name: "Atividades" },
            { category: Categories.TRAVEL_PLACES, name: "Viagens & Lugares" },
            { category: Categories.OBJECTS, name: "Objetos" },
            { category: Categories.SYMBOLS, name: "S\u00edmbolos" },
            { category: Categories.FLAGS, name: "Bandeiras" },
          ]}
          style={{
            backgroundColor: "#2b2d31",
            border: "none",
            boxShadow: "none",
            "--epr-bg-color": "#2b2d31",
            "--epr-category-label-bg": "#2b2d31",
            "--epr-category-label-text-color": "#b5bac1",
            "--epr-search-bg-color": "#1e1f22",
            "--epr-search-input-color": "#dbdee1",
            "--epr-search-input-placeholder-color": "#6d6f78",
            "--epr-emoji-size": "28px",
            "--epr-hover-bg-color": "#35373c",
            "--epr-focus-bg-color": "#404249",
            "--epr-border-color": "#1e1f22",
          } as React.CSSProperties}
        />
      </div>
    </div>
  );
}