// app/dm/DMConversation.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { db, ref, get, update, set, remove, push, onDisconnect } from "@/lib/firebase";
import {
  query,
  orderByChild,
  limitToLast,
  onChildAdded,
  onChildChanged,
  onChildRemoved,
  onValue,
} from "firebase/database";
import { FaUser, FaArrowLeft } from "react-icons/fa";
import MessageList from "@/components/chat/MessageList";
import EmojiPickerPanel from "@/components/chat/EmojiPickerPanel";
import GifPickerPanel from "@/components/chat/GifPickerPanel";
import ChatComposer from "@/components/chat/ChatComposer";
import { Message, GifData } from "@/components/chat/types";
import { compressImage, base64SizeBytes } from "@/lib/imageUtils";

interface AppUser {
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

interface DMConversationProps {
  user: AppUser;
  peer: Peer;
  username: string;
  displayName: string;
  photoURL: string | null;
  onBack: () => void;
}

const GIF_TOKEN_TEST = /!\[[^\]]*\]\([^)\s]+\)/;
const GIF_TOKEN_REPLACE = /!\[[^\]]*\]\([^)\s]+\)/g;

const buildPreviewText = (text: string): string => {
  if (!text) return "";
  if (GIF_TOKEN_TEST.test(text)) {
    const stripped = text.replace(GIF_TOKEN_REPLACE, "").trim();
    return stripped ? "\u{1F3AC} " + stripped : "\u{1F3AC} GIF";
  }
  return text;
};

// Considera "digitando" se o timestamp for dentro dos últimos 3.5 segundos
const TYPING_WINDOW_MS = 3500;

export default function DMConversation({
  user,
  peer,
  username,
  displayName,
  photoURL,
  onBack,
}: DMConversationProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [dmId, setDmId] = useState<string | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [userPhotos, setUserPhotos] = useState<Record<string, string | null>>({});
  const [peerTyping, setPeerTyping] = useState(false);

  // Drag & drop
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const initialLoadDone = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peerTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fotos atualizadas em tempo real
  useEffect(() => {
    if (!user) return;
    const unsub = onValue(ref(db, "users"), (snap) => {
      const data = snap.val() || {};
      const photos: Record<string, string | null> = {};
      for (const [uid, u] of Object.entries(data)) {
        photos[uid] = (u as any).photoURL || null;
      }
      setUserPhotos(photos);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user || !peer?.userId) { setDmId(null); setMessages([]); return; }
    let cancelled = false;
    (async () => {
      if (peer.dmId) { if (!cancelled) setDmId(peer.dmId); return; }
      const snapshot = await get(ref(db, "dms"));
      const dms = snapshot.val() || {};
      let existing: string | null = null;
      for (const [id, dm] of Object.entries(dms)) {
        const d = dm as any;
        if (d.participants?.[user.uid] && d.participants?.[peer.userId]) { existing = id; break; }
      }
      if (cancelled) return;
      if (existing) { setDmId(existing); }
      else {
        const r = push(ref(db, "dms"));
        await set(r, {
          participants: {
            [user.uid]: { username, displayName, photoURL: photoURL || null, joinedAt: Date.now() },
            [peer.userId]: { username: peer.username || "Usu\u00e1rio", displayName: peer.displayName || "Usu\u00e1rio", photoURL: peer.photoURL || null, joinedAt: Date.now() },
          },
          createdAt: Date.now(), lastMessage: null, lastMessageTime: 0,
        });
        if (!cancelled) setDmId(r.key);
      }
    })();
    return () => { cancelled = true; };
  }, [user, peer, username, displayName, photoURL]);

  // Escutar mensagens
  useEffect(() => {
    if (!dmId) { setMessages([]); return; }
    initialLoadDone.current = false;
    setMessages([]);
    const mq = query(ref(db, `dms/${dmId}/messages`), orderByChild("timestamp"), limitToLast(80));
    const u1 = onChildAdded(mq, (s) => {
      const d = s.val();
      if (!d) return;
      setMessages((p) => {
        if (p.some((m) => m.id === s.key)) return p;
        return [...p, { id: s.key as string, ...d }].sort((a, b) => a.timestamp - b.timestamp);
      });
    });
    const u2 = onChildChanged(mq, (s) => {
      const d = s.val();
      if (!d) return;
      setMessages((p) => {
        const i = p.findIndex((m) => m.id === s.key);
        if (i === -1) return p;
        const n = [...p]; n[i] = { id: s.key as string, ...d };
        return n.sort((a, b) => a.timestamp - b.timestamp);
      });
    });
    const u3 = onChildRemoved(mq, (s) => {
      if (!s.key) return;
      setMessages((p) => p.filter((m) => m.id !== s.key));
    });
    return () => { u1(); u2(); u3(); };
  }, [dmId]);

  // Escutar digitando do peer
  useEffect(() => {
    if (!dmId || !peer.userId) return;
    const typingRef = ref(db, `dms/${dmId}/typing/${peer.userId}`);
    const unsub = onValue(typingRef, (snap) => {
      const ts = snap.val() as number | null;
      if (peerTypingTimeoutRef.current) {
        clearTimeout(peerTypingTimeoutRef.current);
        peerTypingTimeoutRef.current = null;
      }
      if (ts && Date.now() - ts < TYPING_WINDOW_MS) {
        setPeerTyping(true);
        peerTypingTimeoutRef.current = setTimeout(() => {
          setPeerTyping(false);
          peerTypingTimeoutRef.current = null;
        }, TYPING_WINDOW_MS);
      } else {
        setPeerTyping(false);
      }
    });
    return () => {
      unsub();
      if (peerTypingTimeoutRef.current) {
        clearTimeout(peerTypingTimeoutRef.current);
        peerTypingTimeoutRef.current = null;
      }
    };
  }, [dmId, peer.userId]);

  // Limpar meu "digitando" ao desmontar
  useEffect(() => {
    if (!dmId || !user.uid) return;
    const myTypingRef = ref(db, `dms/${dmId}/typing/${user.uid}`);
    onDisconnect(myTypingRef).remove();
    return () => {
      remove(myTypingRef).catch(() => {});
    };
  }, [dmId, user.uid]);

  useEffect(() => {
    if (messages.length === 0) return;
    const c = messagesContainerRef.current;
    if (!c) return;
    const nearBottom = c.scrollHeight - c.scrollTop - c.clientHeight < 120;
    if (!initialLoadDone.current || nearBottom) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: initialLoadDone.current ? "smooth" : "auto" });
      });
    }
    if (!initialLoadDone.current) initialLoadDone.current = true;
  }, [messages]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (showEmoji && !t.closest("[data-emoji-panel]") && !t.closest("[data-emoji-btn]")) setShowEmoji(false);
      if (showGif && !t.closest("[data-gif-panel]") && !t.closest("[data-gif-btn]")) setShowGif(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showEmoji, showGif]);

  useEffect(() => {
    if (!dmId) return;
    const handler = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          e.preventDefault();
          const file = items[i].getAsFile();
          if (file && !sending) {
            await handleSendFile("Imagem colada", file);
          }
          return;
        }
      }
    };
    document.addEventListener("paste", handler);
    return () => document.removeEventListener("paste", handler);
  }, [dmId, sending]);

  // ─── Drag & Drop ───────────────────────────────────────────────
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);

    if (!dmId || sending) return;

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith("image/")) {
        await handleSendFile(file.name, file);
        break; // envia só a primeira imagem
      }
    }
  }, [dmId, sending]);

  // ─── Typing indicator ──────────────────────────────────────────
  const handleTyping = useCallback(() => {
    if (!dmId || !user.uid) return;
    const myTypingRef = ref(db, `dms/${dmId}/typing/${user.uid}`);
    set(myTypingRef, Date.now()).catch(() => {});

    // Limpa após parar de digitar
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      remove(myTypingRef).catch(() => {});
      typingTimeoutRef.current = null;
    }, TYPING_WINDOW_MS);
  }, [dmId, user.uid]);

  const clearMyTyping = useCallback(() => {
    if (!dmId || !user.uid) return;
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    remove(ref(db, `dms/${dmId}/typing/${user.uid}`)).catch(() => {});
  }, [dmId, user.uid]);

  // ─── Send helpers ──────────────────────────────────────────────
  const updateDmMeta = useCallback(async (id: string, text: string, time: number) => {
    try { await update(ref(db, `dms/${id}`), { lastMessage: buildPreviewText(text), lastMessageTime: time }); } catch {}
  }, []);

  const handleSendText = useCallback(async (text: string) => {
    if (!dmId || sending) return;
    setSending(true);
    clearMyTyping();
    try {
      const r = push(ref(db, `dms/${dmId}/messages`));
      const now = Date.now();
      await set(r, { type: "text", text, authorId: user.uid, author: username, displayName, photoURL: photoURL || null, timestamp: now, edited: false });
      await updateDmMeta(dmId, text, now);
    } catch (e) { console.error("Erro:", e); }
    finally { setSending(false); }
  }, [dmId, sending, user.uid, username, displayName, photoURL, updateDmMeta, clearMyTyping]);

  const handleSendGif = useCallback(async (gif: GifData) => {
    if (!dmId || sending) return;
    setSending(true);
    setShowGif(false);
    clearMyTyping();
    try {
      const r = push(ref(db, `dms/${dmId}/messages`));
      const now = Date.now();
      await set(r, { type: "gif", text: `![gif](${gif.url})`, gifUrl: gif.url, authorId: user.uid, author: username, displayName, photoURL: photoURL || null, timestamp: now, edited: false });
      await updateDmMeta(dmId, "\u{1F3AC} GIF", now);
    } catch (e) { console.error("Erro:", e); }
    finally { setSending(false); }
  }, [dmId, sending, user.uid, username, displayName, photoURL, updateDmMeta, clearMyTyping]);

  const handleSendFile = useCallback(async (text: string, file: File) => {
    if (!dmId || sending) return;
    setSending(true);
    clearMyTyping();
    try {
      const dataUrl = await compressImage(file, 1280, 0.75);
      if (base64SizeBytes(dataUrl) > 2 * 1024 * 1024) { setSending(false); return; }
      const r = push(ref(db, `dms/${dmId}/messages`));
      const now = Date.now();
      await set(r, {
        type: "image", text: text || "", fileUrl: dataUrl, fileName: file.name,
        fileSize: file.size, fileMime: file.type,
        authorId: user.uid, author: username, displayName,
        photoURL: photoURL || null, timestamp: now, edited: false,
      });
      const preview = "\u{1F4F7} " + (file.name || "imagem");
      await updateDmMeta(dmId, text ? text + " " + preview : preview, now);
    } catch (e) { console.error("Erro:", e); }
    finally { setSending(false); }
  }, [dmId, sending, user.uid, username, displayName, photoURL, updateDmMeta, clearMyTyping]);

  const handleSend = useCallback(async (text: string, file?: File) => {
    if (file) await handleSendFile(text, file);
    else if (text) await handleSendText(text);
  }, [handleSendText, handleSendFile]);

  const handleDelete = useCallback(async (messageId: string) => {
    if (!confirm("Tem certeza que deseja deletar esta mensagem?")) return;
    try { await remove(ref(db, `dms/${dmId}/messages/${messageId}`)); } catch (e) { console.error("Erro:", e); }
  }, [dmId]);

  const handleEmojiSelect = useCallback((emoji: string) => {
    const input = document.querySelector<HTMLInputElement>("[data-chat-composer] input[type='text']");
    if (input) {
      const start = input.selectionStart || input.value.length;
      const newVal = input.value.slice(0, start) + emoji + input.value.slice(start);
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
      setter?.call(input, newVal);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.focus();
      input.setSelectionRange(start + emoji.length, start + emoji.length);
    }
  }, []);

  const peerPhoto = userPhotos[peer.userId] ?? peer.photoURL;

  return (
    <div
      className="flex-1 flex flex-col h-full max-w-none m-0 relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Overlay de drag & drop */}
      {isDragging && (
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-[#0a0618]/80 backdrop-blur-sm pointer-events-none">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] flex items-center justify-center shadow-[0_0_40px_rgba(167,139,250,0.3)] animate-bounce">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
          <p className="text-[#f0ebff] font-['Sora','Inter',system-ui,sans-serif] text-base font-bold m-0">Solte a imagem aqui</p>
          <span className="text-sm text-[#7a6a9a] m-0">Apenas imagens s\u00e3o aceitas</span>
        </div>
      )}

      <header className="flex items-center gap-3 px-4 py-3 border-b border-white/4 bg-white/2 flex-shrink-0">
        <button type="button" className="flex items-center justify-center w-8 h-8 bg-transparent border-none rounded-[8px] text-[#7a6a9a] cursor-pointer transition-all duration-200 hover:bg-[rgba(255,255,255,0.04)] hover:text-[#f0ebff] md:hidden" onClick={onBack} title="Voltar">
          <FaArrowLeft />
        </button>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="relative w-10 h-10 rounded-[10px] bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] flex items-center justify-center text-white font-['Sora','Inter',system-ui,sans-serif] text-base font-bold uppercase flex-shrink-0 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] overflow-hidden">
            {peerPhoto ? <img src={peerPhoto} alt={peer.displayName} className="w-full h-full object-cover" loading="lazy" /> : (peer.displayName?.charAt(0)?.toUpperCase() || <FaUser />)}
            {peerTyping && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#4ade80] rounded-full border-2 border-[#0a0618] animate-pulse" />
            )}
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="font-['Sora','Inter',system-ui,sans-serif] text-sm font-bold text-[#f0ebff] whitespace-nowrap overflow-hidden text-ellipsis">{peer.displayName}</span>
            <span className={`text-xs transition-colors duration-200 ${peerTyping ? "text-[#4ade80]" : "text-[#7a6a9a]"}`}>
              {peerTyping ? "Digitando..." : `@${peer.username || "usu\u00e1rio"}`}
            </span>
          </div>
        </div>
      </header>

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-0.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[rgba(255,255,255,0.08)] [&::-webkit-scrollbar-thumb]:rounded-sm">
        {messages.length === 0 ? (
          <div className="m-auto text-center flex flex-col items-center gap-1.5">
            <div className="text-3xl mb-1 opacity-70">{"\u{1F4AC}"}</div>
            <p className="text-sm font-semibold text-[#f0ebff] m-0">Nenhuma mensagem ainda</p>
            <span className="text-sm text-[#7a6a9a]">Envie algo para {peer.displayName}</span>
            <span className="text-xs text-[#7a6a9a]/60 mt-1">Voc\u00ea pode arrastar imagens aqui</span>
          </div>
        ) : (
          <MessageList
            messages={messages}
            currentUserId={user.uid}
            ownDisplayName={displayName}
            peerDisplayName={peer.displayName}
            userPhotos={userPhotos}
            onDelete={handleDelete}
          />
        )}
        <div ref={messagesEndRef} />
      </div>

      {showEmoji && <EmojiPickerPanel onSelect={handleEmojiSelect} onClose={() => setShowEmoji(false)} />}
      {showGif && <GifPickerPanel onSelect={handleSendGif} onClose={() => setShowGif(false)} />}

      <div data-chat-composer>
        <ChatComposer
          onSend={handleSend}
          onToggleEmoji={() => { setShowEmoji((v) => !v); setShowGif(false); }}
          onToggleGif={() => { setShowGif((v) => !v); setShowEmoji(false); }}
          showEmoji={showEmoji}
          showGif={showGif}
          disabled={!dmId}
          sending={sending}
          peerDisplayName={peer.displayName}
          onTyping={handleTyping}
        />
      </div>
    </div>
  );
}