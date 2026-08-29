// app/dm/DMContent.tsx
"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth, db, ref, get, set, remove, onValue } from "@/lib/firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { FaComment, FaCircle, FaUserPlus, FaCheck, FaTimes, FaArrowLeft, FaUserClock, FaUsers, FaEllipsisV, FaUserMinus } from "react-icons/fa";

interface AppUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

interface Friend {
  id: string;
  username: string;
  displayName: string;
  photoURL: string | null;
  status: string;
  lastSeen: number;
}

interface Conversation {
  dmId: string;
  userId: string;
  username: string;
  displayName: string;
  photoURL: string | null;
  lastMessage: string | null;
  lastMessageTime: number;
}

interface IncomingRequest {
  requesterId: string;
  username: string;
  displayName: string;
  photoURL: string | null;
  timestamp: number;
}

const GIF_TOKEN_TEST = /!\[[^\]]*\]\([^)\s]+\)/;
const GIF_TOKEN_REPLACE = /!\[[^\]]*\]\([^)\s]+\)/g;

const buildPreviewText = (text: string | null): string => {
  if (!text) return "Nenhuma mensagem ainda";
  if (GIF_TOKEN_TEST.test(text)) {
    const stripped = text.replace(GIF_TOKEN_REPLACE, "").trim();
    return stripped ? "\u{1F3AC} " + stripped : "\u{1F3AC} GIF";
  }
  return text;
};

const formatTime = (timestamp: number): string => {
  if (!timestamp) return " ";
  const now = new Date();
  const date = new Date(timestamp);
  const sameDay = now.toDateString() === date.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
};

export default function DMContent() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<Record<string, any>>({});
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<IncomingRequest[]>([]);
  const [showFriendModal, setShowFriendModal] = useState(false);
  const [friendUsername, setFriendUsername] = useState("");
  const [searchError, setSearchError] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [removingFriendId, setRemovingFriendId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser: FirebaseUser | null) => {
      if (!currentUser) {
        router.push("/");
        return;
      }
      const mappedUser: AppUser = {
        uid: currentUser.uid,
        displayName: currentUser.displayName || null,
        email: currentUser.email || null,
        photoURL: currentUser.photoURL || null,
      };
      setUser(mappedUser);
      setPhotoURL(currentUser.photoURL || null);

      const userRef = ref(db, `users/${currentUser.uid}`);
      const unsubscribeUser = onValue(userRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          setUsername(data.username || "Usuário");
          setDisplayName(data.displayName || data.username || "Usuário");
          setPhotoURL(data.photoURL || currentUser.photoURL || null);
        } else {
          setUsername("Usuário");
          setDisplayName("Usuário");
          setPhotoURL(null);
        }
        setLoading(false);
      });

      return () => unsubscribeUser();
    });
    return () => unsubscribe();
  }, [mounted, router]);

  useEffect(() => {
    if (!mounted || !user) {
      setFriendIds([]);
      return;
    }
    const friendsRef = ref(db, `friends/${user.uid}/friends`);
    const unsub = onValue(friendsRef, (snapshot) => {
      const data = snapshot.val();
      setFriendIds(data ? Object.keys(data) : []);
    });
    return () => unsub();
  }, [mounted, user]);

  useEffect(() => {
    if (!mounted || !user) return;
    const usersRef = ref(db, "users");
    const unsub = onValue(usersRef, (snapshot) => {
      setAllUsers(snapshot.val() || {});
    });
    return () => unsub();
  }, [mounted, user]);

  useEffect(() => {
    if (!mounted || !user) {
      setConversations([]);
      return;
    }
    const unsub = onValue(ref(db, "dms"), (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setConversations([]);
        return;
      }
      const list: Conversation[] = Object.entries(data)
        .filter(([, dm]: [string, any]) => dm.participants && dm.participants[user.uid])
        .map(([id, dm]: [string, any]) => {
          const otherId = Object.keys(dm.participants).find((uid) => uid !== user.uid) || " ";
          const otherData = dm.participants[otherId] || {};
          return {
            dmId: id,
            userId: otherId,
            username: otherData.username || " ",
            displayName: otherData.displayName || otherData.username || "Usuário",
            photoURL: otherData.photoURL || null,
            lastMessage: dm.lastMessage || null,
            lastMessageTime: dm.lastMessageTime || 0,
          };
        })
        .filter((c) => c.userId)
        .sort((a, b) => b.lastMessageTime - a.lastMessageTime);
      setConversations(list);
    });
    return () => unsub();
  }, [mounted, user]);

  useEffect(() => {
    if (!mounted || !user) {
      setIncomingRequests([]);
      return;
    }
    const incomingRef = ref(db, `friends/${user.uid}/requests/incoming`);
    const unsub = onValue(incomingRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setIncomingRequests([]);
        return;
      }
      const requests: IncomingRequest[] = Object.entries(data).map(([requesterId, req]: [string, any]) => ({
        requesterId,
        username: req.username || "Usuário",
        displayName: req.displayName || req.username || "Usuário",
        photoURL: req.photoURL || null,
        timestamp: req.timestamp || 0,
      }));
      setIncomingRequests(requests.sort((a, b) => b.timestamp - a.timestamp));
    });
    return () => unsub();
  }, [mounted, user]);

  useEffect(() => {
    if (!openMenuId) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const menu = menuRef.current;
      const button = openMenuId ? menuButtonRefs.current[openMenuId] : null;
      if (menu && !menu.contains(target) && button && !button.contains(target)) {
        setOpenMenuId(null);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenuId(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [openMenuId]);

  const friends = useMemo<Friend[]>(() => {
    return friendIds
      .map((id) => {
        const u = allUsers[id];
        if (!u) return null;
        return {
          id,
          username: u.username || "",
          displayName: u.displayName || u.username || "Usuário",
          photoURL: u.photoURL || null,
          status: u.status?.state || "offline",
          lastSeen: u.status?.lastSeen || 0,
        };
      })
      .filter(Boolean) as Friend[];
  }, [friendIds, allUsers]);

  const onlineFriends = useMemo(() => {
    return friends
      .filter((f) => f.status === "online" || f.status === "away")
      .sort((a, b) => {
        if (a.status === "online" && b.status !== "online") return -1;
        if (a.status !== "online" && b.status === "online") return 1;
        return b.lastSeen - a.lastSeen;
      });
  }, [friends]);

  const conversationUserIds = useMemo(() => {
    return new Set(conversations.map((c) => c.userId));
  }, [conversations]);

  const friendIdsSet = useMemo(() => {
    return new Set(friendIds);
  }, [friendIds]);

  const closeFriendModal = () => {
    setShowFriendModal(false);
    setFriendUsername("");
    setSearchError("");
    setSearchResult(null);
  };

  const handleSearchUser = async () => {
    if (!user) return;
    const usernameLower = friendUsername.toLowerCase().trim();
    if (!usernameLower) {
      setSearchError("Digite um username");
      return;
    }
    if (usernameLower === username.toLowerCase()) {
      setSearchError("Você não pode adicionar a si mesmo");
      return;
    }
    setSearchLoading(true);
    setSearchError("");
    setSearchResult(null);
    try {
      const usernameRef = ref(db, `usernames/${usernameLower}`);
      const usernameSnap = await get(usernameRef);
      if (!usernameSnap.exists()) {
        setSearchError("Usuário não encontrado");
        setSearchLoading(false);
        return;
      }
      const targetUser = usernameSnap.val();
      const targetId = targetUser.uid;
      const userRef = ref(db, `users/${targetId}`);
      const userSnap = await get(userRef);
      let targetDisplayName = targetUser.username;
      let targetPhotoURL: string | null = null;
      if (userSnap.exists()) {
        targetDisplayName = userSnap.val().displayName || targetUser.username;
        targetPhotoURL = userSnap.val().photoURL || null;
      }
      const friendSnap = await get(ref(db, `friends/${user.uid}/friends/${targetId}`));
      if (friendSnap.exists()) {
        setSearchError("Você já é amigo deste usuário");
        setSearchLoading(false);
        return;
      }
      const outgoingSnap = await get(ref(db, `friends/${user.uid}/requests/outgoing/${targetId}`));
      if (outgoingSnap.exists()) {
        setSearchError("Solicitação de amizade já enviada");
        setSearchLoading(false);
        return;
      }
      const incomingSnap = await get(ref(db, `friends/${user.uid}/requests/incoming/${targetId}`));
      if (incomingSnap.exists()) {
        setSearchError("Este usuário já te enviou uma solicitação");
        setSearchLoading(false);
        return;
      }
      setSearchResult({
        id: targetId,
        username: targetUser.username,
        displayName: targetDisplayName,
        photoURL: targetPhotoURL,
      });
    } catch (error) {
      console.error("Erro ao buscar usuário:", error);
      setSearchError("Erro ao buscar usuário");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSendFriendRequest = async () => {
    if (!searchResult || !user) return;
    setSendingRequest(true);
    try {
      const requestData = {
        requesterId: user.uid,
        username: username || "Usuário",
        displayName: displayName || "Usuário",
        photoURL: photoURL || null,
        timestamp: Date.now(),
      };
      await set(ref(db, `friends/${user.uid}/requests/outgoing/${searchResult.id}`), {
        targetId: searchResult.id,
        username: searchResult.username,
        displayName: searchResult.displayName,
        photoURL: searchResult.photoURL || null,
        timestamp: Date.now(),
      });
      await set(ref(db, `friends/${searchResult.id}/requests/incoming/${user.uid}`), requestData);
      closeFriendModal();
    } catch (error) {
      console.error("Erro ao enviar solicitação:", error);
      setSearchError("Erro ao enviar solicitação");
    } finally {
      setSendingRequest(false);
    }
  };

  const handleAcceptRequest = async (request: IncomingRequest) => {
    if (!user) return;
    setProcessingRequestId(request.requesterId);
    try {
      const now = Date.now();
      await set(ref(db, `friends/${user.uid}/friends/${request.requesterId}`), {
        addedAt: now,
        username: request.username,
        displayName: request.displayName,
        photoURL: request.photoURL || null,
      });
      await set(ref(db, `friends/${request.requesterId}/friends/${user.uid}`), {
        addedAt: now,
        username: username || "Usuário",
        displayName: displayName || "Usuário",
        photoURL: photoURL || null,
      });
      await remove(ref(db, `friends/${user.uid}/requests/incoming/${request.requesterId}`));
      await remove(ref(db, `friends/${request.requesterId}/requests/outgoing/${user.uid}`));
    } catch (error) {
      console.error("Erro ao aceitar solicitação:", error);
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleRejectRequest = async (request: IncomingRequest) => {
    if (!user) return;
    setProcessingRequestId(request.requesterId);
    try {
      await remove(ref(db, `friends/${user.uid}/requests/incoming/${request.requesterId}`));
      await remove(ref(db, `friends/${request.requesterId}/requests/outgoing/${user.uid}`));
    } catch (error) {
      console.error("Erro ao recusar solicitação:", error);
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleRemoveFriend = async (friendId: string, friendName: string) => {
    if (!user) return;
    const confirmed = window.confirm(`Tem certeza que deseja desfazer a amizade com ${friendName}?`);
    if (!confirmed) {
      setOpenMenuId(null);
      return;
    }
    setRemovingFriendId(friendId);
    setOpenMenuId(null);
    try {
      await remove(ref(db, `friends/${user.uid}/friends/${friendId}`));
      await remove(ref(db, `friends/${friendId}/friends/${user.uid}`));
    } catch (error) {
      console.error("Erro ao desfazer amizade:", error);
      alert("Não foi possível desfazer a amizade. Tente novamente.");
    } finally {
      setRemovingFriendId(null);
    }
  };

  if (!mounted || loading || !user) {
    return (
      <div className="min-h-screen min-h-dvh flex flex-col items-center justify-center gap-4 text-[#b8a8d9] text-sm px-4">
        <div className="w-10 h-10 border-3 border-white/6 border-t-[#a78bfa] rounded-full animate-spin" />
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen min-h-dvh relative overflow-hidden text-[#f0ebff] font-['Inter',system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] bg-[radial-gradient(ellipse_at_20%_20%,#1a0a2e_0%,#0a0618_50%,#2d1045_100%)] flex items-center justify-center p-2 sm:p-5">
        <div className="fixed w-[800px] h-[800px] -top-[300px] -right-[200px] bg-[radial-gradient(circle,rgba(167,139,250,0.06)_0%,transparent_70%)] pointer-events-none z-0 blur-[80px]" aria-hidden="true" />
        <div className="fixed w-[600px] h-[600px] -bottom-[200px] -left-[200px] bg-[radial-gradient(circle,rgba(255,138,91,0.04)_0%,transparent_70%)] pointer-events-none z-0 blur-[80px]" aria-hidden="true" />
        <div className="relative z-10 flex flex-col w-full max-w-[1400px] h-[calc(100vh-16px)] sm:h-[calc(100vh-40px)] max-h-[900px] bg-white/2 backdrop-blur-[40px] border border-white/4 rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.5)]">
          <div className="w-full h-full flex flex-col overflow-hidden px-4 sm:px-6 md:px-8 py-4 sm:py-6">
            <div className="flex items-center gap-2 sm:gap-4 justify-between mb-4 sm:mb-6 flex-shrink-0 flex-wrap">
              <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                <button type="button" className="flex items-center justify-center w-9 h-9 flex-shrink-0 bg-transparent border-none rounded-lg text-[#7a6a9a] cursor-pointer transition-all duration-200 hover:bg-[rgba(255,255,255,0.04)] hover:text-[#f0ebff]" onClick={() => router.push("/general")} title="Voltar">
                  <FaArrowLeft />
                </button>
                <h1 className="font-['Sora','Inter',system-ui,sans-serif] text-lg sm:text-xl font-bold text-[#f0ebff] m-0 flex items-center gap-2 sm:gap-2.5 truncate">
                  <FaComment className="text-[#a78bfa] flex-shrink-0" />
                  <span className="truncate">Mensagens diretas</span>
                </h1>
              </div>
              <button type="button" className="flex items-center justify-center gap-2 h-10 px-3 sm:px-4 bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] border-none rounded-xl text-white text-sm font-bold cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(167,139,250,0.35)] flex-shrink-0" onClick={() => setShowFriendModal(true)}>
                <FaUserPlus />
                <span className="hidden sm:inline">Adicionar amigo</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[rgba(167,139,250,0.2)] [&::-webkit-scrollbar-thumb]:rounded-full">
              {incomingRequests.length > 0 && (
                <div className="mb-7">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-[#b8a8d9] uppercase tracking-wide m-0 flex items-center gap-2">
                      <FaUserClock className="text-[#fbbf24] text-[0.65rem]" />
                      Solicitações pendentes
                    </h3>
                    <span className="text-xs font-semibold text-[#7a6a9a] bg-white/3 px-2.5 py-1 rounded-full">{incomingRequests.length}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {incomingRequests.map((req) => (
                      <div key={req.requesterId} className="flex items-center gap-3 p-3 bg-white/2 border border-white/4 rounded-[14px]">
                        <div className="relative w-11 h-11 flex-shrink-0 rounded-[12px] bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] flex items-center justify-center text-white text-sm font-bold uppercase overflow-hidden">
                          {req.photoURL ? <img src={req.photoURL} alt={req.displayName} className="w-full h-full object-cover" loading="lazy" /> : req.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                          <span className="text-sm font-semibold text-[#f0ebff] whitespace-nowrap overflow-hidden text-ellipsis">{req.displayName}</span>
                          <span className="text-[0.75rem] text-[#7a6a9a]">@{req.username || "usuário"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button type="button" className="flex items-center justify-center gap-1 h-8 px-3 bg-[rgba(79,216,196,0.12)] border border-[rgba(79,216,196,0.2)] rounded-[8px] text-[#4fd8c4] text-xs font-bold cursor-pointer transition-all duration-150 hover:bg-[rgba(79,216,196,0.2)] disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => handleAcceptRequest(req)} disabled={processingRequestId === req.requesterId} title="Aceitar">
                            <FaCheck />
                            <span className="hidden sm:inline">Aceitar</span>
                          </button>
                          <button type="button" className="flex items-center justify-center gap-1 h-8 px-3 bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.15)] rounded-[8px] text-[#f87171] text-xs font-bold cursor-pointer transition-all duration-150 hover:bg-[rgba(248,113,113,0.15)] disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => handleRejectRequest(req)} disabled={processingRequestId === req.requesterId} title="Recusar">
                            <FaTimes />
                            <span className="hidden sm:inline">Recusar</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {onlineFriends.length > 0 && (
                <div className="mb-7">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-[#b8a8d9] uppercase tracking-wide m-0 flex items-center gap-2">
                      <FaCircle className="text-[#4fd8c4] text-[0.55rem]" />
                      Amigos online
                    </h3>
                    <span className="text-xs font-semibold text-[#7a6a9a] bg-white/3 px-2.5 py-1 rounded-full">{onlineFriends.length}</span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {onlineFriends.map((f) => (
                      <div key={f.id} className="relative flex items-center gap-3 p-3 bg-white/2 border border-white/4 rounded-[14px] min-w-[160px] max-w-[220px] group">
                        <button type="button" className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer transition-all duration-200 text-left text-inherit font-inherit hover:opacity-80" onClick={() => router.push(`/dm/${f.id}`)} disabled={removingFriendId === f.id}>
                          <div className="relative w-11 h-11 flex-shrink-0 rounded-[12px] bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] flex items-center justify-center text-white text-sm font-bold uppercase overflow-hidden">
                            {f.photoURL ? <img src={f.photoURL} alt={f.displayName} className="w-full h-full object-cover" loading="lazy" /> : f.displayName.charAt(0).toUpperCase()}
                            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0a0618]" style={{ background: f.status === "online" ? "#4fd8c4" : "#fbbf24", boxShadow: f.status === "online" ? "0 0 6px #4fd8c4" : "0 0 6px #fbbf24" }} />
                          </div>
                          <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                            <span className="text-sm font-semibold text-[#f0ebff] whitespace-nowrap overflow-hidden text-ellipsis">{f.displayName}</span>
                            <span className="text-[0.75rem] text-[#7a6a9a]">@{f.username || "usuário"}</span>
                          </div>
                        </button>
                        <button
                          ref={(el) => { menuButtonRefs.current[f.id] = el; }}
                          type="button"
                          className="flex items-center justify-center w-7 h-7 flex-shrink-0 bg-transparent border-none rounded-[8px] text-[#7a6a9a] cursor-pointer transition-all duration-150 hover:bg-white/6 hover:text-[#f0ebff] opacity-0 group-hover:opacity-100 focus:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === f.id ? null : f.id);
                          }}
                          title="Mais opções"
                          aria-label="Mais opções"
                          disabled={removingFriendId === f.id}
                        >
                          <FaEllipsisV className="text-[0.7rem]" />
                        </button>
                        {openMenuId === f.id && (
                          <div
                            ref={menuRef}
                            className="absolute right-2 top-full mt-1.5 z-50 min-w-[180px] bg-[linear-gradient(165deg,rgba(20,10,40,0.98),rgba(30,15,50,0.98))] backdrop-blur-[20px] border border-white/8 rounded-[12px] shadow-[0_16px_40px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                          >
                            <button
                              type="button"
                              className="flex items-center gap-2.5 w-full px-3.5 py-2.5 bg-transparent border-none text-left text-[#f87171] text-sm font-semibold cursor-pointer transition-all duration-150 hover:bg-[rgba(248,113,113,0.1)] disabled:opacity-50 disabled:cursor-not-allowed"
                              onClick={() => handleRemoveFriend(f.id, f.displayName)}
                              disabled={removingFriendId === f.id}
                            >
                              <FaUserMinus className="text-[0.8rem]" />
                              {removingFriendId === f.id ? "Removendo..." : "Desfazer amizade"}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <h3 className="text-sm font-bold text-[#b8a8d9] uppercase tracking-wide m-0 mb-3">Conversas</h3>
                {conversations.length === 0 ? (
                  <div className="text-center py-14 px-4 bg-white/2 border border-white/4 rounded-2xl">
                    <div className="w-[60px] h-[60px] mx-auto mb-3 flex items-center justify-center rounded-[18px] bg-white/2 border border-white/4 text-[#7a6a9a] text-xl">
                      <FaComment />
                    </div>
                    <p className="font-['Sora','Inter',system-ui,sans-serif] text-sm font-bold text-[#f0ebff] m-0 mb-1">Nenhuma conversa ainda</p>
                    <span className="text-sm text-[#7a6a9a]">{friends.length === 0 ? "Adicione amigos para começar a conversar" : "Clique em um amigo para começar uma conversa"}</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {conversations.map((c) => (
                      <div key={c.dmId} className="relative flex items-center gap-3 p-3 bg-transparent border border-transparent rounded-[14px] group hover:bg-white/3 hover:border-white/4">
                        <button type="button" className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer transition-all duration-200 text-left hover:opacity-80" onClick={() => router.push(`/dm/${c.userId}`)} disabled={removingFriendId === c.userId}>
                          <div className="relative w-12 h-12 flex-shrink-0 rounded-[12px] bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] flex items-center justify-center text-white text-sm font-bold uppercase overflow-hidden">
                            {c.photoURL ? <img src={c.photoURL} alt={c.displayName} className="w-full h-full object-cover" loading="lazy" /> : c.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-[#f0ebff] truncate">{c.displayName}</span>
                              {c.lastMessageTime > 0 && <span className="text-[0.7rem] text-[#7a6a9a] flex-shrink-0">{formatTime(c.lastMessageTime)}</span>}
                            </div>
                            <p className="text-[0.8rem] text-[#7a6a9a] m-0 truncate">{buildPreviewText(c.lastMessage)}</p>
                          </div>
                        </button>
                        {friendIdsSet.has(c.userId) && (
                          <>
                            <button
                              ref={(el) => { menuButtonRefs.current[`conv-${c.userId}`] = el; }}
                              type="button"
                              className="flex items-center justify-center w-7 h-7 flex-shrink-0 bg-transparent border-none rounded-[8px] text-[#7a6a9a] cursor-pointer transition-all duration-150 hover:bg-white/6 hover:text-[#f0ebff] opacity-0 group-hover:opacity-100 focus:opacity-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(openMenuId === `conv-${c.userId}` ? null : `conv-${c.userId}`);
                              }}
                              title="Mais opções"
                              aria-label="Mais opções"
                              disabled={removingFriendId === c.userId}
                            >
                              <FaEllipsisV className="text-[0.7rem]" />
                            </button>
                            {openMenuId === `conv-${c.userId}` && (
                              <div
                                ref={menuRef}
                                className="absolute right-2 top-full mt-1.5 z-50 min-w-[180px] bg-[linear-gradient(165deg,rgba(20,10,40,0.98),rgba(30,15,50,0.98))] backdrop-blur-[20px] border border-white/8 rounded-[12px] shadow-[0_16px_40px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                              >
                                <button
                                  type="button"
                                  className="flex items-center gap-2.5 w-full px-3.5 py-2.5 bg-transparent border-none text-left text-[#f87171] text-sm font-semibold cursor-pointer transition-all duration-150 hover:bg-[rgba(248,113,113,0.1)] disabled:opacity-50 disabled:cursor-not-allowed"
                                  onClick={() => handleRemoveFriend(c.userId, c.displayName)}
                                  disabled={removingFriendId === c.userId}
                                >
                                  <FaUserMinus className="text-[0.8rem]" />
                                  {removingFriendId === c.userId ? "Removendo..." : "Desfazer amizade"}
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {showFriendModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-3xl flex items-center justify-center z-[2000] p-5" onClick={closeFriendModal}>
          <div className="relative w-full max-w-[440px] p-6 sm:p-10 sm:px-9 bg-[linear-gradient(165deg,rgba(20,10,40,0.98),rgba(30,15,50,0.98))] backdrop-blur-[20px] border border-white/6 rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.6)] text-center" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="absolute top-4 right-4 flex items-center justify-center w-9 h-9 bg-white/3 border border-white/6 rounded-[10px] text-[#7a6a9a] text-sm cursor-pointer transition-all duration-200 hover:bg-white/8 hover:text-[#f0ebff]" onClick={closeFriendModal}>
              <FaTimes />
            </button>
            <div className="w-[60px] h-[60px] mx-auto mb-4 flex items-center justify-center rounded-[16px] bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] text-white text-2xl shadow-[0_4px_16px_rgba(167,139,250,0.25)]">
              <FaUserPlus />
            </div>
            <h2 className="font-['Sora','Inter',system-ui,sans-serif] text-xl font-bold text-[#f0ebff] m-0 mb-1.5">Adicionar amigo</h2>
            <p className="text-sm text-[#b8a8d9] leading-relaxed m-0 mb-6">Digite o username da pessoa que você quer adicionar.</p>
            <div className="flex flex-col gap-4 text-left">
              <div className="flex flex-col gap-1.5 relative">
                <label htmlFor="friendUsername" className="text-sm font-semibold text-[#b8a8d9] tracking-wide">Username</label>
                <div className="flex gap-2">
                  <input id="friendUsername" type="text" placeholder="Ex: joao123" className="flex-1 h-12 px-4 bg-white/3 border border-white/6 rounded-[12px] text-[#f0ebff] text-sm font-inherit outline-none transition-all duration-300 placeholder:text-[#7a6a9a] focus:border-[#a78bfa] focus:bg-white/6 disabled:opacity-50 disabled:cursor-not-allowed" value={friendUsername} onChange={(e) => { setFriendUsername(e.target.value); setSearchResult(null); setSearchError(""); }} disabled={searchLoading || sendingRequest} autoFocus onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (searchResult) handleSendFriendRequest(); else handleSearchUser(); } }} />
                  <button type="button" className="h-12 px-5 bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] border-none rounded-[12px] text-white text-sm font-bold font-inherit cursor-pointer whitespace-nowrap transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(167,139,250,0.3)] disabled:opacity-50 disabled:cursor-not-allowed" onClick={handleSearchUser} disabled={searchLoading || !friendUsername.trim() || sendingRequest}>
                    {searchLoading ? "..." : "Buscar"}
                  </button>
                </div>
              </div>
              {searchError && <p className="m-0 px-3.5 py-2.5 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.15)] rounded-[10px] text-[#f87171] text-sm text-center">{searchError}</p>}
              {searchResult && (
                <div className="flex items-center gap-3 p-2.5 bg-white/3 border border-white/6 rounded-[12px]">
                  <div className="w-10 h-10 flex-shrink-0 rounded-[10px] bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] flex items-center justify-center text-white text-sm font-bold uppercase overflow-hidden">
                    {searchResult.photoURL ? <img src={searchResult.photoURL} alt={searchResult.displayName} className="w-full h-full rounded-[10px] object-cover" loading="lazy" /> : searchResult.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 text-left">
                    <span className="block text-sm font-semibold text-[#f0ebff]">{searchResult.displayName}</span>
                    <span className="block text-[0.75rem] text-[#7a6a9a]">@{searchResult.username}</span>
                  </div>
                  <FaCheck className="text-[#4fd8c4] text-base flex-shrink-0" />
                </div>
              )}
              <div className="flex justify-end gap-2.5 mt-1">
                <button type="button" className="inline-flex items-center justify-center gap-1.5 h-[42px] px-5 rounded-[10px] text-sm font-semibold font-inherit cursor-pointer transition-all duration-300 bg-transparent border-none text-[#b8a8d9] hover:bg-white/3 hover:text-[#f0ebff] disabled:opacity-50 disabled:cursor-not-allowed" onClick={closeFriendModal} disabled={sendingRequest}>
                  Cancelar
                </button>
                {searchResult && (
                  <button type="button" className="inline-flex items-center justify-center gap-1.5 h-[42px] px-5 rounded-[10px] text-sm font-semibold font-inherit cursor-pointer transition-all duration-300 bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] border-none text-white shadow-[0_4px_16px_rgba(167,139,250,0.25)] hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(167,139,250,0.35)] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none" onClick={handleSendFriendRequest} disabled={sendingRequest}>
                    {sendingRequest ? "Enviando..." : "Enviar solicitação"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}