// app/dm/DMContent.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { auth, db, ref, get, update, onValue, set, remove, push } from "@/lib/firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { FaUserPlus, FaSearch, FaTimes, FaCheck, FaClock, FaComment, FaCircle, FaChevronLeft, FaUser } from "react-icons/fa";
import Sidebar from "@/components/Sidebar";
import DMList from "@/components/DMList";
import DMConversation from "./DMConversation";

interface Friend {
  id: string;
  username: string;
  displayName: string;
  photoURL: string | null;
}

interface FriendRequest {
  id: string;
  requesterId: string;
  username: string;
  displayName: string;
  photoURL: string | null;
  timestamp: number;
}

interface Peer {
  userId: string;
  username: string;
  displayName: string;
  photoURL: string | null;
  dmId: string | null;
}

interface AppUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export default function DMContent() {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [showRequests, setShowRequests] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [friendUsername, setFriendUsername] = useState("");
  const [searchError, setSearchError] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null);
  const [sendingRequest, setSendingRequest] = useState(false);

  const [selectedPeer, setSelectedPeer] = useState<Peer | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);

  // Verifica se há um userId na URL para abrir conversa diretamente
  useEffect(() => {
    if (!mounted || !user || !pathname) return;
    
    const segments = pathname.split("/");
    const userId = segments[2];
    
    if (userId && !selectedPeer) {
      const fetchUser = async () => {
        const userRef = ref(db, `users/${userId}`);
        const userSnap = await get(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.val();
          setSelectedPeer({
            userId: userId,
            username: userData.username || "Usuário",
            displayName: userData.displayName || userData.username || "Usuário",
            photoURL: userData.photoURL || null,
            dmId: null,
          });
        }
      };
      fetchUser();
    }
  }, [mounted, user, pathname, selectedPeer]);

  // Atualiza a URL quando seleciona um peer
  useEffect(() => {
    if (!mounted || !selectedPeer) return;
    const newPath = `/dm/${selectedPeer.userId}`;
    if (pathname !== newPath) {
      router.push(newPath, { scroll: false });
    }
  }, [mounted, selectedPeer, router, pathname]);

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

  // Friends
  useEffect(() => {
    if (!mounted || !user) return;

    const friendsRef = ref(db, `friends/${user.uid}/friends`);
    const unsubscribeFriends = onValue(friendsRef, async (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const friendIds = Object.keys(data);
        const friendPromises = friendIds.map(async (friendId) => {
          const userRef = ref(db, `users/${friendId}`);
          const userSnap = await get(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.val();
            return {
              id: friendId,
              ...userData,
              displayName: userData.displayName || userData.username || "Usuário",
              photoURL: userData.photoURL || null,
            };
          }
          return null;
        });
        const friendList = (await Promise.all(friendPromises)).filter(Boolean) as Friend[];
        setFriends(friendList);
      } else {
        setFriends([]);
      }
    });

    return () => unsubscribeFriends();
  }, [mounted, user]);

  // Friend requests
  useEffect(() => {
    if (!mounted || !user) return;

    const requestsRef = ref(db, `friends/${user.uid}/requests/incoming`);
    const unsubscribeRequests = onValue(requestsRef, async (snapshot) => {
      const data = snapshot.val();

      if (data) {
        const requestEntries = Object.entries(data);
        const requestPromises = requestEntries.map(async ([requesterId, request]: [string, any]) => {
          try {
            const userRef = ref(db, `users/${requesterId}`);
            const userSnap = await get(userRef);

            if (userSnap.exists()) {
              const userData = userSnap.val();

              const friendCheckRef = ref(db, `friends/${user!.uid}/friends/${requesterId}`);
              const friendCheckSnap = await get(friendCheckRef);

              if (friendCheckSnap.exists()) {
                await remove(ref(db, `friends/${user!.uid}/requests/incoming/${requesterId}`));
                return null;
              }

              return {
                id: requesterId,
                ...request,
                username: userData.username || "Usuário",
                displayName: userData.displayName || userData.username || "Usuário",
                photoURL: userData.photoURL || null,
                timestamp: request.timestamp || Date.now(),
              };
            }
            return null;
          } catch (error) {
            console.error("Erro ao processar solicitação:", error);
            return null;
          }
        });

        const requestList = (await Promise.all(requestPromises)).filter(Boolean) as FriendRequest[];
        requestList.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setFriendRequests(requestList);
      } else {
        setFriendRequests([]);
      }
    });

    return () => unsubscribeRequests();
  }, [mounted, user]);

  // Online users
  useEffect(() => {
    if (!mounted || !user) return;

    const usersRef = ref(db, "users");
    const unsub = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setOnlineUsers([]);
        return;
      }

      const list = Object.entries(data)
        .filter(([uid]) => uid !== user!.uid)
        .map(([uid, u]: [string, any]) => ({
          uid,
          displayName: u.displayName || u.username || "Usuário",
          username: u.username || "",
          photoURL: u.photoURL || null,
          status: u.status?.state || "offline",
          lastSeen: u.status?.lastSeen || 0,
        }))
        .filter((u) => u.status === "online" || u.status === "away")
        .sort((a, b) => {
          if (a.status === "online" && b.status !== "online") return -1;
          if (a.status !== "online" && b.status === "online") return 1;
          return b.lastSeen - a.lastSeen;
        });

      setOnlineUsers(list);
    });

    return () => unsub();
  }, [mounted, user]);

  const handleSelectConversation = (peer: Peer) => {
    setSelectedPeer(peer);
  };

  const handleBackToList = () => {
    setSelectedPeer(null);
    router.push("/dm", { scroll: false });
  };

  // Search user
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
        username: username,
        displayName: displayName,
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

      const newDmRef = push(ref(db, "dms"));
      await set(newDmRef, {
        participants: {
          [user.uid]: {
            username: username,
            displayName: displayName,
            photoURL: photoURL || null,
            joinedAt: Date.now(),
          },
          [searchResult.id]: {
            username: searchResult.username,
            displayName: searchResult.displayName,
            photoURL: searchResult.photoURL || null,
            joinedAt: Date.now(),
          },
        },
        createdAt: Date.now(),
        lastMessage: null,
        lastMessageTime: 0,
      });

      setIsModalOpen(false);
      setFriendUsername("");
      setSearchResult(null);
      setSearchError("");
    } catch (error) {
      console.error("Erro ao enviar solicitação:", error);
      setSearchError("Erro ao enviar solicitação");
    } finally {
      setSendingRequest(false);
    }
  };

  const handleAcceptRequest = async (requesterId: string) => {
    if (processingRequest || !user) return;
    setProcessingRequest(requesterId);
    try {
      const userRef = ref(db, `users/${requesterId}`);
      const userSnap = await get(userRef);
      const friendData = userSnap.exists()
        ? userSnap.val()
        : { username: "Usuário", displayName: "Usuário", photoURL: null };

      await set(ref(db, `friends/${user.uid}/friends/${requesterId}`), true);
      await set(ref(db, `friends/${requesterId}/friends/${user.uid}`), true);
      await remove(ref(db, `friends/${user.uid}/requests/incoming/${requesterId}`));
      await remove(ref(db, `friends/${requesterId}/requests/outgoing/${user.uid}`));

      const newDmRef = push(ref(db, "dms"));
      await set(newDmRef, {
        participants: {
          [user.uid]: {
            username,
            displayName,
            photoURL: photoURL || null,
            joinedAt: Date.now(),
          },
          [requesterId]: {
            username: friendData.username || "Usuário",
            displayName: friendData.displayName || "Usuário",
            photoURL: friendData.photoURL || null,
            joinedAt: Date.now(),
          },
        },
        createdAt: Date.now(),
        lastMessage: null,
        lastMessageTime: 0,
      });

      setFriendRequests((prev) => prev.filter((r) => r.id !== requesterId));

      const friendCheckRef = ref(db, `friends/${user.uid}/friends/${requesterId}`);
      const friendSnap = await get(friendCheckRef);
      if (friendSnap.exists()) {
        const userRef2 = ref(db, `users/${requesterId}`);
        const userSnap2 = await get(userRef2);
        if (userSnap2.exists()) {
          const userData = userSnap2.val();
          setFriends((prev) => [
            ...prev,
            {
              id: requesterId,
              ...userData,
              displayName: userData.displayName || userData.username || "Usuário",
              photoURL: userData.photoURL || null,
            },
          ]);
        }
      }
    } catch (error) {
      console.error("Erro ao aceitar solicitação:", error);
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRejectRequest = async (requesterId: string) => {
    if (processingRequest || !user) return;
    setProcessingRequest(requesterId);
    try {
      await remove(ref(db, `friends/${user.uid}/requests/incoming/${requesterId}`));
      await remove(ref(db, `friends/${requesterId}/requests/outgoing/${user.uid}`));
      setFriendRequests((prev) => prev.filter((r) => r.id !== requesterId));
    } catch (error) {
      console.error("Erro ao rejeitar solicitação:", error);
    } finally {
      setProcessingRequest(null);
    }
  };

  if (!mounted || loading || !user) {
    return (
      <>
        <Sidebar />
        <div className="min-h-screen min-h-dvh flex flex-col items-center justify-center gap-4 text-[#b8a8d9] text-sm pl-[64px] transition-all duration-300">
          <div className="w-10 h-10 border-3 border-white/6 border-t-[#a78bfa] rounded-full animate-spin" />
          <p>Carregando...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Sidebar />
      <div className="min-h-screen min-h-dvh relative overflow-hidden text-[#f0ebff] font-['Inter',system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] bg-[radial-gradient(ellipse_at_20%_20%,#1a0a2e_0%,#0a0618_50%,#2d1045_100%)] flex items-center justify-center p-5 transition-all duration-300 pl-[64px]">
        {/* Orbs decorativos */}
        <div className="fixed w-[800px] h-[800px] -top-[300px] -right-[200px] bg-[radial-gradient(circle,rgba(167,139,250,0.06)_0%,transparent_70%)] pointer-events-none z-0 blur-[80px]" aria-hidden="true" />
        <div className="fixed w-[600px] h-[600px] -bottom-[200px] -left-[200px] bg-[radial-gradient(circle,rgba(255,138,91,0.04)_0%,transparent_70%)] pointer-events-none z-0 blur-[80px]" aria-hidden="true" />

        {/* Container principal */}
        <div className="relative z-10 flex w-full max-w-[1400px] h-[calc(100vh-40px)] max-h-[900px] bg-white/2 backdrop-blur-[40px] border border-white/4 rounded-3xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.5)]">
          
          {/* Sidebar de conversas - compacta como a sidebar principal */}
          <aside className={`w-[56px] min-w-[56px] h-full bg-white/2 border-r border-white/4 flex flex-col overflow-hidden transition-all duration-300 ${
            selectedPeer ? 'hidden md:flex' : 'flex'
          }`}>
            {/* Header compacto */}
            <div className="flex items-center justify-center py-3 border-b border-white/4 flex-shrink-0">
              <button
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] text-white text-sm cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-[0_4px_16px_rgba(167,139,250,0.3)]"
                onClick={() => setIsModalOpen(true)}
                title="Nova mensagem"
              >
                <FaUserPlus />
              </button>
            </div>

            {/* Search compacto */}
            <div className="relative px-2 py-2 border-b border-white/4 flex-shrink-0">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7a6a9a] text-xs pointer-events-none" />
              <input
                type="text"
                placeholder=""
                className="w-full h-8 pl-7 pr-2 bg-white/4 border border-white/6 rounded-[8px] text-[#f0ebff] text-xs font-inherit outline-none transition-all duration-300 placeholder:text-[#7a6a9a] focus:border-[#a78bfa] focus:bg-white/6"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                title="Pesquisar conversas"
              />
            </div>

            {/* Lista de conversas - compacta */}
            <div className="flex-1 overflow-y-auto px-1.5 py-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[rgba(167,139,250,0.2)] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-[rgba(167,139,250,0.4)]">
              <div className="flex flex-col items-center gap-1">
                {friends.map((friend) => {
                  const isSelected = selectedPeer?.userId === friend.id;
                  return (
                    <button
                      key={friend.id}
                      type="button"
                      className={`relative w-11 h-11 rounded-[14px] border-none text-[#f0ebff] font-bold text-sm flex items-center justify-center cursor-pointer transition-all duration-200 flex-shrink-0 overflow-hidden hover:rounded-[12px] hover:bg-gradient-to-br hover:from-[#ff8a5b] hover:to-[#a78bfa] hover:scale-105 group ${
                        isSelected 
                          ? "rounded-[12px] bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa]" 
                          : "bg-[rgba(255,255,255,0.06)]"
                      }`}
                      onClick={() => handleSelectConversation({
                        userId: friend.id,
                        username: friend.username,
                        displayName: friend.displayName,
                        photoURL: friend.photoURL,
                        dmId: null,
                      })}
                      title={friend.displayName}
                    >
                      {friend.photoURL ? (
                        <img 
                          src={friend.photoURL} 
                          alt={friend.displayName}
                          className="w-full h-full object-cover rounded-[14px]"
                        />
                      ) : (
                        friend.displayName?.charAt(0)?.toUpperCase() || "?"
                      )}
                      <span className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 bg-[rgba(20,10,40,0.95)] backdrop-blur-[12px] text-[#f0ebff] px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border border-[rgba(255,255,255,0.06)] shadow-[0_8px_24px_rgba(0,0,0,0.4)] opacity-0 pointer-events-none transition-all duration-200 z-[200] before:content-[''] before:absolute before:right-full before:top-1/2 before:-translate-y-1/2 before:border-6 before:border-transparent before:border-r-[rgba(20,10,40,0.95)] group-hover:opacity-100 group-hover:translate-y-1/2 group-hover:translate-x-1">
                        {friend.displayName}
                      </span>
                      {isSelected && (
                        <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] rounded-r-[4px]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Solicitações pendentes - compacto */}
            {friendRequests.length > 0 && (
              <div className="border-t border-white/4 flex-shrink-0">
                <button
                  className="flex items-center justify-center w-full py-2 bg-transparent border-none text-[#b8a8d9] text-xs cursor-pointer transition-all duration-200 hover:bg-white/2 relative group"
                  onClick={() => setShowRequests(!showRequests)}
                  title={`${friendRequests.length} solicitações`}
                >
                  <FaClock />
                  <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 bg-[#ffcf70] text-[#201004] text-[0.5rem] font-extrabold rounded-full">
                    {friendRequests.length}
                  </span>
                  <span className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 bg-[rgba(20,10,40,0.95)] backdrop-blur-[12px] text-[#f0ebff] px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border border-[rgba(255,255,255,0.06)] shadow-[0_8px_24px_rgba(0,0,0,0.4)] opacity-0 pointer-events-none transition-all duration-200 z-[200] before:content-[''] before:absolute before:right-full before:top-1/2 before:-translate-y-1/2 before:border-6 before:border-transparent before:border-r-[rgba(20,10,40,0.95)] group-hover:opacity-100 group-hover:translate-y-1/2 group-hover:translate-x-1">
                    {friendRequests.length} solicitações
                  </span>
                </button>

                {showRequests && (
                  <div className="absolute left-[56px] top-0 w-[240px] max-h-[300px] overflow-y-auto bg-[rgba(20,10,40,0.98)] backdrop-blur-xl border border-[rgba(255,255,255,0.06)] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] p-2 z-50">
                    {friendRequests.map((request) => (
                      <div key={request.id} className="flex items-center justify-between p-2 bg-white/2 rounded-[8px] hover:bg-white/4 transition-colors duration-200 mb-1 last:mb-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] flex items-center justify-center text-white text-[0.6rem] font-bold uppercase flex-shrink-0 overflow-hidden">
                            {request.photoURL ? (
                              <img 
                                src={request.photoURL} 
                                alt={request.displayName}
                                className="w-full h-full rounded-lg object-cover"
                                loading="lazy"
                              />
                            ) : (
                              request.displayName?.charAt(0)?.toUpperCase() || "?"
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-semibold text-[#f0ebff] truncate block">{request.displayName}</span>
                            <span className="text-[0.6rem] text-[#7a6a9a] truncate block">@{request.username}</span>
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            className="flex items-center justify-center w-6 h-6 bg-[rgba(79,216,196,0.15)] border-none rounded-md text-[#4fd8c4] text-[0.6rem] cursor-pointer transition-all duration-200 hover:bg-[rgba(79,216,196,0.25)] disabled:opacity-40"
                            onClick={() => handleAcceptRequest(request.id)}
                            disabled={processingRequest === request.id}
                            title="Aceitar"
                          >
                            <FaCheck />
                          </button>
                          <button
                            className="flex items-center justify-center w-6 h-6 bg-[rgba(247,84,110,0.1)] border-none rounded-md text-[#f7546e] text-[0.6rem] cursor-pointer transition-all duration-200 hover:bg-[rgba(247,84,110,0.2)] disabled:opacity-40"
                            onClick={() => handleRejectRequest(request.id)}
                            disabled={processingRequest === request.id}
                            title="Recusar"
                          >
                            <FaTimes />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </aside>

          {/* Área do chat */}
          <main className={`flex-1 flex flex-col min-w-0 bg-white/1 overflow-hidden ${
            selectedPeer ? 'flex' : 'hidden md:flex'
          }`}>
            {!selectedPeer ? (
              // Painel de usuários online
              <div className="w-full h-full flex flex-col overflow-hidden px-7 py-6">
                <div className="flex items-center justify-between mb-5 flex-shrink-0">
                  <h3 className="font-['Sora','Inter',system-ui,sans-serif] text-lg font-bold text-[#f0ebff] m-0 flex items-center gap-2.5">
                    <FaCircle className="text-[#4fd8c4] text-[0.6rem]" />
                    Usuários Online
                  </h3>
                  <span className="text-xs font-semibold text-[#7a6a9a] bg-white/3 px-2.5 py-1 rounded-full">
                    {onlineUsers.length} online
                  </span>
                </div>

                {onlineUsers.length === 0 ? (
                  <div className="text-center m-auto max-w-[360px] p-10">
                    <div className="w-[72px] h-[72px] mx-auto mb-4 flex items-center justify-center rounded-[20px] bg-white/2 border border-white/4 text-[#7a6a9a] text-[1.8rem]">
                      <FaComment />
                    </div>
                    <p className="font-['Sora','Inter',system-ui,sans-serif] text-base font-bold text-[#f0ebff] m-0 mb-1.5">
                      Ninguém online no momento
                    </p>
                    <span className="text-sm text-[#7a6a9a] leading-relaxed">
                      Adicione amigos para ver quem está disponível
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[rgba(167,139,250,0.2)] [&::-webkit-scrollbar-thumb]:rounded-full">
                    {onlineUsers.map((u) => (
                      <button
                        key={u.uid}
                        type="button"
                        className="flex items-center gap-3 w-full p-2.5 bg-white/2 border border-white/4 rounded-[14px] cursor-pointer transition-all duration-200 text-left text-inherit font-inherit hover:bg-white/5 hover:border-[rgba(167,139,250,0.15)] hover:translate-x-1"
                        onClick={() =>
                          handleSelectConversation({
                            userId: u.uid,
                            displayName: u.displayName,
                            username: u.username,
                            photoURL: u.photoURL || null,
                            dmId: null,
                          })
                        }
                      >
                        <div className="relative w-11 h-11 flex-shrink-0 rounded-[12px] bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] flex items-center justify-center text-white text-sm font-bold uppercase overflow-hidden">
                          {u.photoURL ? (
                            <img
                              src={u.photoURL}
                              alt={u.displayName}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            u.displayName.charAt(0).toUpperCase()
                          )}
                          <span
                            className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0a0618]"
                            style={{
                              background: u.status === "online" ? "#4fd8c4" : "#fbbf24",
                              boxShadow: u.status === "online"
                                ? "0 0 6px #4fd8c4"
                                : "0 0 6px #fbbf24",
                            }}
                          />
                        </div>
                        <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                          <span className="text-sm font-semibold text-[#f0ebff] whitespace-nowrap overflow-hidden text-ellipsis">
                            {u.displayName}
                          </span>
                          <span className="text-[0.75rem] text-[#7a6a9a]">
                            @{u.username || "usuário"}
                          </span>
                        </div>
                        <span
                          className="text-[0.7rem] font-semibold flex-shrink-0"
                          style={{
                            color: u.status === "online" ? "#4fd8c4" : "#fbbf24",
                          }}
                        >
                          {u.status === "online" ? "Online" : "Ausente"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <DMConversation
                user={user}
                peer={selectedPeer}
                username={username}
                displayName={displayName}
                photoURL={photoURL}
                onBack={handleBackToList}
              />
            )}
          </main>
        </div>
      </div>

      {/* Modal adicionar amigo */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-3xl flex items-center justify-center z-[2000] p-5" onClick={() => setIsModalOpen(false)}>
          <div className="relative w-full max-w-[440px] p-10 px-9 bg-[linear-gradient(165deg,rgba(20,10,40,0.98),rgba(30,15,50,0.98))] backdrop-blur-[20px] border border-white/6 rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.6)] text-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="absolute top-4 right-4 flex items-center justify-center w-9 h-9 bg-white/3 border border-white/6 rounded-[10px] text-[#7a6a9a] text-sm cursor-pointer transition-all duration-200 hover:bg-white/8 hover:text-[#f0ebff]"
              onClick={() => setIsModalOpen(false)}
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
                  onClick={() => setIsModalOpen(false)}
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
    </>
  );
}