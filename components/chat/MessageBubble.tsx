// components/chat/MessageBubble.tsx
"use client";

import { FaTrash, FaFile } from "react-icons/fa";
import FormattedMessage from "@/components/FormattedMessage";
import { Message, formatMsgTime } from "./types";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showHeader: boolean;
  authorName: string;
  authorColor: string;
  onDelete?: (id: string) => void;
}

export default function MessageBubble({
  message: msg,
  isOwn,
  showHeader,
  authorName,
  authorColor,
  onDelete,
}: MessageBubbleProps) {
  const isGif = msg.type === "gif" && msg.gifUrl;
  const isImage = msg.type === "image" && msg.fileUrl;
  const isFile = msg.type === "file" && msg.fileUrl;

  return (
    <div
      className={`group relative flex items-end gap-1.5 ${isOwn ? "flex-row-reverse" : ""}`}
    >
      <div
        className={`relative max-w-[75%] px-3 py-1.5 rounded-[6px] transition-colors duration-100 ${
          isOwn
            ? "bg-[#5865f2]/20 hover:bg-[#5865f2]/25"
            : "bg-white/[0.04] hover:bg-white/[0.06]"
        }`}
      >
        {showHeader && (
          <div
            className={`flex items-baseline gap-2 mb-1 ${isOwn ? "flex-row-reverse" : ""}`}
          >
            <span
              className="text-sm font-bold hover:underline cursor-default"
              style={{ color: authorColor }}
            >
              {authorName}
            </span>
            <span className="text-[0.7rem] text-[#7a6a9a]">
              {formatMsgTime(msg.timestamp)}
            </span>
          </div>
        )}

        {isGif && (
          <a
            href={msg.gifUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-[4px] overflow-hidden max-w-[280px]"
          >
            <img
              src={msg.gifUrl}
              alt={msg.text || "GIF"}
              className="block w-full max-h-[200px] object-cover rounded-[4px]"
              loading="lazy"
            />
          </a>
        )}

        {isImage && (
          <a
            href={msg.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-[4px] overflow-hidden max-w-[300px]"
          >
            <img
              src={msg.fileUrl}
              alt={msg.text || msg.fileName || "Imagem"}
              className="block w-full max-h-[300px] object-cover rounded-[4px]"
              loading="lazy"
            />
          </a>
        )}

        {isFile && (
          <a
            href={msg.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-2.5 bg-white/[0.03] border border-white/[0.04] rounded-[6px] hover:bg-white/[0.06] transition-colors duration-100 min-w-[200px] max-w-[280px]"
          >
            <div className="w-10 h-10 flex-shrink-0 rounded-[6px] bg-[rgba(167,139,250,0.12)] flex items-center justify-center text-[#a78bfa]">
              <FaFile />
            </div>
            <div className="flex-1 min-w-0">
              <p className="m-0 text-sm text-[#dbdee1] truncate font-medium">
                {msg.fileName || "Arquivo"}
              </p>
              <p className="m-0 text-[0.7rem] text-[#7a6a9a]">
                {msg.fileSize != null ? formatMsgTime(msg.timestamp) : ""}
              </p>
            </div>
          </a>
        )}

        {!isGif && !isImage && !isFile && (
          <p className="m-0 text-sm leading-[1.375rem] text-[#dbdee1] break-words whitespace-pre-wrap">
            <FormattedMessage text={msg.text} />
            {msg.edited && (
              <span className="text-[0.65rem] text-[#7a6a9a] italic ml-1">
                (editado)
              </span>
            )}
          </p>
        )}

        {(isImage || isFile) && msg.text && (
          <p className="m-0 text-sm leading-[1.375rem] text-[#dbdee1] break-words whitespace-pre-wrap mt-1">
            <FormattedMessage text={msg.text} />
          </p>
        )}
      </div>

      {!showHeader && (
        <span
          className="absolute opacity-0 group-hover:opacity-100 text-[0.6rem] text-[#7a6a9a] whitespace-nowrap transition-opacity duration-100 pointer-events-none"
          style={{
            [isOwn ? "left" : "right"]: "calc(100% + 8px)",
            bottom: "2px",
          }}
        >
          {formatMsgTime(msg.timestamp)}
        </span>
      )}

      {isOwn && onDelete && (
        <button
          type="button"
          className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-6 h-6 bg-[#2b2d31] border border-[#1e1f22] rounded-[4px] text-[#b5bac1] text-[0.6rem] cursor-pointer transition-all duration-100 flex-shrink-0 self-center hover:bg-[#f87171]/20 hover:text-[#f87171] hover:border-[#f87171]/30"
          onClick={() => onDelete(msg.id)}
          title="Deletar mensagem"
        >
          <FaTrash />
        </button>
      )}
    </div>
  );
}