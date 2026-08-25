// app/dm/DMConversation.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { db, ref, get, update, set, remove, push } from "@/lib/firebase";
import { query, orderByChild, limitToLast, onChildAdded } from "firebase/database";
import { FaTrash, FaSmile, FaImage, FaUser } from "react-icons/fa";
import dynamic from 'next/dynamic';
import FormattedMessage from "@/components/FormattedMessage";

const EmojiPicker = dynamic(
  () => import('emoji-picker-react').then((mod) => mod.default),
  { ssr: false }
);

interface User {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

interface Peer {
  userId: string;
  username: string;
  displayName: string;
  photoURL: string | null;
  dmId: string | null;
}

interface Message {
  id: string;
  type: string;
  text: string;
  authorId: string;
  author: string;
  displayName: string;
  photoURL: string | null;
  timestamp: number;
  edited: boolean;
  gifUrl?: string;
}

interface GifData {
  id: string;
  url: string;
  preview: string;
  title: string;
}

interface DMConversationProps {
  user: User;
  peer: Peer;
  username: string;
  displayName: string;
  photoURL: string | null;
}

const GIPHY_KEY =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_GIPHY_KEY) ||
  "GlVGYHkr3WSBn87g1H4F";

const GIF_TOKEN_TEST = /!\[[^\]]*\]\([^)\s]+\)/;
const GIF_TOKEN_REPLACE = /!\[[^\]]*\]\([^)\s]+\)/g;

const buildPreviewText = (text: string): string => {
  if (!text) return "";
  if (GIF_TOKEN_TEST.test(text)) {
    const stripped = text.replace(GIF_TOKEN_REPLACE, "").trim();
    return stripped ? `🎬 ${stripped}` : "🎬 GIF";
  }
  return text;
};

export default function DMConversation({ user, peer, username, displayName, photoURL }: DMConversationProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [dmId, setDmId] = useState<string | null>(null);

  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [gifQuery, setGifQuery] = useState("");
  const [gifs, setGifs] = useState<GifData[]>([]);
  const [gifLoading, setGifLoading] = useState(false);
  const [gifError, setGifError] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiPanelRef = useRef<HTMLDivElement>(null);
  const gifPanelRef = useRef<HTMLDivElement>(null);
  const gifRequestIdRef = useRef(0);

  // Criar/obter DM
  useEffect(() => {
    if (!user || !peer?.userId) {
      setDmId(null);
      setMessages([]);
      return;
    }

    let cancelled = false;

    (async () => {
      if (peer.dmId) {
        if (!cancelled) setDmId(peer.dmId);
        return;
      }

      const snapshot = await get(ref(db, "dms"));
      const dms = snapshot.val() || {};
      let existingDmId: string | null = null;

      for (const [id, dm] of Object.entries(dms)) {
        const dmData = dm as any;
        if (
          dmData.participants &&
          dmData.participants[user.uid] &&
          dmData.participants[peer.userId]
        ) {
          existingDmId = id;
          break;
        }
      }

      if (cancelled) return;

      if (existingDmId) {
        setDmId(existingDmId);
      } else {
        const newDmRef = push(ref(db, "dms"));
        await set(newDmRef, {
          participants: {
            [user.uid]: {
              username: username,
              displayName: displayName,
              photoURL: photoURL || null,
              joinedAt: Date.now(),
            },
            [peer.userId]: {
              username: peer.username || "Usuário",
              displayName: peer.displayName || "Usuário",
              photoURL: peer.photoURL || null,
              joinedAt: Date.now(),
            },
          },
          createdAt: Date.now(),
          lastMessage: null,
          lastMessageTime: 0,
        });
        if (!cancelled) setDmId(newDmRef.key);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, peer, username, displayName, photoURL]);

  // Escuta mensagens
  useEffect(() => {
    if (!dmId) {
      setMessages([]);
      return;
    }

    setMessages([]);
    const messagesQuery = query(
      ref(db, `dms/${dmId}/messages`),
      orderByChild("timestamp"),
      limitToLast(80)
    );

    const unsub = onChildAdded(messagesQuery, (snapshot) => {
      const messageData = snapshot.val();
      if (messageData) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === snapshot.key)) return prev;
          return [...prev, { id: snapshot.key as string, ...messageData }].sort(
            (a, b) => a.timestamp - b.timestamp
          );
        });
      }
    });

    return () => unsub();
  }, [dmId]);

  // Scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Click outside
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (
        showEmoji &&
        emojiPanelRef.current &&
        !emojiPanelRef.current.contains(e.target as Node) &&
        !(e.target as HTMLElement).closest("[data-emoji-btn]")
      ) {
        setShowEmoji(false);
      }
      if (
        showGif &&
        gifPanelRef.current &&
        !gifPanelRef.current.contains(e.target as Node) &&
        !(e.target as HTMLElement).closest("[data-gif-btn]")
      ) {
        setShowGif(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [showEmoji, showGif]);

  // Busca GIFs
  const searchGifs = useCallback(async (q: string) => {
    const requestId = ++gifRequestIdRef.current;
    setGifLoading(true);
    setGifError("");
    try {
      const trimmed = q.trim();
      const endpoint = trimmed
        ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(
            trimmed
          )}&limit=30&rating=pg-13&lang=pt`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_KEY}&limit=30&rating=pg-13`;
      const res = await fetch(endpoint);
      const json = await res.json();

      if (gifRequestIdRef.current !== requestId) return;

      if (json.data) {
        setGifs(
          json.data.map((g: any) => ({
            id: g.id,
            url: g.images?.fixed_height?.url || g.images?.original?.url,
            preview:
              g.images?.fixed_height_small?.url ||
              g.images?.preview_gif?.url ||
              g.images?.fixed_height?.url,
            title: g.title,
          }))
        );
      } else {
        setGifs([]);
      }
    } catch (err) {
      if (gifRequestIdRef.current !== requestId) return;
      console.error("Erro ao buscar GIFs:", err);
      setGifs([]);
      setGifError("Não foi possível buscar GIFs agora");
    } finally {
      if (gifRequestIdRef.current === requestId) setGifLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!showGif) return;
    const handle = setTimeout(
      () => {
        searchGifs(gifQuery);
      },
      gifQuery.trim() ? 400 : 0
    );
    return () => clearTimeout(handle);
  }, [showGif, gifQuery, searchGifs]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = newMessage.trim();
    if (!trimmed || !dmId || sending) return;
    setSending(true);
    try {
      const newMessageRef = push(ref(db, `dms/${dmId}/messages`));
      await set(newMessageRef, {
        type: "text",
        text: trimmed,
        authorId: user.uid,
        author: username,
        displayName: displayName,
        photoURL: photoURL || null,
        timestamp: Date.now(),
        edited: false,
      });
      await update(ref(db, `dms/${dmId}`), {
        lastMessage: buildPreviewText(trimmed),
        lastMessageTime: Date.now(),
      });
      setNewMessage("");
      setShowEmoji(false);
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const insertEmoji = (emoji: string) => {
    setNewMessage((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  const insertGif = (gif: GifData) => {
    if (!gif?.url || sending) return;
    const token = `![gif](${gif.url})`;
    const el = inputRef.current;
    const start = el && typeof el.selectionStart === "number" ? el.selectionStart : newMessage.length;
    const end = el && typeof el.selectionEnd === "number" ? el.selectionEnd : newMessage.length;

    const before = newMessage.slice(0, start);
    const after = newMessage.slice(end);
    const prefix = before && !/\s$/.test(before) ? " " : "";
    const suffix = after && !/^\s/.test(after) ? " " : "";
    const insertion = `${prefix}${token}${suffix}`;
    const newValue = before + insertion + after;
    const cursorPos = (before + insertion).length;

    setNewMessage(newValue);

    requestAnimationFrame(() => {
      if (el) {
        el.focus();
        el.setSelectionRange(cursorPos, cursorPos);
      }
    });
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm("Tem certeza que deseja deletar esta mensagem?")) return;
    try {
      await remove(ref(db, `dms/${dmId}/messages/${messageId}`));
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch (error) {
      console.error("Erro ao deletar mensagem:", error);
    }
  };

  const clearGifSearch = () => {
    setGifQuery("");
  };

  const handleGifSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchGifs(gifQuery);
  };

  return (
    <div className="flex-1 flex flex-col h-full max-w-none m-0">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-white/4 bg-white/2 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] flex items-center justify-center text-white font-['Sora','Inter',system-ui,sans-serif] text-base font-bold uppercase flex-shrink-0 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] overflow-hidden">
            {peer.photoURL ? (
              <img 
                src={peer.photoURL} 
                alt={peer.displayName}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              peer.displayName?.charAt(0)?.toUpperCase() || <FaUser />
            )}
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="font-['Sora','Inter',system-ui,sans-serif] text-sm font-bold text-[#f0ebff] whitespace-nowrap overflow-hidden text-ellipsis">
              {peer.displayName}
            </span>
            <span className="text-xs text-[#7a6a9a]">
              @{peer.username || "usuário"}
            </span>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[rgba(255,255,255,0.08)] [&::-webkit-scrollbar-thumb]:rounded-sm">
        {messages.length === 0 ? (
          <div className="m-auto text-center flex flex-col items-center gap-1.5">
            <div className="text-3xl mb-1 opacity-70">💬</div>
            <p className="text-sm font-semibold text-[#f0ebff] m-0">Nenhuma mensagem ainda</p>
            <span className="text-sm text-[#7a6a9a]">Envie algo para {peer.displayName}</span>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.authorId === user.uid;
            const isGif = msg.type === "gif" && msg.gifUrl;

            return (
              <div
                key={msg.id}
                className={`flex items-start gap-2.5 mb-1 py-1 group ${isOwn ? "flex-row-reverse" : ""}`}
              >
                {!isOwn && (
                  <div className="w-8 h-8 flex-shrink-0 rounded-lg bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] flex items-center justify-center text-white text-[0.7rem] font-bold uppercase overflow-hidden mt-1">
                    {msg.photoURL ? (
                      <img 
                        src={msg.photoURL} 
                        alt={msg.displayName}
                        className="w-full h-full rounded-lg object-cover"
                        loading="lazy"
                      />
                    ) : (
                      msg.displayName?.charAt(0)?.toUpperCase() || "U"
                    )}
                  </div>
                )}
                <div
                  className={`max-w-[85%] p-2 border rounded-[12px] ${
                    isOwn
                      ? "bg-[linear-gradient(145deg,rgba(255,106,53,0.12),rgba(144,72,221,0.16))] border-[rgba(173,116,240,0.2)] rounded-[12px_12px_4px_12px]"
                      : "bg-white/2 border-white/4 rounded-[12px_12px_12px_4px]"
                  }`}
                >
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="text-sm font-bold text-[#a78bfa]">
                      {isOwn ? displayName : peer.displayName}
                    </span>
                    <span className="text-[0.7rem] text-[#7a6a9a]">
                      {new Date(msg.timestamp).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {isGif ? (
                    <a
                      href={msg.gifUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block mt-1 rounded-[6px] overflow-hidden max-w-[280px]"
                    >
                      <img
                        src={msg.gifUrl}
                        alt={msg.text || "GIF"}
                        className="block w-full max-h-[220px] object-cover rounded-[6px]"
                        loading="lazy"
                      />
                    </a>
                  ) : (
                    <p className="m-0 text-sm leading-relaxed text-[#f0ebff] break-words whitespace-pre-wrap">
                      <FormattedMessage text={msg.text} />
                      {msg.edited && (
                        <span className="text-[0.7rem] text-[#7a6a9a] italic"> (editado)</span>
                      )}
                    </p>
                  )}
                </div>
                {isOwn && (
                  <button
                    type="button"
                    className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-7 h-7 bg-transparent border-none rounded-[6px] text-[#7a6a9a] text-xs cursor-pointer transition-all duration-150 flex-shrink-0 mt-1 hover:bg-[rgba(247,84,110,0.14)] hover:text-[#f87171]"
                    onClick={() => handleDeleteMessage(msg.id)}
                    title="Deletar"
                  >
                    <FaTrash />
                  </button>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div className="relative flex-shrink-0 border-t border-white/4 bg-white/2 px-4 py-3 pb-4">
        {showEmoji && (
          <div className="absolute bottom-[calc(100%+8px)] left-3 right-3 max-w-[420px] max-h-[320px] bg-[#1a0c28] border border-white/6 rounded-[18px] shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex flex-col overflow-hidden z-50">
            <EmojiPicker
              onEmojiClick={(emojiData: any) => insertEmoji(emojiData.emoji)}
              width="100%"
              height={320}
              searchPlaceHolder="Buscar emoji..."
              previewConfig={{ showPreview: false }}
              skinTonesDisabled
              lazyLoadEmojis
              style={{
                backgroundColor: "#1a0c28",
                border: "none",
                boxShadow: "none",
              }}
            />
          </div>
        )}

        {showGif && (
          <div className="absolute bottom-[calc(100%+8px)] left-3 right-3 max-w-[420px] max-h-[320px] bg-[#1a0c28] border border-white/6 rounded-[18px] shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex flex-col overflow-hidden z-50">
            <form className="flex items-center gap-2 p-2.5 border-b border-white/4 flex-shrink-0" onSubmit={handleGifSearch}>
              <FaImage className="text-[#7a6a9a] text-sm flex-shrink-0" />
              <input
                type="text"
                placeholder="Buscar GIFs..."
                className="flex-1 h-9 px-2.5 bg-white/4 border border-white/4 rounded-[6px] text-[#f0ebff] text-sm font-inherit outline-none min-w-0 placeholder:text-[#7a6a9a] focus:border-[#ff8a5b]"
                value={gifQuery}
                onChange={(e) => setGifQuery(e.target.value)}
                autoFocus
              />
              {gifQuery && (
                <button
                  type="button"
                  className="flex items-center justify-center w-7 h-7 flex-shrink-0 bg-transparent border-none rounded-[6px] text-[#7a6a9a] text-[0.7rem] cursor-pointer transition-all duration-150 hover:bg-white/4 hover:text-[#f87171]"
                  onClick={clearGifSearch}
                  title="Limpar busca"
                >
                  <FaImage />
                </button>
              )}
              <button type="submit" className="h-9 px-3 bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] border-none rounded-[6px] text-white text-sm font-bold font-inherit cursor-pointer whitespace-nowrap">
                Buscar
              </button>
            </form>

            {!gifQuery.trim() && !gifLoading && gifs.length > 0 && (
              <p className="m-0 px-2.5 pt-2 text-[0.7rem] font-bold text-[#7a6a9a] uppercase tracking-wide">🔥 Em alta agora</p>
            )}

            <div className="grid grid-cols-3 gap-1.5 p-2.5 overflow-y-auto flex-1 min-h-[140px]">
              {gifLoading ? (
                <div className="col-span-3 text-center py-6 text-[#7a6a9a] text-sm">Carregando GIFs...</div>
              ) : gifError ? (
                <div className="col-span-3 text-center py-6 text-[#7a6a9a] text-sm">{gifError}</div>
              ) : gifs.length === 0 ? (
                <div className="col-span-3 text-center py-6 text-[#7a6a9a] text-sm">
                  {gifQuery.trim()
                    ? `Nenhum GIF encontrado para "${gifQuery.trim()}"`
                    : "Nenhum GIF encontrado"}
                </div>
              ) : (
                gifs.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    className="relative aspect-square border-none rounded-[6px] overflow-hidden p-0 cursor-pointer bg-white/4 transition-all duration-150 hover:scale-105 hover:shadow-[0_0_0_2px_#ff8a5b]"
                    onClick={() => insertGif(g)}
                    title={g.title}
                  >
                    <img src={g.preview || g.url} alt={g.title} className="w-full h-full object-cover block" loading="lazy" />
                  </button>
                ))
              )}
            </div>
            <p className="m-0 px-2.5 pb-2 text-[0.65rem] text-[#7a6a9a] text-right flex-shrink-0">Powered by GIPHY</p>
          </div>
        )}

        <form className="flex items-center gap-2" onSubmit={handleSendMessage}>
          <div className="flex gap-1 flex-shrink-0">
            <button
              type="button"
              className={`flex items-center justify-center w-10 h-10 bg-transparent border border-transparent rounded-[10px] text-[#7a6a9a] text-base cursor-pointer transition-all duration-150 hover:bg-white/4 hover:text-[#ff8a5b] ${
                showEmoji ? "bg-white/4 border-white/6 text-[#ff8a5b]" : ""
              }`}
              onClick={() => {
                setShowEmoji((v) => !v);
                setShowGif(false);
              }}
              data-emoji-btn
              title="Emojis"
            >
              <FaSmile />
            </button>
            <button
              type="button"
              className={`flex items-center justify-center w-10 h-10 bg-transparent border border-transparent rounded-[10px] text-[#7a6a9a] text-base cursor-pointer transition-all duration-150 hover:bg-white/4 hover:text-[#ff8a5b] ${
                showGif ? "bg-white/4 border-white/6 text-[#ff8a5b]" : ""
              }`}
              onClick={() => {
                setShowGif((v) => !v);
                setShowEmoji(false);
              }}
              data-gif-btn
              title="GIFs"
            >
              <FaImage />
            </button>
          </div>
          <input
            ref={inputRef}
            type="text"
            className="flex-1 h-11 px-3.5 bg-white/4 border border-white/4 rounded-[10px] text-[#f0ebff] text-sm font-inherit outline-none transition-all duration-200 min-w-0 placeholder:text-[#7a6a9a] focus:border-[#ff8a5b] focus:bg-white/6 disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder={`Mensagem para ${peer.displayName}... (Enter para enviar)`}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={sending || !dmId}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setShowEmoji(false);
                setShowGif(false);
              }
            }}
          />
        </form>
      </div>
    </div>
  );
}