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

export type TextSegment =
  | { type: "text"; content: string }
  | { type: "image"; url: string };

const IMAGE_URL_RE = /https?:\/\/[^\s<>"']+\.(?:jpe?g|png|gif|webp|svg|bmp|avif|tiff?)(?:\?[^\s<>"']*)?/gi;

export function parseTextWithImages(text: string): TextSegment[] {
  if (!text) return [{ type: "text", content: "" }];
  if (!IMAGE_URL_RE.test(text)) return [{ type: "text", content: text }];

  const segments: TextSegment[] = [];
  let last = 0;
  IMAGE_URL_RE.lastIndex = 0;

  let m: RegExpExecArray | null;
  while ((m = IMAGE_URL_RE.exec(text)) !== null) {
    if (m.index > last) {
      segments.push({ type: "text", content: text.slice(last, m.index) });
    }
    segments.push({ type: "image", url: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    segments.push({ type: "text", content: text.slice(last) });
  }

  return segments;
}