// components/chat/types.ts

export interface Message {
  id: string;
  type: "text" | "gif" | "image" | "file";
  text: string;
  authorId: string;
  author: string;
  displayName: string;
  photoURL: string | null;
  timestamp: number;
  edited: boolean;
  gifUrl?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileMime?: string;
}

export interface GifData {
  id: string;
  url: string;
  preview: string;
  title: string;
}

export interface MsgBlock {
  authorId: string;
  authorName: string;
  photoURL: string | null;
  msgs: Message[];
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export function formatMsgTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}