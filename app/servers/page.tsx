// app/servers/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { ref, onValue, get, set, update } from "firebase/database";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { FaPlus, FaUsers, FaCrown, FaServer, FaTimes, FaCompass } from "react-icons/fa";

interface AppUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

interface ServerListItem {
  id: string;
  name: string;
  icon: string | null;
  ownerID: string;
  memberCount: number;
}

export default function ServersPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [servers, setServers] = useState<ServerListItem[]>([]);

  const [showModal, setShowModal] = useState(false);
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
    });
    return () => unsubscribe();
  }, [mounted, router]);

  useEffect(() => {
    if (!mounted || !user) return;

    const unsubscribe = onValue(ref(db, "servers"), (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setServers([]);
        setLoading(false);
        return;
      }

      const list: ServerListItem[] = Object.entries(data)
        .filter(([, s]: [string, any]) => s.ownerID === user.uid || s.members?.[user.uid])
        .map(([id, s]: [string, any]) => ({
          id,
          name: s.name,
          icon: s.icon || null,
          ownerID: s.ownerID,
          memberCount: s.members ? Object.keys(s.members).length : 0,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      setServers(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [mounted, user]);

  const closeModal = () => {
    setShowModal(false);
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
      closeModal();
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
      closeModal();
      router.push(`/server/${id}`);
    } catch (error) {
      console.error("Erro ao entrar no servidor:", error);
      setModalError("Erro ao entrar no servidor. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen min-h-dvh flex flex-col items-center justify-center gap-4 text-[#b8a8d9] text-sm ml-0 md:ml-[68px] w-full md:w-[calc(100%-68px)] bg-[radial-gradient(ellipse_at_20%_20%,#1a0a2e_0%,#0a0618_50%,#2d1045_100%)]">
        <div className="w-10 h-10 border-3 border-white/6 border-t-[#a78bfa] rounded-full animate-spin" />
        <p>Carregando servidores...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-dvh ml-0 md:ml-[68px] w-full md:w-[calc(100%-68px)] bg-[radial-gradient(ellipse_at_20%_20%,#1a0a2e_0%,#0a0618_50%,#2d1045_100%)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 mb-8 md:mb-10">
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] flex items-center justify-center text-white shadow-[0_8px_32px_rgba(167,139,250,0.25)] flex-shrink-0">
            <FaServer className="text-xl md:text-2xl" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-['Sora','Inter',system-ui,sans-serif] text-xl md:text-2xl font-bold text-[#f0ebff] m-0">
              Seus servidores
            </h1>
            <p className="text-xs md:text-sm text-[#7a6a9a] mt-1 m-0">
              {servers.length === 0
                ? "Você ainda não faz parte de nenhum servidor"
                : `${servers.length} servidor${servers.length === 1 ? "" : "es"}`}
            </p>
          </div>
          <button
            type="button"
            className="flex items-center justify-center gap-2 h-11 px-5 bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] border-none rounded-xl text-white text-sm font-bold cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(167,139,250,0.35)] flex-shrink-0"
            onClick={() => setShowModal(true)}
          >
            <FaPlus />
            Criar ou entrar
          </button>
        </div>

        {/* Lista de servidores */}
        {servers.length === 0 ? (
          <div className="text-center py-20 px-4 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] rounded-2xl">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-2xl bg-[rgba(167,139,250,0.1)] text-[#a78bfa] text-2xl">
              <FaCompass />
            </div>
            <p className="text-sm text-[#b8a8d9] m-0">Nenhum servidor por aqui ainda</p>
            <span className="text-xs text-[#7a6a9a]">Crie o seu próprio servidor ou entre em um existente</span>
            <div className="mt-6">
              <button
                type="button"
                className="px-6 py-3 bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] border-none rounded-xl text-white text-sm font-bold font-inherit cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(167,139,250,0.35)] inline-flex items-center gap-2"
                onClick={() => setShowModal(true)}
              >
                <FaPlus /> Criar servidor
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {servers.map((server) => (
              <button
                key={server.id}
                type="button"
                className="group flex items-center gap-4 p-4 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-2xl cursor-pointer transition-all duration-200 hover:bg-[rgba(167,139,250,0.08)] hover:border-[rgba(167,139,250,0.2)] hover:-translate-y-0.5 text-left"
                onClick={() => router.push(`/server/${server.id}`)}
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] flex items-center justify-center text-white font-['Sora','Inter',system-ui,sans-serif] text-xl font-bold shadow-[0_4px_16px_rgba(167,139,250,0.2)] overflow-hidden flex-shrink-0">
                  {server.icon ? (
                    <img src={server.icon} alt={server.name} className="w-full h-full object-cover" />
                  ) : (
                    server.name?.charAt(0).toUpperCase() || "S"
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm md:text-base font-semibold text-[#f0ebff] m-0 truncate">
                    {server.name}
                  </h2>
                  <div className="flex items-center gap-3 mt-1 text-xs text-[#7a6a9a]">
                    <span className="flex items-center gap-1.5">
                      <FaUsers className="text-[#a78bfa]" />
                      {server.memberCount}
                    </span>
                    {server.ownerID === user?.uid && (
                      <span className="flex items-center gap-1.5 text-[#fbbf24]">
                        <FaCrown /> Dono
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modal Criar/Entrar */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-3xl flex items-center justify-center z-[2000] p-5"
          onClick={closeModal}
        >
          <div
            className="relative w-full max-w-[440px] p-10 px-9 bg-[linear-gradient(165deg,rgba(20,10,40,0.98),rgba(30,15,50,0.98))] backdrop-blur-[20px] border border-white/6 rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.6)]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute top-4 right-4 flex items-center justify-center w-9 h-9 bg-white/3 border border-white/6 rounded-[10px] text-[#7a6a9a] text-sm cursor-pointer transition-all duration-200 hover:bg-white/8 hover:text-[#f0ebff]"
              onClick={closeModal}
            >
              <FaTimes />
            </button>

            <div className="w-[60px] h-[60px] mx-auto mb-4 flex items-center justify-center rounded-[16px] bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] text-white text-2xl shadow-[0_4px_16px_rgba(167,139,250,0.25)]">
              <FaServer />
            </div>
            <h2 className="font-['Sora','Inter',system-ui,sans-serif] text-xl font-bold text-[#f0ebff] m-0 mb-1.5 text-center">
              {modalTab === "create" ? "Criar um servidor" : "Entrar em um servidor"}
            </h2>
            <p className="text-sm text-[#b8a8d9] leading-relaxed m-0 mb-6 text-center">
              {modalTab === "create"
                ? "Dê um nome ao seu novo servidor para começar."
                : "Cole o ID do servidor que você quer entrar."}
            </p>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 p-1 bg-white/3 border border-white/6 rounded-xl">
              <button
                type="button"
                className={`flex-1 h-9 rounded-[8px] text-sm font-semibold cursor-pointer transition-all duration-200 ${
                  modalTab === "create"
                    ? "bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] text-white"
                    : "bg-transparent text-[#7a6a9a] hover:text-[#f0ebff]"
                }`}
                onClick={() => { setModalTab("create"); setModalError(""); }}
              >
                Criar
              </button>
              <button
                type="button"
                className={`flex-1 h-9 rounded-[8px] text-sm font-semibold cursor-pointer transition-all duration-200 ${
                  modalTab === "join"
                    ? "bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] text-white"
                    : "bg-transparent text-[#7a6a9a] hover:text-[#f0ebff]"
                }`}
                onClick={() => { setModalTab("join"); setModalError(""); }}
              >
                Entrar
              </button>
            </div>

            {modalTab === "create" ? (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5 text-left">
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
                    onKeyDown={(e) => { if (e.key === "Enter") handleCreateServer(); }}
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
                <div className="flex flex-col gap-1.5 text-left">
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
                    onKeyDown={(e) => { if (e.key === "Enter") handleJoinServer(); }}
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
    </div>
  );
}