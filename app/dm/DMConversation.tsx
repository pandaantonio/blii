// app/dm/DMConversation.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { db, ref, get, update, set, remove, push } from "@/lib/firebase";
import {
  query,
  orderByChild,
  limitToLast,
  onChildAdded,
  onChildChanged,
  onChildRemoved,
} from "firebase/database";
import { FaUser, FaArrowLeft } from "react-icons/fa";
import MessageList from "@/components/chat/MessageList";
import EmojiPickerPanel from "@/components/chat/EmojiPickerPanel";
import GifPickerPanel from "@/components/chat/GifPickerPanel";
import ChatComposer from "@/components/chat/ChatComposer";
import { Message, GifData } from "@/components/chat/types";

const IMGBB_KEY = process.env.NEXT_PUBLIC_IMGBB_KEY || "";

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

async function uploadToImgBB(file: File): Promise<string> {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const formData = new FormData();
  formData.append("key", IMGBB_KEY);
  formData.append("image", base64);
  const res = await fetch("https://api.imgbb.com/1/upload", { method: "POST", body: formData });
  const json = await res.json();
  if (!json.success) throw new Error("Upload falhou");
  return json.data.display_url || json.data.url;
}

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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const initialLoadDone = useRef(false);

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

  const updateDmMeta = useCallback(async (id: string, text: string, time: number) => {
    try { await update(ref(db, `dms/${id}`), { lastMessage: buildPreviewText(text), lastMessageTime: time }); } catch {}
  }, []);

  const handleSendText = useCallback(async (text: string) => {
    if (!dmId || sending) return;
    setSending(true);
    try {
      const r = push(ref(db, `dms/${dmId}/messages`));
      const now = Date.now();
      await set(r, { type: "text", text, authorId: user.uid, author: username, displayName, photoURL: photoURL || null, timestamp: now, edited: false });
      await updateDmMeta(dmId, text, now);
    } catch (e) { console.error("Erro:", e); }
    finally { setSending(false); }
  }, [dmId, sending, user.uid, username, displayName, photoURL, updateDmMeta]);

  const handleSendGif = useCallback(async (gif: GifData) => {
    if (!dmId || sending) return;
    setSending(true);
    setShowGif(false);
    try {
      const r = push(ref(db, `dms/${dmId}/messages`));
      const now = Date.now();
      await set(r, { type: "gif", text: `![gif](${gif.url})`, gifUrl: gif.url, authorId: user.uid, author: username, displayName, photoURL: photoURL || null, timestamp: now, edited: false });
      await updateDmMeta(dmId, "\u{1F3AC} GIF", now);
    } catch (e) { console.error("Erro:", e); }
    finally { setSending(false); }
  }, [dmId, sending, user.uid, username, displayName, photoURL, updateDmMeta]);

  const handleSendFile = useCallback(async (text: string, file: File) => {
    if (!dmId || sending) return;
    setSending(true);
    try {
      const fileUrl = await uploadToImgBB(file);
      const r = push(ref(db, `dms/${dmId}/messages`));
      const now = Date.now();
      await set(r, {
        type: "image", text: text || "", fileUrl, fileName: file.name,
        fileSize: file.size, fileMime: file.type,
        authorId: user.uid, author: username, displayName,
        photoURL: photoURL || null, timestamp: now, edited: false,
      });
      const preview = "\u{1F4F7} " + file.name;
      await updateDmMeta(dmId, text ? text + " " + preview : preview, now);
    } catch (e) { console.error("Erro:", e); }
    finally { setSending(false); }
  }, [dmId, sending, user.uid, username, displayName, photoURL, updateDmMeta]);

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
      const pos = start + emoji.length;
      input.setSelectionRange(pos, pos);
    }
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full max-w-none m-0 relative">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-white/4 bg-white/2 flex-shrink-0">
        <button type="button" className="flex items-center justify-center w-8 h-8 bg-transparent border-none rounded-[8px] text-[#7a6a9a] cursor-pointer transition-all duration-200 hover:bg-[rgba(255,255,255,0.04)] hover:text-[#f0ebff] md:hidden" onClick={onBack} title="Voltar">
          <FaArrowLeft />
        </button>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] flex items-center justify-center text-white font-['Sora','Inter',system-ui,sans-serif] text-base font-bold uppercase flex-shrink-0 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] overflow-hidden">
            {peer.photoURL ? <img src={peer.photoURL} alt={peer.displayName} className="w-full h-full object-cover" loading="lazy" /> : (peer.displayName?.charAt(0)?.toUpperCase() || <FaUser />)}
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="font-['Sora','Inter',system-ui,sans-serif] text-sm font-bold text-[#f0ebff] whitespace-nowrap overflow-hidden text-ellipsis">{peer.displayName}</span>
            <span className="text-xs text-[#7a6a9a]">@{peer.username || "usu\u00e1rio"}</span>
          </div>
        </div>
      </header>

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-0.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[rgba(255,255,255,0.08)] [&::-webkit-scrollbar-thumb]:rounded-sm">
        {messages.length === 0 ? (
          <div className="m-auto text-center flex flex-col items-center gap-1.5">
            <div className="text-3xl mb-1 opacity-70">{"\u{1F4AC}"}</div>
            <p className="text-sm font-semibold text-[#f0ebff] m-0">Nenhuma mensagem ainda</p>
            <span className="text-sm text-[#7a6a9a]">Envie algo para {peer.displayName}</span>
          </div>
        ) : (
          <MessageList messages={messages} currentUserId={user.uid} ownDisplayName={displayName} peerDisplayName={peer.displayName} onDelete={handleDelete} />
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
        />
      </div>
    </div>
  );
}