// app/dm/DMContent.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { auth, db, ref, get, update, onValue, set, remove, push } from "@/lib/firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { FaComment, FaCircle, FaArrowLeft, FaUser } from "react-icons/fa";
import Sidebar from "@/components/Sidebar";
import DMConversation from "./DMConversation";

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
          
          {/* Área do chat - ocupa toda a largura */}
          <main className={`flex-1 flex flex-col min-w-0 bg-white/1 overflow-hidden ${
            selectedPeer ? 'flex' : 'flex'
          }`}>
            {!selectedPeer ? (
              // Painel de usuários online - centralizado
              <div className="w-full h-full flex flex-col items-center justify-center overflow-hidden px-7 py-6">
                <div className="flex items-center justify-between w-full max-w-[600px] mb-5 flex-shrink-0">
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
                      Adicione amigos pelo sidebar para ver quem está disponível
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-wrap justify-center gap-3 max-w-[600px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[rgba(167,139,250,0.2)] [&::-webkit-scrollbar-thumb]:rounded-full">
                    {onlineUsers.map((u) => (
                      <button
                        key={u.uid}
                        type="button"
                        className="flex items-center gap-3 p-3 bg-white/2 border border-white/4 rounded-[14px] cursor-pointer transition-all duration-200 text-left text-inherit font-inherit hover:bg-white/5 hover:border-[rgba(167,139,250,0.15)] hover:scale-105 min-w-[160px] flex-1 max-w-[200px]"
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
                          className="text-[0.6rem] font-semibold flex-shrink-0"
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
    </>
  );
}