// components/Sidebar.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { auth, db, signOut } from "@/lib/firebase";
import { ref, onValue, get, set, update } from "firebase/database";
import {
  FaComment,
  FaSignOutAlt,
  FaCog,
  FaPlus,
  FaTimes,
  FaUser,
  FaFolder,
} from "react-icons/fa";

interface Server {
  id: string;
  name: string;
  ownerID: string;
  icon: string | null;
}

interface AppUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [servers, setServers] = useState<Server[]>([]);
  const [isServerOwner, setIsServerOwner] = useState(false);
  const [serverIcons, setServerIcons] = useState<Record<string, string>>({});

  const [showServerModal, setShowServerModal] = useState(false);
  const [modalTab, setModalTab] = useState<"create" | "join">("create");
  const [newServerName, setNewServerName] = useState("");
  const [joinServerId, setJoinServerId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        const mappedUser: AppUser = {
          uid: currentUser.uid,
          displayName: currentUser.displayName || null,
          email: currentUser.email || null,
          photoURL: currentUser.photoURL || null,
        };
        setUser(mappedUser);
        setDisplayName(currentUser.displayName || currentUser.email || "Usuário");
        setPhotoURL(currentUser.photoURL || null);
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, [mounted]);

  useEffect(() => {
    if (!mounted || !user) {
      setServers([]);
      return;
    }

    const unsubscribe = onValue(ref(db, "servers"), (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setServers([]);
        return;
      }

      const list = Object.entries(data)
        .filter(([, s]: [string, any]) => s.ownerID === user.uid || s.members?.[user.uid])
        .map(([id, s]: [string, any]) => ({
          id,
          name: s.name,
          ownerID: s.ownerID,
          icon: s.icon || null,
        }));

      setServers(list);

      const icons: Record<string, string> = {};
      list.forEach((s) => {
        if (s.icon) icons[s.id] = s.icon;
      });
      setServerIcons(icons);
    });

    return () => unsubscribe();
  }, [mounted, user]);

  useEffect(() => {
    if (!mounted || !user || !pathname) {
      setIsServerOwner(false);
      return;
    }
    const segments = pathname.split("/");
    const serverId = segments[2];
    if (!serverId) {
      setIsServerOwner(false);
      return;
    }

    const unsub = onValue(ref(db, `servers/${serverId}/ownerID`), (snap) => {
      setIsServerOwner(snap.val() === user.uid);
    });
    return () => unsub();
  }, [mounted, user, pathname]);

  if (!mounted) return null;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  const isActive = (path: string) => {
    return pathname === path || pathname?.startsWith(path + "/");
  };

  const closeServerModal = () => {
    setShowServerModal(false);
    setModalTab("create");
    setNewServerName("");
    setJoinServerId("");
    setModalError("");
  };

  const handleCreateServer = async () => {
    if (!user) return;
    if (!newServerName.trim()) {
      setModalError("Digite um nome para o servidor");
      return;
    }
    setSubmitting(true);
    setModalError("");
    try {
      const serverId = "srv_" + Date.now() + Math.random().toString(36).substring(2, 7);
      await set(ref(db, `servers/${serverId}`), {
        id: serverId,
        name: newServerName.trim(),
        ownerID: user.uid,
        members: { [user.uid]: true },
        createdAt: Date.now(),
      });
      closeServerModal();
      router.push(`/server/${serverId}`);
    } catch (error) {
      console.error("Erro ao criar servidor:", error);
      setModalError("Erro ao criar servidor. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinServer = async () => {
    if (!user) return;
    if (!joinServerId.trim()) {
      setModalError("Digite o ID do servidor");
      return;
    }
    setSubmitting(true);
    setModalError("");
    try {
      const id = joinServerId.trim();
      const snap = await get(ref(db, `servers/${id}`));
      if (!snap.exists()) {
        setModalError("Servidor não encontrado.");
        return;
      }
      await update(ref(db, `servers/${id}/members`), { [user.uid]: true });
      closeServerModal();
      router.push(`/server/${id}`);
    } catch (error) {
      console.error("Erro ao entrar no servidor:", error);
      setModalError("Erro ao entrar no servidor. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const getServerInitial = (server: Server) => {
    if (server.name) {
      return server.name.charAt(0).toUpperCase();
    }
    return "S";
  };

  if (!user) return null;

  return (
    <>
      <nav 
        className="fixed top-0 left-0 bottom-0 w-[56px] bg-[rgba(10,6,24,0.95)] backdrop-blur-[20px] border-r border-[rgba(255,255,255,0.06)] flex flex-col items-center py-3 z-[100] overflow-y-auto [&::-webkit-scrollbar]:w-0.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[rgba(167,139,250,0.3)] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-[rgba(167,139,250,0.5)]"
        aria-label="Menu principal"
      >
        {/* Logo */}
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] flex items-center justify-center text-white text-base font-extrabold font-['Sora','Inter',system-ui,sans-serif] shadow-[0_4px_16px_rgba(167,139,250,0.25)] mb-3 flex-shrink-0">
          E
        </div>

        {/* Servidores */}
        <div className="flex flex-col items-center gap-1.5 px-0 pb-1 w-full flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-0.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[rgba(167,139,250,0.3)] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-[rgba(167,139,250,0.5)]">
          {servers.map((server) => {
            const isActiveServer = pathname?.includes(`/server/${server.id}`);
            return (
              <button
                key={server.id}
                type="button"
                className={`relative w-11 h-11 rounded-[14px] border-none text-[#f0ebff] font-bold text-sm flex items-center justify-center cursor-pointer transition-all duration-200 flex-shrink-0 overflow-hidden hover:rounded-[12px] hover:bg-gradient-to-br hover:from-[#ff8a5b] hover:to-[#a78bfa] hover:scale-105 group ${
                  isActiveServer 
                    ? "rounded-[12px] bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa]" 
                    : "bg-[rgba(255,255,255,0.06)]"
                }`}
                onClick={() => router.push(`/server/${server.id}`)}
                title={server.name}
              >
                {serverIcons[server.id] ? (
                  <img 
                    src={serverIcons[server.id]} 
                    alt={server.name}
                    className="w-full h-full object-cover rounded-[14px]"
                  />
                ) : (
                  getServerInitial(server)
                )}
                <span className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 bg-[rgba(20,10,40,0.95)] backdrop-blur-[12px] text-[#f0ebff] px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border border-[rgba(255,255,255,0.06)] shadow-[0_8px_24px_rgba(0,0,0,0.4)] opacity-0 pointer-events-none transition-all duration-200 z-[200] before:content-[''] before:absolute before:right-full before:top-1/2 before:-translate-y-1/2 before:border-6 before:border-transparent before:border-r-[rgba(20,10,40,0.95)] group-hover:opacity-100 group-hover:translate-y-1/2 group-hover:translate-x-1">
                  {server.name}
                </span>
                {isActiveServer && (
                  <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] rounded-r-[4px]" />
                )}
              </button>
            );
          })}
          
          <button
            type="button"
            className="relative w-11 h-11 rounded-[14px] bg-[rgba(255,255,255,0.06)] border border-dashed border-[rgba(255,255,255,0.2)] text-[#b8a8d9] flex items-center justify-center cursor-pointer transition-all duration-200 flex-shrink-0 hover:rounded-[12px] hover:border-solid hover:border-[#ff8a5b] hover:text-[#ff8a5b] hover:bg-[rgba(255,106,53,0.05)] hover:scale-105 group"
            onClick={() => setShowServerModal(true)}
            title="Adicionar servidor"
          >
            <FaPlus className="text-xl transition-all duration-200" />
            <span className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 bg-[rgba(20,10,40,0.95)] backdrop-blur-[12px] text-[#f0ebff] px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border border-[rgba(255,255,255,0.06)] shadow-[0_8px_24px_rgba(0,0,0,0.4)] opacity-0 pointer-events-none transition-all duration-200 z-[200] before:content-[''] before:absolute before:right-full before:top-1/2 before:-translate-y-1/2 before:border-6 before:border-transparent before:border-r-[rgba(20,10,40,0.95)] group-hover:opacity-100 group-hover:translate-y-1/2 group-hover:translate-x-1">
              Adicionar servidor
            </span>
          </button>
        </div>

        {/* Navegação - apenas DM e Configurações com balões */}
        <div className="flex flex-col items-center gap-1 w-full py-2 flex-shrink-0 border-t border-[rgba(255,255,255,0.06)] mt-auto">
          {/* Balão para DM */}
          <button
            type="button"
            className={`relative flex items-center justify-center w-11 h-11 rounded-[12px] border-none text-xl cursor-pointer transition-all duration-200 p-0 hover:bg-[rgba(255,255,255,0.08)] hover:text-[#f0ebff] hover:scale-105 group ${
              isActive("/dm") 
                ? "bg-[rgba(167,139,250,0.15)] text-[#a78bfa]" 
                : "bg-transparent text-[#7a6a9a]"
            }`}
            onClick={() => router.push("/dm")}
            title="Mensagens"
          >
            <FaComment className="text-xl transition-all duration-200 hover:scale-110" />
            <span className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 bg-[rgba(20,10,40,0.95)] backdrop-blur-[12px] text-[#f0ebff] px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border border-[rgba(255,255,255,0.06)] shadow-[0_8px_24px_rgba(0,0,0,0.4)] opacity-0 pointer-events-none transition-all duration-200 z-[200] before:content-[''] before:absolute before:right-full before:top-1/2 before:-translate-y-1/2 before:border-6 before:border-transparent before:border-r-[rgba(20,10,40,0.95)] group-hover:opacity-100 group-hover:translate-y-1/2 group-hover:translate-x-1">
              Mensagens
            </span>
            {isActive("/dm") && (
              <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] rounded-r-[4px]" />
            )}
          </button>

          {/* Balão para Configurações */}
          <button
            type="button"
            className={`relative flex items-center justify-center w-11 h-11 rounded-[12px] border-none text-xl cursor-pointer transition-all duration-200 p-0 hover:bg-[rgba(255,255,255,0.08)] hover:text-[#f0ebff] hover:scale-105 group ${
              isActive("/settings") 
                ? "bg-[rgba(167,139,250,0.15)] text-[#a78bfa]" 
                : "bg-transparent text-[#7a6a9a]"
            }`}
            onClick={() => router.push("/settings")}
            title="Configurações"
          >
            <FaCog className="text-xl transition-all duration-200 hover:scale-110" />
            <span className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 bg-[rgba(20,10,40,0.95)] backdrop-blur-[12px] text-[#f0ebff] px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border border-[rgba(255,255,255,0.06)] shadow-[0_8px_24px_rgba(0,0,0,0.4)] opacity-0 pointer-events-none transition-all duration-200 z-[200] before:content-[''] before:absolute before:right-full before:top-1/2 before:-translate-y-1/2 before:border-6 before:border-transparent before:border-r-[rgba(20,10,40,0.95)] group-hover:opacity-100 group-hover:translate-y-1/2 group-hover:translate-x-1">
              Configurações
            </span>
            {isActive("/settings") && (
              <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] rounded-r-[4px]" />
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="w-full flex flex-col items-center gap-1.5 pt-3 flex-shrink-0 border-t border-[rgba(255,255,255,0.06)]">
          <div className="relative w-10 h-10 rounded-full border-2 border-[rgba(167,139,250,0.2)] overflow-hidden flex-shrink-0 transition-colors duration-200 hover:border-[rgba(167,139,250,0.5)]">
            {photoURL ? (
              <img
                src={photoURL}
                alt="Avatar"
                className="w-full h-full rounded-full object-cover"
                loading="lazy"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] flex items-center justify-center text-white">
                <FaUser className="text-[1.2rem]" />
              </div>
            )}
          </div>

          <button
            type="button"
            className="relative flex items-center justify-center w-10 h-10 rounded-[12px] bg-transparent border-none text-[#7a6a9a] text-base cursor-pointer transition-all duration-200 hover:bg-[rgba(239,68,68,0.1)] hover:text-[#f87171] hover:scale-105 group"
            onClick={handleLogout}
            title="Sair"
          >
            <FaSignOutAlt className="text-base transition-all duration-200 hover:scale-110" />
            <span className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 bg-[rgba(20,10,40,0.95)] backdrop-blur-[12px] text-[#f0ebff] px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border border-[rgba(255,255,255,0.06)] shadow-[0_8px_24px_rgba(0,0,0,0.4)] opacity-0 pointer-events-none transition-all duration-200 z-[200] before:content-[''] before:absolute before:right-full before:top-1/2 before:-translate-y-1/2 before:border-6 before:border-transparent before:border-r-[rgba(20,10,40,0.95)] group-hover:opacity-100 group-hover:translate-y-1/2 group-hover:translate-x-1">
              Sair
            </span>
          </button>
        </div>
      </nav>

      {/* Modal Servidor */}
      {showServerModal && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-[12px] flex items-center justify-center z-[2000] p-5"
          onClick={closeServerModal}
        >
          <div 
            className="relative w-full max-w-[440px] p-8 px-7 bg-[linear-gradient(165deg,#1d0e2e,#2b1140)] border border-[rgba(255,255,255,0.06)] rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.6)]"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              type="button" 
              className="absolute top-4 right-4 flex items-center justify-center w-9 h-9 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-[10px] text-[#7a6a9a] text-sm cursor-pointer transition-all duration-200 hover:bg-[rgba(255,255,255,0.08)] hover:text-[#f0ebff]"
              onClick={closeServerModal}
            >
              <FaTimes />
            </button>
            
            <div className="w-14 h-14 mx-auto mb-3 flex items-center justify-center rounded-[16px] bg-[rgba(255,138,91,0.15)] border border-[rgba(255,255,255,0.06)] text-[#ff8a5b] text-[1.4rem]">
              <FaPlus />
            </div>
            
            <h2 className="font-['Sora','Inter',system-ui,sans-serif] text-xl font-bold text-[#f0ebff] m-0 mb-5 text-center">
              Adicionar servidor
            </h2>

            <div className="flex gap-2 mb-5 border-b border-[rgba(255,255,255,0.06)]">
              <button
                type="button"
                className={`flex-1 flex items-center justify-center gap-1.5 bg-transparent border-none py-2.5 text-sm font-semibold font-inherit cursor-pointer border-b-2 transition-all duration-200 ${
                  modalTab === "create" 
                    ? "text-[#ff8a5b] border-[#ff8a5b]" 
                    : "text-[#7a6a9a] border-transparent hover:text-[#b8a8d9]"
                }`}
                onClick={() => { setModalTab("create"); setModalError(""); }}
              >
                <FaPlus className="text-sm" /> Criar
              </button>
              <button
                type="button"
                className={`flex-1 flex items-center justify-center gap-1.5 bg-transparent border-none py-2.5 text-sm font-semibold font-inherit cursor-pointer border-b-2 transition-all duration-200 ${
                  modalTab === "join" 
                    ? "text-[#ff8a5b] border-[#ff8a5b]" 
                    : "text-[#7a6a9a] border-transparent hover:text-[#b8a8d9]"
                }`}
                onClick={() => { setModalTab("join"); setModalError(""); }}
              >
                <FaFolder className="text-sm" /> Entrar
              </button>
            </div>

            {modalTab === "create" ? (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="serverName" className="text-sm font-semibold text-[#b8a8d9] tracking-wide">
                    Nome do servidor
                  </label>
                  <input
                    id="serverName"
                    type="text"
                    placeholder="Ex: Meu servidor"
                    className="h-11 px-3.5 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-[10px] text-[#f0ebff] text-sm font-inherit outline-none transition-all duration-300 placeholder:text-[#7a6a9a] focus:border-[#a78bfa] focus:bg-[rgba(255,255,255,0.06)] disabled:opacity-50 disabled:cursor-not-allowed"
                    value={newServerName}
                    onChange={(e) => { setNewServerName(e.target.value); setModalError(""); }}
                    disabled={submitting}
                    autoFocus
                  />
                </div>
                {modalError && (
                  <p className="m-0 px-3.5 py-2.5 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.15)] rounded-[10px] text-[#f87171] text-sm text-center">
                    {modalError}
                  </p>
                )}
                <button
                  type="button"
                  className="inline-flex items-center justify-center h-11 px-5 rounded-[10px] text-sm font-semibold font-inherit cursor-pointer transition-all duration-300 bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] border-none text-white shadow-[0_4px_16px_rgba(167,139,250,0.25)] hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(167,139,250,0.35)] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  onClick={handleCreateServer}
                  disabled={submitting || !newServerName.trim()}
                >
                  {submitting ? "Criando..." : "Criar servidor"}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="joinServerId" className="text-sm font-semibold text-[#b8a8d9] tracking-wide">
                    ID do servidor
                  </label>
                  <input
                    id="joinServerId"
                    type="text"
                    placeholder="Cole o ID do servidor"
                    className="h-11 px-3.5 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-[10px] text-[#f0ebff] text-sm font-inherit outline-none transition-all duration-300 placeholder:text-[#7a6a9a] focus:border-[#a78bfa] focus:bg-[rgba(255,255,255,0.06)] disabled:opacity-50 disabled:cursor-not-allowed"
                    value={joinServerId}
                    onChange={(e) => { setJoinServerId(e.target.value); setModalError(""); }}
                    disabled={submitting}
                    autoFocus
                  />
                  <p className="text-[0.7rem] text-[#7a6a9a] m-0 leading-tight">
                    O ID do servidor está na URL: <br />
                    <code className="bg-[rgba(255,255,255,0.05)] px-2 py-0.5 rounded text-[0.7rem] text-[#a78bfa]">/server/[ID]</code>
                  </p>
                </div>
                {modalError && (
                  <p className="m-0 px-3.5 py-2.5 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.15)] rounded-[10px] text-[#f87171] text-sm text-center">
                    {modalError}
                  </p>
                )}
                <button
                  type="button"
                  className="inline-flex items-center justify-center h-11 px-5 rounded-[10px] text-sm font-semibold font-inherit cursor-pointer transition-all duration-300 bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] border-none text-white shadow-[0_4px_16px_rgba(167,139,250,0.25)] hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(167,139,250,0.35)] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  onClick={handleJoinServer}
                  disabled={submitting || !joinServerId.trim()}
                >
                  {submitting ? "Entrando..." : "Entrar"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}