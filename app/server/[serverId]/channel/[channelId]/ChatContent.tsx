// app/server/[serverId]/channel/[channelId]/ChatContent.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { db } from "@/lib/firebase";
import {
  ref, set, remove, update, push,
  onChildAdded, query, orderByChild, limitToLast,
} from "firebase/database";
import {
  FaArrowLeft, FaUsers, FaLock, FaBookOpen, FaCommentAlt, FaUser,
  FaEdit, FaTrash, FaSmile, FaImage, FaTimes,
} from "react-icons/fa";
import dynamic from "next/dynamic";
import FormattedMessage from "@/components/FormattedMessage";
import { useServerContext } from "../../ServerProvider";

const EmojiPicker = dynamic(
  () => import("emoji-picker-react").then((mod) => mod.default),
  { ssr: false }
);

const GIPHY_KEY =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_GIPHY_KEY) ||
  "GlVGYHkr3WSBn87g1H4F";

interface Message {
  id: string;
  type: string;
  text: string;
  authorId: string;
  author: string;
  username: string;
  photoURL: string | null;
  timestamp: number;
  edited: boolean;
  editedAt?: number;
  gifUrl?: string;
}

interface GifData {
  id: string;
  url: string;
  preview: string;
  title: string;
}

export default function ChatContent({ channelId }: { channelId: string }) {
  const {
    serverId, router, user, username, displayName, photoURL,
    channels, members, isOwner,
  } = useServerContext();

  const channelData = channels.find((c) => c.id === channelId) || null;

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [gifQuery, setGifQuery] = useState("");
  const [gifs, setGifs] = useState<GifData[]>([]);
  const [gifLoading, setGifLoading] = useState(false);
  const [gifError, setGifError] = useState("");
  const emojiPanelRef = useRef<HTMLDivElement>(null);
  const gifPanelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const gifRequestIdRef = useRef(0);

  // Redireciona se o canal não existir mais / não for de mensagens
  useEffect(() => {
    if (channels.length === 0) return;
    const exists = channels.some((c) => c.id === channelId);
    if (!exists) {
      router.push(`/server/${serverId}`);
    }
  }, [channels, channelId, serverId, router]);

  // Mensagens
  useEffect(() => {
    setMessages([]);
    if (!serverId || !channelId) return;

    const messagesRef = ref(db, `servers/${serverId}/channels/${channelId}/messages`);
    const messagesQuery = query(messagesRef, orderByChild("timestamp"), limitToLast(50));

    const unsub = onChildAdded(messagesQuery, (snapshot) => {
      const messageData = snapshot.val();
      if (!messageData) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === snapshot.key)) return prev;
        return [...prev, { id: snapshot.key as string, ...messageData }].sort((a, b) => a.timestamp - b.timestamp);
      });
    });
    return () => unsub();
  }, [serverId, channelId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Clique fora dos painéis
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (showEmoji && emojiPanelRef.current && !emojiPanelRef.current.contains(e.target as Node)) {
        setShowEmoji(false);
      }
      if (showGif && gifPanelRef.current && !gifPanelRef.current.contains(e.target as Node)) {
        setShowGif(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [showEmoji, showGif]);

  const searchGifs = useCallback(async (q: string) => {
    const requestId = ++gifRequestIdRef.current;
    setGifLoading(true);
    setGifError("");
    try {
      const trimmed = q.trim();
      const endpoint = trimmed
        ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(trimmed)}&limit=30&rating=pg-13&lang=pt`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_KEY}&limit=30&rating=pg-13`;
      const res = await fetch(endpoint);
      const json = await res.json();

      if (gifRequestIdRef.current !== requestId) return;

      if (json.data) {
        setGifs(json.data.map((g: any) => ({
          id: g.id,
          url: g.images?.fixed_height?.url || g.images?.original?.url,
          preview: g.images?.fixed_height_small?.url || g.images?.preview_gif?.url || g.images?.fixed_height?.url,
          title: g.title,
        })));
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
      () => { searchGifs(gifQuery); },
      gifQuery.trim() ? 400 : 0
    );
    return () => clearTimeout(handle);
  }, [showGif, gifQuery, searchGifs]);

  const handleGifSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchGifs(gifQuery);
  };

  const clearGifSearch = () => setGifQuery("");

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !user) return;

    if (channelData?.type === "read" && !isOwner) {
      alert("Apenas o dono do servidor pode enviar mensagens neste canal.");
      return;
    }

    setSending(true);
    try {
      const messagesRef = ref(db, `servers/${serverId}/channels/${channelId}/messages`);
      const newMessageRef = push(messagesRef);
      await set(newMessageRef, {
        type: "text",
        text: newMessage.trim(),
        authorId: user.uid,
        author: displayName,
        username,
        photoURL: photoURL || null,
        timestamp: Date.now(),
        edited: false,
      });
      setNewMessage("");
      setShowEmoji(false);
      setShowGif(false);
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const insertGif = (gif: GifData) => {
    if (!gif?.url || sending || !user) return;
    if (channelData?.type === "read" && !isOwner) {
      alert("Apenas o dono do servidor pode enviar mensagens neste canal.");
      return;
    }
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

  const insertEmoji = (emoji: string) => {
    setNewMessage((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  const handleEditMessage = async (messageId: string) => {
    if (!editText.trim()) return;
    try {
      await update(ref(db, `servers/${serverId}/channels/${channelId}/messages/${messageId}`), {
        text: editText.trim(),
        edited: true,
        editedAt: Date.now(),
      });
      setEditingId(null);
    } catch (error) {
      console.error("Erro ao editar mensagem:", error);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm("Tem certeza que deseja deletar esta mensagem?")) return;
    try {
      await remove(ref(db, `servers/${serverId}/channels/${channelId}/messages/${messageId}`));
    } catch (error) {
      console.error("Erro ao deletar mensagem:", error);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const formatDateSeparator = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === now.toDateString()) return "Hoje";
    if (date.toDateString() === yesterday.toDateString()) return "Ontem";
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  };

  return (
    <div className="flex flex-col h-screen h-dvh">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3 sm:px-6 py-3 border-b border-[rgba(255,255,255,0.04)] flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            className="flex items-center justify-center w-8 h-8 bg-transparent border-none rounded-[8px] text-[#7a6a9a] cursor-pointer transition-all duration-200 hover:bg-[rgba(255,255,255,0.04)] hover:text-[#f0ebff] flex-shrink-0"
            onClick={() => router.push(`/server/${serverId}`)}
            title="Voltar para os canais"
          >
            <FaArrowLeft />
          </button>
          {channelData?.type === "read" ? (
            <FaBookOpen className="text-[#7a6a9a] text-sm flex-shrink-0" />
          ) : (
            <FaCommentAlt className="text-[#7a6a9a] text-sm flex-shrink-0" />
          )}
          <span className="font-['Sora','Inter',system-ui,sans-serif] text-sm font-bold text-[#f0ebff] truncate">{channelData?.name}</span>
          {channelData?.type === "read" && (
            <span className="hidden sm:flex items-center gap-1 text-[0.6rem] font-semibold text-[#7a6a9a] bg-[rgba(255,255,255,0.04)] px-2 py-0.5 rounded flex-shrink-0">
              <FaLock /> Leitura
            </span>
          )}
        </div>
        <button
          className="flex items-center gap-2 h-8 px-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-[8px] text-[#b8a8d9] text-xs font-semibold cursor-pointer transition-all duration-200 hover:bg-[rgba(255,255,255,0.06)] hover:text-[#f0ebff] flex-shrink-0"
          onClick={() => router.push(`/server/${serverId}/channel/${channelId}/members`)}
          title="Ver membros"
        >
          <FaUsers />
          <span className="hidden sm:inline">{members.length} membros</span>
        </button>
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[rgba(167,139,250,0.2)] [&::-webkit-scrollbar-thumb]:rounded-full">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-4xl mb-4 opacity-50">💬</div>
            <h2 className="font-['Sora','Inter',system-ui,sans-serif] text-xl sm:text-2xl font-bold text-[#f0ebff] m-0"># {channelData?.name}</h2>
            <p className="text-sm text-[#b8a8d9] mt-2">Bem-vindo ao canal <strong>{channelData?.name}</strong>!</p>
            <p className="text-xs text-[#7a6a9a]">Seja o primeiro a enviar uma mensagem.</p>
          </div>
        ) : (
          (() => {
            let lastDate: string | null = null;
            return messages.map((msg, index) => {
              const isCurrentUser = msg.authorId === user?.uid;
              const isGif = msg.type === "gif" && msg.gifUrl;

              const msgDate = new Date(msg.timestamp).toDateString();
              const showDateSeparator = lastDate !== msgDate;
              if (showDateSeparator) lastDate = msgDate;

              const prevMsg = index > 0 ? messages[index - 1] : null;
              const isSameAuthor = prevMsg && prevMsg.authorId === msg.authorId;
              const isSameDay = prevMsg && new Date(prevMsg.timestamp).toDateString() === new Date(msg.timestamp).toDateString();

              const showAvatar = !isSameAuthor || !isSameDay;
              const showName = !isSameAuthor || !isSameDay;
              const showTimestamp = !isSameAuthor || !isSameDay ||
                (prevMsg && (msg.timestamp - prevMsg.timestamp) > 15 * 60 * 1000);

              const msgAuthor = members.find((m) => m.uid === msg.authorId);
              const authorColor = msgAuthor?.roleColor || "#f0ebff";

              return (
                <React.Fragment key={msg.id}>
                  {showDateSeparator && (
                    <div className="flex justify-center my-4">
                      <span className="text-xs font-semibold text-[#7a6a9a] bg-[rgba(255,255,255,0.03)] px-3 py-1 rounded-full border border-[rgba(255,255,255,0.04)]">
                        {formatDateSeparator(msg.timestamp)}
                      </span>
                    </div>
                  )}
                  <div className={`flex items-start gap-3 py-1 ${isCurrentUser ? "flex-row-reverse" : ""}`}>
                    <div className="flex-shrink-0">
                      {showAvatar ? (
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] flex items-center justify-center text-white text-xs font-bold uppercase overflow-hidden">
                          {msg.photoURL ? (
                            <img src={msg.photoURL} alt={msg.author} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <FaUser />
                          )}
                        </div>
                      ) : (
                        <div className="w-9 h-9 flex-shrink-0" />
                      )}
                    </div>
                    <div className={`flex-1 min-w-0 ${isCurrentUser ? "text-right" : ""}`}>
                      {(showName || showTimestamp) && (
                        <div className={`flex items-center gap-2 flex-wrap ${isCurrentUser ? "flex-row-reverse" : ""}`}>
                          {showName && (
                            <span className="text-sm font-bold" style={{ color: authorColor }}>
                              {msg.author}
                            </span>
                          )}
                          {showName && msg.username && (
                            <span className="text-xs text-[#7a6a9a]">@{msg.username || msg.author}</span>
                          )}
                          {showTimestamp && (
                            <span className="text-xs text-[#7a6a9a]">{formatTimestamp(msg.timestamp)}</span>
                          )}
                        </div>
                      )}
                      {editingId === msg.id ? (
                        <input
                          className="w-full px-3 py-1.5 bg-[rgba(255,255,255,0.06)] border border-[#a78bfa] rounded-lg text-[#f0ebff] text-sm font-inherit outline-none"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onBlur={() => handleEditMessage(msg.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleEditMessage(msg.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          autoFocus
                        />
                      ) : isGif ? (
                        <div className="mt-1">
                          <img src={msg.gifUrl} alt={msg.text} className="max-w-[220px] sm:max-w-[260px] max-h-[220px] rounded-lg object-cover" loading="lazy" />
                          {msg.edited && <span className="text-xs text-[#7a6a9a] italic ml-2">(editado)</span>}
                        </div>
                      ) : (
                        <div className="mt-0.5">
                          <FormattedMessage text={msg.text} />
                          {msg.edited && <span className="text-xs text-[#7a6a9a] italic ml-2">(editado)</span>}
                        </div>
                      )}
                      {isCurrentUser && !editingId && (
                        <div className={`flex gap-1 mt-1 ${isCurrentUser ? "justify-end" : ""}`}>
                          <button
                            className="flex items-center justify-center w-7 h-7 bg-transparent border-none rounded-[6px] text-[#7a6a9a] text-xs cursor-pointer transition-all duration-150 hover:bg-[rgba(255,255,255,0.04)] hover:text-[#f0ebff]"
                            onClick={() => { setEditingId(msg.id); setEditText(msg.text); }}
                            title="Editar"
                          >
                            <FaEdit />
                          </button>
                          <button
                            className="flex items-center justify-center w-7 h-7 bg-transparent border-none rounded-[6px] text-[#7a6a9a] text-xs cursor-pointer transition-all duration-150 hover:bg-[rgba(247,84,110,0.08)] hover:text-[#f87171]"
                            onClick={() => handleDeleteMessage(msg.id)}
                            title="Excluir"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            });
          })()
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="relative flex-shrink-0 border-t border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.01)] px-3 sm:px-4 py-3">
        {showEmoji && (
          <div className="absolute bottom-full left-2 right-2 sm:left-3 sm:right-3 max-w-[420px] max-h-[320px] bg-[#1a0c28] border border-[rgba(255,255,255,0.06)] rounded-[18px] shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex flex-col overflow-hidden z-50" ref={emojiPanelRef}>
            <EmojiPicker
              onEmojiClick={(emojiData: any) => insertEmoji(emojiData.emoji)}
              width="100%"
              height={320}
              searchPlaceHolder="Buscar emoji..."
              previewConfig={{ showPreview: false }}
              skinTonesDisabled
              lazyLoadEmojis
              style={{ backgroundColor: "#1a0c28", border: "none", boxShadow: "none" }}
            />
          </div>
        )}

        {showGif && (
          <div className="absolute bottom-full left-2 right-2 sm:left-3 sm:right-3 max-w-[420px] max-h-[320px] bg-[#1a0c28] border border-[rgba(255,255,255,0.06)] rounded-[18px] shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex flex-col overflow-hidden z-50" ref={gifPanelRef}>
            <form className="flex items-center gap-2 p-2.5 border-b border-[rgba(255,255,255,0.04)] flex-shrink-0" onSubmit={handleGifSearch}>
              <input
                type="text"
                placeholder="Buscar GIFs..."
                className="flex-1 h-9 px-2.5 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.04)] rounded-[6px] text-[#f0ebff] text-sm font-inherit outline-none min-w-0 placeholder:text-[#7a6a9a] focus:border-[#a78bfa]"
                value={gifQuery}
                onChange={(e) => setGifQuery(e.target.value)}
                autoFocus
              />
              {gifQuery && (
                <button
                  type="button"
                  className="flex items-center justify-center w-7 h-7 flex-shrink-0 bg-transparent border-none rounded-[6px] text-[#7a6a9a] text-[0.7rem] cursor-pointer transition-all duration-150 hover:bg-[rgba(255,255,255,0.04)] hover:text-[#f87171]"
                  onClick={clearGifSearch}
                  title="Limpar busca"
                >
                  <FaTimes />
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
                  {gifQuery.trim() ? `Nenhum GIF encontrado para "${gifQuery.trim()}"` : "Nenhum GIF encontrado"}
                </div>
              ) : (
                gifs.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    className="relative aspect-square border-none rounded-[6px] overflow-hidden p-0 cursor-pointer bg-[rgba(255,255,255,0.04)] transition-all duration-150 hover:scale-105 hover:shadow-[0_0_0_2px_#a78bfa]"
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
              className={`flex items-center justify-center w-10 h-10 bg-transparent border border-transparent rounded-[10px] text-[#7a6a9a] text-base cursor-pointer transition-all duration-150 hover:bg-[rgba(255,255,255,0.04)] hover:text-[#ff8a5b] ${showEmoji ? "bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.06)] text-[#ff8a5b]" : ""}`}
              onClick={() => { setShowEmoji(!showEmoji); setShowGif(false); }}
              title="Emojis"
            >
              <FaSmile />
            </button>
            <button
              type="button"
              className={`flex items-center justify-center w-10 h-10 bg-transparent border border-transparent rounded-[10px] text-[#7a6a9a] text-base cursor-pointer transition-all duration-150 hover:bg-[rgba(255,255,255,0.04)] hover:text-[#ff8a5b] ${showGif ? "bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.06)] text-[#ff8a5b]" : ""}`}
              onClick={() => { setShowGif(!showGif); setShowEmoji(false); }}
              title="GIFs"
            >
              <FaImage />
            </button>
          </div>
          <input
            ref={inputRef}
            type="text"
            className="flex-1 h-11 px-3.5 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.04)] rounded-[10px] text-[#f0ebff] text-sm font-inherit outline-none transition-all duration-200 min-w-0 placeholder:text-[#7a6a9a] focus:border-[#a78bfa] focus:bg-[rgba(255,255,255,0.06)] disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder={
              channelData?.type === "read" && !isOwner
                ? "Este canal é apenas para leitura"
                : `Mensagem em ${channelData?.name || ""}... (Enter para enviar)`
            }
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={sending || (channelData?.type === "read" && !isOwner)}
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
