// components/chat/ChatComposer.tsx
"use client";

import { useState, useRef } from "react";
import { FaRegSmile, FaImage, FaPaperclip, FaTimes, FaFile } from "react-icons/fa";
import { formatFileSize } from "./types";

interface ChatComposerProps {
  onSend: (text: string, file?: File) => void;
  onToggleEmoji: () => void;
  onToggleGif: () => void;
  showEmoji: boolean;
  showGif: boolean;
  disabled: boolean;
  sending: boolean;
  peerDisplayName: string;
}

export default function ChatComposer({
  onSend,
  onToggleEmoji,
  onToggleGif,
  showEmoji,
  showGif,
  disabled,
  sending,
  peerDisplayName,
}: ChatComposerProps) {
  const [text, setText] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isImageFile = pendingFile?.type.startsWith("image/") || false;

  const selectFile = () => {
    setFileError("");
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      setFileError("Arquivo muito grande (m\u00e1ximo 25MB)");
      return;
    }

    setPendingFile(file);
    setFileError("");

    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreview(url);
    } else {
      setPreview(null);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
    inputRef.current?.focus();
  };

  const clearFile = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPendingFile(null);
    setPreview(null);
    setFileError("");
    inputRef.current?.focus();
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed && !pendingFile) return;
    if (disabled || sending) return;
    onSend(trimmed, pendingFile || undefined);
    setText("");
    clearFile();
  };

  return (
    <div className="relative flex-shrink-0 border-t border-white/4 bg-white/2 px-4 py-3 pb-4">
      {/* Preview do arquivo */}
      {pendingFile && (
        <div className="flex items-center gap-2.5 p-2.5 mb-2.5 bg-white/[0.03] border border-white/[0.06] rounded-[8px]">
          {preview ? (
            <img
              src={preview}
              alt="Preview"
              className="w-11 h-11 rounded-[6px] object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-11 h-11 rounded-[6px] bg-[rgba(167,139,250,0.12)] flex items-center justify-center text-[#a78bfa] flex-shrink-0">
              <FaFile />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="m-0 text-sm text-[#f0ebff] truncate font-medium">
              {pendingFile.name}
            </p>
            <p className="m-0 text-[0.7rem] text-[#7a6a9a]">
              {formatFileSize(pendingFile.size)}
              {isImageFile && " \u00b7 Imagem"}
            </p>
          </div>
          <button
            type="button"
            className="flex items-center justify-center w-6 h-6 bg-transparent border-none rounded-[4px] text-[#b5bac1] text-xs cursor-pointer transition-colors duration-100 hover:bg-[#f87171]/15 hover:text-[#f87171]"
            onClick={clearFile}
            title="Remover"
          >
            <FaTimes />
          </button>
        </div>
      )}

      {fileError && (
        <p className="m-0 mb-2 px-2.5 py-1.5 bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.12)] rounded-[6px] text-[#f87171] text-xs">
          {fileError}
        </p>
      )}

      <form className="flex items-center gap-2" onSubmit={handleSubmit}>
        <div className="flex gap-1 flex-shrink-0">
          <button
            type="button"
            className={`flex items-center justify-center w-10 h-10 bg-transparent border border-transparent rounded-[10px] text-[#7a6a9a] text-base cursor-pointer transition-all duration-150 hover:bg-white/4 hover:text-[#ff8a5b] ${showEmoji ? "bg-white/4 border-white/6 text-[#ff8a5b]" : ""}`}
            onClick={onToggleEmoji}
            data-emoji-btn
            title="Emojis"
          >
            <FaRegSmile />
          </button>
          <button
            type="button"
            className={`flex items-center justify-center w-10 h-10 bg-transparent border border-transparent rounded-[10px] text-[#7a6a9a] text-base cursor-pointer transition-all duration-150 hover:bg-white/4 hover:text-[#ff8a5b] ${showGif ? "bg-white/4 border-white/6 text-[#ff8a5b]" : ""}`}
            onClick={onToggleGif}
            data-gif-btn
            title="GIFs"
          >
            <FaImage />
          </button>
          <button
            type="button"
            className={`flex items-center justify-center w-10 h-10 bg-transparent border border-transparent rounded-[10px] text-[#7a6a9a] text-base cursor-pointer transition-all duration-150 hover:bg-white/4 hover:text-[#ff8a5b] ${pendingFile ? "bg-white/4 border-white/6 text-[#ff8a5b]" : ""}`}
            onClick={selectFile}
            title="Enviar arquivo"
          >
            <FaPaperclip />
          </button>
        </div>

        <input
          ref={inputRef}
          type="text"
          className="flex-1 h-11 px-3.5 bg-white/4 border border-white/4 rounded-[10px] text-[#f0ebff] text-sm font-inherit outline-none transition-all duration-200 min-w-0 placeholder:text-[#7a6a9a] focus:border-[#ff8a5b] focus:bg-white/6 disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder={`Mensagem para ${peerDisplayName}...`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled || sending}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              onToggleEmoji();
              onToggleGif();
            }
          }}
        />

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
        />
      </form>
    </div>
  );
}