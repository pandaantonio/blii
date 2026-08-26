// app/servers/ServersContent.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db, ref, get, set, update, onValue } from "@/lib/firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { FaServer, FaPlus, FaTimes, FaArrowLeft, FaCrown } from "react-icons/fa";

interface AppUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

interface Server {
  id: string;
  name: string;
  ownerID: string;
  icon: string | null;
  memberCount: number;
}

export default function ServersContent() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const [servers, setServers] = useState<Server[]>([]);

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

    const unsubscribe = onAuthStateChanged(auth, (currentUser: FirebaseUser | null) => {
      if (!currentUser) {
        router.push("/");
        return;
      }
      setUser({
        uid: currentUser.uid,
        displayName: currentUser.displayName || null,
        email: currentUser.email || null,
        photoURL: currentUser.photoURL || null,
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [mounted, router]);

  useEffect(() => {
    if (!mounted || !user) {
      setServers([]);
      return;
    }

    const unsub = onValue(ref(db, "servers"), (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setServers([]);
        return;
      }
      const list: Server[] = Object.entries(data)
        .filter(([, s]: [string, any]) => s.ownerID === user.uid || s.members?.[user.uid])
        .map(([id, s]: [string, any]) => ({
          id,
          name: s.name,
          ownerID: s.ownerID,
          icon: s.icon || null,
          memberCount: s.members ? Object.keys(s.members).length : 0,
        }));
      setServers(list);
    });

    return () => unsub();
  }, [mounted, user]);

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
                  <FaServer className="text-[#a78bfa] flex-shrink-0" />
                  <span className="truncate">Servidores</span>
                </h1>
              </div>
              <button
                type="button"
                className="flex items-center justify-center gap-2 h-10 px-3 sm:px-4 bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] border-none rounded-xl text-white text-sm font-bold cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(167,139,250,0.35)] flex-shrink-0"
                onClick={() => setShowServerModal(true)}
              >
                <FaPlus />
                <span className="hidden sm:inline">Novo servidor</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[rgba(167,139,250,0.2)] [&::-webkit-scrollbar-thumb]:rounded-full">
              {servers.length === 0 ? (
                <div className="text-center py-16 px-4 bg-white/2 border border-white/4 rounded-2xl">
                  <div className="w-[60px] h-[60px] mx-auto mb-3 flex items-center justify-center rounded-[18px] bg-white/2 border border-white/4 text-[#7a6a9a] text-xl">
                    <FaServer />
                  </div>
                  <p className="font-['Sora','Inter',system-ui,sans-serif] text-sm font-bold text-[#f0ebff] m-0 mb-1">
                    Nenhum servidor ainda
                  </p>
                  <span className="text-sm text-[#7a6a9a]">Crie um servidor ou entre em um existente</span>
                  <div className="mt-5">
                    <button
                      type="button"
                      className="px-6 py-3 bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] border-none rounded-xl text-white text-sm font-bold font-inherit cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(167,139,250,0.35)] inline-flex items-center gap-2"
                      onClick={() => setShowServerModal(true)}
                    >
                      <FaPlus /> Criar ou entrar em um servidor
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {servers.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="flex items-center gap-3 p-3.5 bg-white/2 border border-white/4 rounded-xl cursor-pointer transition-all duration-200 text-left hover:bg-white/5 hover:border-[rgba(167,139,250,0.2)]"
                      onClick={() => router.push(`/server/${s.id}`)}
                    >
                      <div className="w-12 h-12 flex-shrink-0 rounded-[14px] bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] flex items-center justify-center text-white font-['Sora','Inter',system-ui,sans-serif] text-lg font-bold overflow-hidden">
                        {s.icon ? (
                          <img src={s.icon} alt={s.name} className="w-full h-full object-cover" />
                        ) : (
                          s.name?.charAt(0).toUpperCase() || "S"
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-[#f0ebff] truncate">{s.name}</span>
                          {s.ownerID === user.uid && <FaCrown className="text-[#fbbf24] text-xs flex-shrink-0" />}
                        </div>
                        <span className="text-xs text-[#7a6a9a]">{s.memberCount} membro{s.memberCount === 1 ? "" : "s"}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Criar/Entrar em servidor */}
      {showServerModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-3xl flex items-center justify-center z-[2000] p-5" onClick={closeServerModal}>
          <div className="relative w-full max-w-[440px] p-6 sm:p-10 sm:px-9 bg-[linear-gradient(165deg,rgba(20,10,40,0.98),rgba(30,15,50,0.98))] backdrop-blur-[20px] border border-white/6 rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.6)] text-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="absolute top-4 right-4 flex items-center justify-center w-9 h-9 bg-white/3 border border-white/6 rounded-[10px] text-[#7a6a9a] text-sm cursor-pointer transition-all duration-200 hover:bg-white/8 hover:text-[#f0ebff]"
              onClick={closeServerModal}
            >
              <FaTimes />
            </button>
            <div className="w-[60px] h-[60px] mx-auto mb-4 flex items-center justify-center rounded-[16px] bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] text-white text-2xl shadow-[0_4px_16px_rgba(167,139,250,0.25)]">
              <FaServer />
            </div>
            <h2 className="font-['Sora','Inter',system-ui,sans-serif] text-xl font-bold text-[#f0ebff] m-0 mb-5">Servidor</h2>

            <div className="flex gap-2 mb-5">
              <button
                type="button"
                className={`flex-1 h-10 rounded-[10px] text-sm font-semibold font-inherit cursor-pointer transition-all duration-200 border ${modalTab === "create" ? "bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] border-transparent text-white" : "bg-transparent border-white/6 text-[#7a6a9a] hover:border-white/15"}`}
                onClick={() => { setModalTab("create"); setModalError(""); }}
              >
                Criar
              </button>
              <button
                type="button"
                className={`flex-1 h-10 rounded-[10px] text-sm font-semibold font-inherit cursor-pointer transition-all duration-200 border ${modalTab === "join" ? "bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] border-transparent text-white" : "bg-transparent border-white/6 text-[#7a6a9a] hover:border-white/15"}`}
                onClick={() => { setModalTab("join"); setModalError(""); }}
              >
                Entrar
              </button>
            </div>

            {modalTab === "create" ? (
              <div className="flex flex-col gap-4 text-left">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="serverName" className="text-sm font-semibold text-[#b8a8d9] tracking-wide">
                    Nome do servidor
                  </label>
                  <input
                    id="serverName"
                    type="text"
                    placeholder="Ex: Meu servidor"
                    className="h-11 px-3.5 bg-white/3 border border-white/6 rounded-[10px] text-[#f0ebff] text-sm font-inherit outline-none transition-all duration-300 placeholder:text-[#7a6a9a] focus:border-[#a78bfa] focus:bg-white/6 disabled:opacity-50 disabled:cursor-not-allowed"
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
              <div className="flex flex-col gap-4 text-left">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="joinServerId" className="text-sm font-semibold text-[#b8a8d9] tracking-wide">
                    ID do servidor
                  </label>
                  <input
                    id="joinServerId"
                    type="text"
                    placeholder="Cole o ID do servidor"
                    className="h-11 px-3.5 bg-white/3 border border-white/6 rounded-[10px] text-[#f0ebff] text-sm font-inherit outline-none transition-all duration-300 placeholder:text-[#7a6a9a] focus:border-[#a78bfa] focus:bg-white/6 disabled:opacity-50 disabled:cursor-not-allowed"
                    value={joinServerId}
                    onChange={(e) => { setJoinServerId(e.target.value); setModalError(""); }}
                    disabled={submitting}
                    autoFocus
                  />
                  <p className="text-[0.7rem] text-[#7a6a9a] m-0 leading-tight">
                    O ID do servidor está na URL: <br />
                    <code className="bg-white/5 px-2 py-0.5 rounded text-[0.7rem] text-[#a78bfa]">/server/[ID]</code>
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
