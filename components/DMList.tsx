// components/DMList.tsx
"use client";

import { useState, useEffect } from "react";
import { db, ref, onValue } from "@/lib/firebase";
import { FaComment } from "react-icons/fa";

interface Friend {
  id: string;
  username: string;
  displayName: string;
  photoURL: string | null;
}

interface Peer {
  userId: string;
  username: string;
  displayName: string;
  photoURL: string | null;
  dmId: string | null;
}

interface DMListProps {
  userId: string;
  friends: Friend[];
  selectedUserId?: string;
  onSelect: (peer: Peer) => void;
}

interface DM {
  id: string;
  otherParticipantId: string;
  otherParticipantName: string;
  otherUsername: string;
  otherPhotoURL: string | null;
  lastMessage: string;
  lastMessageTime: number;
}

export default function DMList({ userId, friends, selectedUserId, onSelect }: DMListProps) {
  const [dms, setDms] = useState<DM[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const dmsRef = ref(db, "dms");
    const unsubscribeDms = onValue(dmsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const dmEntries = Object.entries(data);
        const userDms = dmEntries
          .filter(([_, dm]: [string, any]) => dm.participants && dm.participants[userId])
          .map(([id, dm]: [string, any]) => {
            const otherParticipantId = Object.keys(dm.participants).find(
              (pid) => pid !== userId
            );
            const otherParticipant = otherParticipantId
              ? dm.participants[otherParticipantId]
              : null;

            const friend = friends.find((f) => f.id === otherParticipantId);

            return {
              id,
              ...dm,
              otherParticipantId: otherParticipantId || "",
              otherParticipantName: friend
                ? friend.displayName
                : otherParticipant
                ? otherParticipant.displayName || otherParticipant.username || "Usuário"
                : "Usuário Desconhecido",
              otherUsername: friend
                ? friend.username
                : otherParticipant?.username || "",
              otherPhotoURL: friend
                ? friend.photoURL
                : otherParticipant?.photoURL || null,
              lastMessage: dm.lastMessage || "Nenhuma mensagem",
              lastMessageTime: dm.lastMessageTime || 0,
            };
          })
          .sort((a, b) => b.lastMessageTime - a.lastMessageTime);

        setDms(userDms);
      } else {
        setDms([]);
      }
      setLoading(false);
    });

    return () => unsubscribeDms();
  }, [userId, friends]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2.5 text-[#7a6a9a] text-sm">
        <div className="w-6 h-6 border-2 border-white/6 border-t-[#a78bfa] rounded-full animate-spin" />
        <p>Carregando conversas...</p>
      </div>
    );
  }

  if (dms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-10 px-5 gap-1">
        <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/2 border border-white/4 text-[#7a6a9a] text-base mb-2">
          <FaComment />
        </div>
        <p className="text-sm font-semibold text-[#f0ebff] m-0">Nenhuma conversa</p>
        <span className="text-xs text-[#7a6a9a]">Adicione um amigo para começar</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      {dms.map((dm) => (
        <div
          key={dm.id}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 ${
            selectedUserId === dm.otherParticipantId
              ? "bg-[rgba(167,139,250,0.12)] border border-[rgba(167,139,250,0.2)]"
              : "hover:bg-white/4 active:scale-[0.98]"
          }`}
          onClick={() =>
            onSelect({
              userId: dm.otherParticipantId,
              displayName: dm.otherParticipantName,
              username: dm.otherUsername,
              photoURL: dm.otherPhotoURL,
              dmId: dm.id,
            })
          }
        >
          <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] flex items-center justify-center text-white font-['Sora','Inter',system-ui,sans-serif] text-sm font-bold uppercase shadow-[0_2px_8px_rgba(167,139,250,0.15)] overflow-hidden">
            {dm.otherPhotoURL ? (
              <img 
                src={dm.otherPhotoURL} 
                alt={dm.otherParticipantName}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              dm.otherParticipantName.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline gap-2 mb-0.5">
              <span className="text-sm font-semibold text-[#f0ebff] whitespace-nowrap overflow-hidden text-ellipsis">
                {dm.otherParticipantName}
              </span>
              <span className="text-[0.65rem] text-[#7a6a9a] flex-shrink-0">
                {dm.lastMessageTime > 0
                  ? new Date(dm.lastMessageTime).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                    })
                  : ""}
              </span>
            </div>
            <span className="text-xs text-[#b8a8d9] whitespace-nowrap overflow-hidden text-ellipsis block">
              {dm.lastMessage || "Nenhuma mensagem"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}