// app/dm/DMContent.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { auth, db, ref, get, set, onValue, remove, update } from "@/lib/firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { FaComment, FaCircle, FaUserPlus, FaCheck, FaTimes, FaUser, FaArrowLeft, FaBell } from "react-icons/fa";

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

interface FriendRequest {
  id: string;
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
    return stripped ? `🎬 ${stripped}` : "🎬 GIF";
  }
  return text;
};

const formatTime = (timestamp: number): string => {
  if (!timestamp) return "";
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
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);

  const [showFriendModal, setShowFriendModal] = useState(false);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [friendUsername, setFriendUsername] = useState("");
  const [searchError, setSearchError] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auth
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

  // Lista de IDs de amigos
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

  // Solicitações recebidas
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
      const requests: FriendRequest[] = Object.entries(data)
        .map(([id, req]: [string, any]) => ({
          id,
          username: req.username || "Usuário",
          displayName: req.displayName || req.username || "Usuário",
          photoURL: req.photoURL || null,
          timestamp: req.timestamp || 0,
        }))
        .sort((a, b) => b.timestamp - a.timestamp);
      setIncomingRequests(requests);
    });
    return () => unsub();
  }, [mounted, user]);

  // Solicitações enviadas
  useEffect(() => {
    if (!mounted || !user) {
      setOutgoingRequests([]);
      return;
    }
    const outgoingRef = ref(db, `friends/${user.uid}/requests/outgoing`);
    const unsub = onValue(outgoingRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setOutgoingRequests([]);
        return;
      }
      const requests: FriendRequest[] = Object.entries(data)
        .map(([id, req]: [string, any]) => ({
          id,
          username: req.username || "Usuário",
          displayName: req.displayName || req.username || "Usuário",
          photoURL: req.photoURL || null,
          timestamp: req.timestamp || 0,
        }))
        .sort((a, b) => b.timestamp - a.timestamp);
      setOutgoingRequests(requests);
    });
    return () => unsub();
  }, [mounted, user]);

  // Status/perfis de todos os usuários
  useEffect(() => {
    if (!mounted || !user) return;
    const usersRef = ref(db, "users");
    const unsub = onValue(usersRef, (snapshot) => {
      setAllUsers(snapshot.val() || {});
    });
    return () => unsub();
  }, [mounted, user]);

  // Conversas (DMs)
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
          const otherId = Object.keys(dm.participants).find((uid) => uid !== user.uid) || "";
          const otherData = dm.participants[otherId] || {};
          return {
            dmId: id,
            userId: otherId,
            username: otherData.username || "",
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

  const handleAcceptRequest = async (requestId: string) => {
    if (!user || processingRequest) return;
    setProcessingRequest(requestId);
    try {
      const requesterId = requestId;
      
      // Adicionar à lista de amigos de ambos
      await set(ref(db, `friends/${user.uid}/friends/${requesterId}`), {
        addedAt: Date.now()
      });
      await set(ref(db, `friends/${requesterId}/friends/${user.uid}`), {
        addedAt: Date.now()
      });

      // Remover a solicitação recebida
      await remove(ref(db, `friends/${user.uid}/requests/incoming/${requesterId}`));
      // Remover a solicitação enviada pelo outro usuário
      await remove(ref(db, `friends/${requesterId}/requests/outgoing/${user.uid}`));

      // Atualizar lista local
      setIncomingRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error) {
      console.error("Erro ao aceitar solicitação:", error);
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    if (!user || processingRequest) return;
    setProcessingRequest(requestId);
    try {
      // Remover a solicitação recebida
      await remove(ref(db, `friends/${user.uid}/requests/incoming/${requestId}`));
      // Remover a solicitação enviada pelo outro usuário
      await remove(ref(db, `friends/${requestId}/requests/outgoing/${user.uid}`));

      setIncomingRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error) {
      console.error("Erro ao rejeitar solicitação:", error);
    } finally {
      setProcessingRequest(null);
    }
  };

  const closeFriendModal = () => {
    setShowFriendModal(false);
    setFriendUsername("");
    setSearchError("");
    setSearchResult(null);
  };

  const closeRequestsModal = () => {
    setShowRequestsModal(false);
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

      const friendCheckRef = ref(db, `friends/${user.uid}/friends/${targetId}`);
      const friendSnap = await get(friendCheckRef);
      if (friendSnap.exists()) {
        setSearchError("Você já é amigo deste usuário");
        setSearchLoading(false);
        return;
      }

      const outgoingCheckRef = ref(db, `friends/${user.uid}/requests/outgoing/${targetId}`);
      const outgoingSnap = await get(outgoingCheckRef);
      if (outgoingSnap.exists()) {
        setSearchError("Solicitação de amizade já enviada");
        setSearchLoading(false);
        return;
      }

      const incomingCheckRef = ref(db, `friends/${user.uid}/requests/incoming/${targetId}`);
      const incomingSnap = await get(incomingCheckRef);
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

  const totalRequests = incomingRequests.length + outgoingRequests.length;

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
      {/* Orbs decorativos */}
      <div className="fixed w-[800px] h-[800px] -top-[300px] -right-[200px] bg-[radial-gradient(circle,rgba(167,139,250,0.06)_0%,transparent_70%)] pointer-events-none z-0 blur-[80px]" aria-hidden="true" />
      <div className="fixed w-[600px] h-[600px] -bottom-[200px] -left-[200px] bg-[radial-gradient(circle,rgba(255,138,91,0.04)_0%,transparent_70%)] pointer-events-none z-0 blur-[80px]" aria-hidden="true" />

      {/* Container principal */}
      <div className="relative z-10 flex flex-col w-full max-w-[1400px] h-[calc(100vh-16px)] sm:h-[calc(100vh-40px)] max-h-[900px] bg-white/2 backdrop-blur-[40px] border border-white/4 rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.5)]">
        <div className="w-full h-full flex flex-col overflow-hidden px-4 sm:px-6 md:px-8 py-4 sm:py-6">
          {/* Header */}
          <div className="flex items-center gap-2 sm:gap-4 justify-between mb-4 sm:mb-6 flex-shrink-0 flex-wrap">
            <div className="flex items-center gap-1 sm:gap-2 min-w-0">
              <button
                type="button"
                className="flex items-center justify-center w-9 h-9 flex-shrink-0 bg-transparent border-none rounded-lg text-[#7a6a9a] cursor-pointer transition-all duration-200 hover:bg-[rgba(255,255,255,0.04)] hover:text-[#f0ebff]"
                onClick={() => router.push("/general")}
                title="Voltar"
              >
                <FaArrowLeft />
              </button>
              <h1 className="font-['Sora','Inter',system-ui,sans-serif] text-lg sm:text-xl font-bold text-[#f0ebff] m-0 flex items-center gap-2 sm:gap-2.5 truncate">
                <FaComment className="text-[#a78bfa] flex-shrink-0" />
                <span className="truncate">Mensagens diretas</span>
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {/* Botão de solicitações */}
              <button
                type="button"
                className="relative flex items-center justify-center h-10 px-3 sm:px-4 bg-white/3 border border-white/6 rounded-xl text-[#b8a8d9] cursor-pointer transition-all duration-200 hover:bg-white/6 hover:text-[#f0ebff] hover:border-[#a78bfa]"
                onClick={() => setShowRequestsModal(true)}
                title="Solicitações de amizade"
              >
                <FaBell className="text-sm sm:text-base" />
                {totalRequests > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center bg-[#ff8a5b] text-[10px] font-bold text-white rounded-full shadow-[0_2px_8px_rgba(255,138,91,0.4)]">
                    {totalRequests}
                  </span>
                )}
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-2 h-10 px-3 sm:px-4 bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] border-none rounded-xl text-white text-sm font-bold cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(167,139,250,0.35)] flex-shrink-0"
                onClick={() => setShowFriendModal(true)}
              >
                <FaUserPlus />
                <span className="hidden sm:inline">Adicionar amigo</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[rgba(167,139,250,0.2)] [&::-webkit-scrollbar-thumb]:rounded-full">
            {/* Amigos online */}
            <div className="mb-7">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-[#b8a8d9] uppercase tracking-wide m-0 flex items-center gap-2">
                  <FaCircle className="text-[#4fd8c4] text-[0.55rem]" />
                  Amigos online
                </h3>
                <span className="text-xs font-semibold text-[#7a6a9a] bg-white/3 px-2.5 py-1 rounded-full">
                  {onlineFriends.length}
                </span>
              </div>

              {onlineFriends.length === 0 ? (
                <p className="text-sm text-[#7a6a9a] m-0">Nenhum amigo online no momento.</p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {onlineFriends.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      className="flex items-center gap-3 p-3 bg-white/2 border border-white/4 rounded-[14px] cursor-pointer transition-all duration-200 text-left text-inherit font-inherit hover:bg-white/5 hover:border-[rgba(167,139,250,0.15)] hover:scale-105 min-w-[160px] max-w-[200px]"
                      onClick={() => router.push(`/dm/${f.id}`)}
                    >
                      <div className="relative w-11 h-11 flex-shrink-0 rounded-[12px] bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] flex items-center justify-center text-white text-sm font-bold uppercase overflow-hidden">
                        {f.photoURL ? (
                          <img src={f.photoURL} alt={f.displayName} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          f.displayName.charAt(0).toUpperCase()
                        )}
                        <span
                          className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0a0618]"
                          style={{
                            background: f.status === "online" ? "#4fd8c4" : "#fbbf24",
                            boxShadow: f.status === "online" ? "0 0 6px #4fd8c4" : "0 0 6px #fbbf24",
                          }}
                        />
                      </div>
                      <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                        <span className="text-sm font-semibold text-[#f0ebff] whitespace-nowrap overflow-hidden text-ellipsis">
                          {f.displayName}
                        </span>
                        <span className="text-[0.75rem] text-[#7a6a9a]">@{f.username || "usuário"}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Conversas */}
            <div>
              <h3 className="text-sm font-bold text-[#b8a8d9] uppercase tracking-wide m-0 mb-3">
                Conversas
              </h3>

              {conversations.length === 0 ? (
                <div className="text-center py-14 px-4 bg-white/2 border border-white/4 rounded-2xl">
                  <div className="w-[60px] h-[60px] mx-auto mb-3 flex items-center justify-center rounded-[18px] bg-white/2 border border-white/4 text-[#7a6a9a] text-xl">
                    <FaComment />
                  </div>
                  <p className="font-['Sora','Inter',system-ui,sans-serif] text-sm font-bold text-[#f0ebff] m-0 mb-1">
                    Nenhuma conversa ainda
                  </p>
                  <span className="text-sm text-[#7a6a9a]">
                    {friends.length === 0
                      ? "Adicione amigos para começar a conversar"
                      : "Clique em um amigo online para começar"}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {conversations.map((c) => (
                    <button
                      key={c.dmId}
                      type="button"
                      className="flex items-center gap-3 p-3 bg-transparent border border-transparent rounded-[14px] cursor-pointer transition-all duration-200 text-left hover:bg-white/3 hover:border-white/4"
                      onClick={() => router.push(`/dm/${c.userId}`)}
                    >
                      <div className="relative w-12 h-12 flex-shrink-0 rounded-[12px] bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] flex items-center justify-center text-white text-sm font-bold uppercase overflow-hidden">
                        {c.photoURL ? (
                          <img src={c.photoURL} alt={c.displayName} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          c.displayName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-[#f0ebff] truncate">{c.displayName}</span>
                          {c.lastMessageTime > 0 && (
                            <span className="text-[0.7rem] text-[#7a6a9a] flex-shrink-0">{formatTime(c.lastMessageTime)}</span>
                          )}
                        </div>
                        <p className="text-[0.8rem] text-[#7a6a9a] m-0 truncate">{buildPreviewText(c.lastMessage)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Modal Adicionar Amigo */}
    {showFriendModal && (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-3xl flex items-center justify-center z-[2000] p-5" onClick={closeFriendModal}>
        <div className="relative w-full max-w-[440px] p-6 sm:p-10 sm:px-9 bg-[linear-gradient(165deg,rgba(20,10,40,0.98),rgba(30,15,50,0.98))] backdrop-blur-[20px] border border-white/6 rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.6)] text-center" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="absolute top-4 right-4 flex items-center justify-center w-9 h-9 bg-white/3 border border-white/6 rounded-[10px] text-[#7a6a9a] text-sm cursor-pointer transition-all duration-200 hover:bg-white/8 hover:text-[#f0ebff]"
            onClick={closeFriendModal}
          >
            <FaTimes />
          </button>
          <div className="w-[60px] h-[60px] mx-auto mb-4 flex items-center justify-center rounded-[16px] bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] text-white text-2xl shadow-[0_4px_16px_rgba(167,139,250,0.25)]">
            <FaUserPlus />
          </div>
          <h2 className="font-['Sora','Inter',system-ui,sans-serif] text-xl font-bold text-[#f0ebff] m-0 mb-1.5">Adicionar amigo</h2>
          <p className="text-sm text-[#b8a8d9] leading-relaxed m-0 mb-6">
            Digite o username da pessoa que você quer adicionar.
          </p>
          <div className="flex flex-col gap-4 text-left">
            <div className="flex flex-col gap-1.5 relative">
              <label htmlFor="friendUsername" className="text-sm font-semibold text-[#b8a8d9] tracking-wide">Username</label>
              <div className="flex gap-2">
                <input
                  id="friendUsername"
                  type="text"
                  placeholder="Ex: joao123"
                  className="flex-1 h-12 px-4 bg-white/3 border border-white/6 rounded-[12px] text-[#f0ebff] text-sm font-inherit outline-none transition-all duration-300 placeholder:text-[#7a6a9a] focus:border-[#a78bfa] focus:bg-white/6 disabled:opacity-50 disabled:cursor-not-allowed"
                  value={friendUsername}
                  onChange={(e) => {
                    setFriendUsername(e.target.value);
                    setSearchResult(null);
                    setSearchError("");
                  }}
                  disabled={searchLoading || sendingRequest}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (searchResult) handleSendFriendRequest();
                      else handleSearchUser();
                    }
                  }}
                />
                <button
                  type="button"
                  className="h-12 px-5 bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] border-none rounded-[12px] text-white text-sm font-bold font-inherit cursor-pointer whitespace-nowrap transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(167,139,250,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleSearchUser}
                  disabled={searchLoading || !friendUsername.trim() || sendingRequest}
                >
                  {searchLoading ? "..." : "Buscar"}
                </button>
              </div>
            </div>
            {searchError && <p className="m-0 px-3.5 py-2.5 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.15)] rounded-[10px] text-[#f87171] text-sm text-center">{searchError}</p>}
            {searchResult && (
              <div className="flex items-center gap-3 p-2.5 bg-white/3 border border-white/6 rounded-[12px]">
                <div className="w-10 h-10 flex-shrink-0 rounded-[10px] bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] flex items-center justify-center text-white text-sm font-bold uppercase overflow-hidden">
                  {searchResult.photoURL ? (
                    <img
                      src={searchResult.photoURL}
                      alt={searchResult.displayName}
                      className="w-full h-full rounded-[10px] object-cover"
                      loading="lazy"
                    />
                  ) : (
                    searchResult.displayName.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 text-left">
                  <span className="block text-sm font-semibold text-[#f0ebff]">{searchResult.displayName}</span>
                  <span className="block text-[0.75rem] text-[#7a6a9a]">@{searchResult.username}</span>
                </div>
                <FaCheck className="text-[#4fd8c4] text-base flex-shrink-0" />
              </div>
            )}
            <div className="flex justify-end gap-2.5 mt-1">
              <button
                type="button"
                className="inline-flex items-center justify-center gap-1.5 h-[42px] px-5 rounded-[10px] text-sm font-semibold font-inherit cursor-pointer transition-all duration-300 bg-transparent border-none text-[#b8a8d9] hover:bg-white/3 hover:text-[#f0ebff] disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={closeFriendModal}
                disabled={sendingRequest}
              >
                Cancelar
              </button>
              {searchResult && (
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-1.5 h-[42px] px-5 rounded-[10px] text-sm font-semibold font-inherit cursor-pointer transition-all duration-300 bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] border-none text-white shadow-[0_4px_16px_rgba(167,139,250,0.25)] hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(167,139,250,0.35)] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  onClick={handleSendFriendRequest}
                  disabled={sendingRequest}
                >
                  {sendingRequest ? "Enviando..." : "Enviar solicitação"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Modal de Solicitações */}
    {showRequestsModal && (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-3xl flex items-center justify-center z-[2000] p-5" onClick={closeRequestsModal}>
        <div className="relative w-full max-w-[520px] max-h-[80vh] p-6 sm:p-8 bg-[linear-gradient(165deg,rgba(20,10,40,0.98),rgba(30,15,50,0.98))] backdrop-blur-[20px] border border-white/6 rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.6)]" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="absolute top-4 right-4 flex items-center justify-center w-9 h-9 bg-white/3 border border-white/6 rounded-[10px] text-[#7a6a9a] text-sm cursor-pointer transition-all duration-200 hover:bg-white/8 hover:text-[#f0ebff]"
            onClick={closeRequestsModal}
          >
            <FaTimes />
          </button>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-[44px] h-[44px] flex-shrink-0 rounded-[12px] bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] flex items-center justify-center text-white text-lg shadow-[0_4px_16px_rgba(167,139,250,0.25)]">
              <FaBell />
            </div>
            <div>
              <h2 className="font-['Sora','Inter',system-ui,sans-serif] text-xl font-bold text-[#f0ebff] m-0">Solicitações</h2>
              <p className="text-sm text-[#b8a8d9] m-0">Gerencie suas solicitações de amizade</p>
            </div>
          </div>

          <div className="overflow-y-auto max-h-[calc(80vh-140px)] pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[rgba(167,139,250,0.2)] [&::-webkit-scrollbar-thumb]:rounded-full">
            {/* Solicitações recebidas */}
            <div className="mb-6">
              <h3 className="text-xs font-bold text-[#b8a8d9] uppercase tracking-wide m-0 mb-3">
                Recebidas ({incomingRequests.length})
              </h3>
              {incomingRequests.length === 0 ? (
                <p className="text-sm text-[#7a6a9a] m-0">Nenhuma solicitação recebida</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {incomingRequests.map((req) => (
                    <div key={req.id} className="flex items-center gap-3 p-3 bg-white/2 border border-white/4 rounded-[14px]">
                      <div className="w-10 h-10 flex-shrink-0 rounded-[10px] bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] flex items-center justify-center text-white text-sm font-bold uppercase overflow-hidden">
                        {req.photoURL ? (
                          <img src={req.photoURL} alt={req.displayName} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          req.displayName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-[#f0ebff] truncate">{req.displayName}</span>
                        <span className="block text-[0.75rem] text-[#7a6a9a]">@{req.username}</span>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          className="flex items-center justify-center w-9 h-9 bg-[#4fd8c4] bg-opacity-20 border border-[#4fd8c4] border-opacity-20 rounded-[10px] text-[#4fd8c4] cursor-pointer transition-all duration-200 hover:bg-[#4fd8c4] hover:bg-opacity-30 disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => handleAcceptRequest(req.id)}
                          disabled={processingRequest === req.id}
                          title="Aceitar"
                        >
                          <FaCheck />
                        </button>
                        <button
                          type="button"
                          className="flex items-center justify-center w-9 h-9 bg-[#f87171] bg-opacity-10 border border-[#f87171] border-opacity-15 rounded-[10px] text-[#f87171] cursor-pointer transition-all duration-200 hover:bg-[#f87171] hover:bg-opacity-20 disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => handleRejectRequest(req.id)}
                          disabled={processingRequest === req.id}
                          title="Rejeitar"
                        >
                          <FaTimes />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Solicitações enviadas */}
            <div>
              <h3 className="text-xs font-bold text-[#b8a8d9] uppercase tracking-wide m-0 mb-3">
                Enviadas ({outgoingRequests.length})
              </h3>
              {outgoingRequests.length === 0 ? (
                <p className="text-sm text-[#7a6a9a] m-0">Nenhuma solicitação enviada</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {outgoingRequests.map((req) => (
                    <div key={req.id} className="flex items-center gap-3 p-3 bg-white/2 border border-white/4 rounded-[14px] opacity-60">
                      <div className="w-10 h-10 flex-shrink-0 rounded-[10px] bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] flex items-center justify-center text-white text-sm font-bold uppercase overflow-hidden">
                        {req.photoURL ? (
                          <img src={req.photoURL} alt={req.displayName} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          req.displayName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-[#f0ebff] truncate">{req.displayName}</span>
                        <span className="block text-[0.75rem] text-[#7a6a9a]">@{req.username}</span>
                      </div>
                      <span className="text-xs text-[#7a6a9a] flex-shrink-0">Pendente</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}