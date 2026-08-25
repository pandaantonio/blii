// app/settings/SettingsContent.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { ref, onValue, update, onDisconnect } from "firebase/database";
import { onAuthStateChanged, User as FirebaseUser, updateProfile } from "firebase/auth";
import {
  FaUser,
  FaSave,
  FaCheck,
  FaCircle,
  FaClock,
  FaPowerOff,
  FaArrowLeft,
} from "react-icons/fa";
import Sidebar from "@/components/Sidebar";
import ProfilePictureUpload from "@/components/ProfilePictureUpload";

interface AppUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  providerData?: any[];
  metadata?: {
    creationTime?: string;
    lastSignInTime?: string;
  };
}

interface StatusOption {
  key: "online" | "offline" | "auto";
  label: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  {
    key: "online",
    label: "Online",
    description: "Visível para todos",
    icon: FaCircle,
    color: "#4fd8c4",
  },
  {
    key: "offline",
    label: "Offline",
    description: "Aparece como ausente",
    icon: FaPowerOff,
    color: "#7a6a9a",
  },
  {
    key: "auto",
    label: "Automático",
    description: "Detecta com base na atividade",
    icon: FaClock,
    color: "#fbbf24",
  },
];

export default function SettingsContent() {
  const router = useRouter();

  const [user, setUser] = useState<AppUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  /* ── Perfil ── */
  const [displayName, setDisplayName] = useState("");
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  /* ── Status ── */
  const [status, setStatus] = useState<"online" | "offline" | "auto">("auto");
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusSaved, setStatusSaved] = useState(false);

  /* ── Auto-detect helpers ── */
  const [isTabActive, setIsTabActive] = useState(true);

  /* ── Auth listener ── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.replace("/");
        return;
      }
      setFirebaseUser(u);
      const mappedUser: AppUser = {
        uid: u.uid,
        displayName: u.displayName || null,
        email: u.email || null,
        photoURL: u.photoURL || null,
        providerData: u.providerData,
        metadata: u.metadata,
      };
      setUser(mappedUser);
      setDisplayName(u.displayName || "");
      setPhotoURL(u.photoURL || null);
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  /* ── Carrega status salvo ── */
  useEffect(() => {
    if (!user) return;
    const statusRef = ref(db, `users/${user.uid}/status`);
    const unsub = onValue(statusRef, (snap) => {
      const val = snap.val();
      if (val?.mode) setStatus(val.mode);
    });
    return () => unsub();
  }, [user]);

  /* ── Auto-detect: visibilitychange ── */
  useEffect(() => {
    const onVis = () => setIsTabActive(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  /* ── Aplica status no DB ── */
  const applyStatus = useCallback(
    async (mode: "online" | "offline" | "auto") => {
      if (!user) return;
      const userStatusRef = ref(db, `users/${user.uid}/status`);

      if (mode === "online") {
        await update(userStatusRef, {
          mode: "online",
          state: "online",
          lastSeen: Date.now(),
        });
        await onDisconnect(userStatusRef).update({
          state: "offline",
          lastSeen: Date.now(),
        });
      } else if (mode === "offline") {
        await onDisconnect(userStatusRef).cancel();
        await update(userStatusRef, {
          mode: "offline",
          state: "offline",
          lastSeen: Date.now(),
        });
      } else {
        // auto
        const derived = isTabActive ? "online" : "away";
        await update(userStatusRef, {
          mode: "auto",
          state: derived,
          lastSeen: Date.now(),
        });
        await onDisconnect(userStatusRef).update({
          state: "offline",
          lastSeen: Date.now(),
        });
      }
    },
    [user, isTabActive]
  );

  /* ── Atualiza status quando modo muda ── */
  useEffect(() => {
    if (!user) return;
    applyStatus(status);
  }, [status, user, applyStatus]);

  /* ── Atualiza status auto quando aba muda ── */
  useEffect(() => {
    if (!user || status !== "auto") return;
    applyStatus("auto");
  }, [isTabActive, status, user, applyStatus]);

  /* ── Handlers ── */
  const handleSaveProfile = async () => {
    if (!firebaseUser || !displayName.trim()) return;
    setSavingProfile(true);
    setProfileSaved(false);
    try {
      await updateProfile(firebaseUser, { displayName: displayName.trim() });
      await update(ref(db, `users/${firebaseUser.uid}`), {
        displayName: displayName.trim(),
        updatedAt: Date.now(),
      });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch (err) {
      console.error("Erro ao salvar perfil:", err);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleStatusChange = async (newStatus: "online" | "offline" | "auto") => {
    if (!user || newStatus === status) return;
    setSavingStatus(true);
    setStatusSaved(false);
    try {
      setStatus(newStatus);
      await applyStatus(newStatus);
      setStatusSaved(true);
      setTimeout(() => setStatusSaved(false), 2500);
    } catch (err) {
      console.error("Erro ao salvar status:", err);
    } finally {
      setSavingStatus(false);
    }
  };

  const handlePhotoUpdate = (url: string | null) => {
    setPhotoURL(url);
    if (user) setUser({ ...user, photoURL: url });
  };

  if (loading || !user) {
    return (
      <>
        <Sidebar />
        <div className="min-h-screen min-h-dvh flex flex-col items-center justify-center gap-4 text-[#b8a8d9] text-sm ml-[68px] w-[calc(100%-68px)]">
          <div className="w-10 h-10 border-3 border-white/6 border-t-[#a78bfa] rounded-full animate-spin" />
          <p>Carregando configurações...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Sidebar />
      <div className="min-h-screen min-h-dvh ml-[68px] w-[calc(100%-68px)] bg-[radial-gradient(ellipse_at_20%_20%,#1a0a2e_0%,#0a0618_50%,#2d1045_100%)] overflow-y-auto">
        {/* Header */}
        <header className="flex items-center gap-4 px-8 py-6 border-b border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.02)] sticky top-0 z-10 backdrop-blur-xl">
          <button
            type="button"
            className="flex items-center justify-center w-10 h-10 bg-transparent border border-[rgba(255,255,255,0.06)] rounded-xl text-[#7a6a9a] cursor-pointer transition-all duration-200 hover:bg-[rgba(255,255,255,0.04)] hover:text-[#f0ebff] hover:border-[rgba(255,255,255,0.12)]"
            onClick={() => router.back()}
            title="Voltar"
          >
            <FaArrowLeft />
          </button>
          <h1 className="font-['Sora','Inter',system-ui,sans-serif] text-xl font-bold text-[#f0ebff] m-0">Configurações</h1>
        </header>

        <main className="max-w-3xl mx-auto px-8 py-8">
          {/* ── Cartão de Perfil ── */}
          <section className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] rounded-2xl p-6 mb-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-[rgba(255,138,91,0.1)] border border-[rgba(255,138,91,0.1)] text-[#ff8a5b] text-lg flex-shrink-0">
                <FaUser />
              </div>
              <div>
                <h2 className="font-['Sora','Inter',system-ui,sans-serif] text-lg font-bold text-[#f0ebff] m-0">Perfil</h2>
                <p className="text-sm text-[#b8a8d9] m-0">Gerencie seu nome e foto de perfil</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-8">
              <div className="flex-shrink-0">
                <ProfilePictureUpload
                  currentPhotoURL={photoURL}
                  onUpdate={handlePhotoUpdate}
                />
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-sm font-semibold text-[#b8a8d9] tracking-wide mb-1.5" htmlFor="displayName">
                  Nome de exibição
                </label>
                <input
                  id="displayName"
                  type="text"
                  className="w-full h-11 px-3.5 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#f0ebff] text-sm font-inherit outline-none transition-all duration-300 placeholder:text-[#7a6a9a] focus:border-[#a78bfa] focus:bg-[rgba(255,255,255,0.06)]"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Seu nome"
                  maxLength={32}
                />
                <span className="text-xs text-[#7a6a9a] mt-1 block text-right">{displayName.length}/32</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl text-sm font-semibold font-inherit cursor-pointer transition-all duration-300 bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] border-none text-white shadow-[0_4px_16px_rgba(167,139,250,0.25)] hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(167,139,250,0.35)] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                onClick={handleSaveProfile}
                disabled={savingProfile || !displayName.trim()}
              >
                {profileSaved ? (
                  <>
                    <FaCheck /> Salvo
                  </>
                ) : savingProfile ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Salvando…
                  </>
                ) : (
                  <>
                    <FaSave /> Salvar perfil
                  </>
                )}
              </button>
            </div>
          </section>

          {/* ── Cartão de Status ── */}
          <section className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] rounded-2xl p-6 mb-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-[rgba(79,216,196,0.1)] border border-[rgba(79,216,196,0.1)] text-[#4fd8c4] text-lg flex-shrink-0">
                <FaCircle />
              </div>
              <div>
                <h2 className="font-['Sora','Inter',system-ui,sans-serif] text-lg font-bold text-[#f0ebff] m-0">Status</h2>
                <p className="text-sm text-[#b8a8d9] m-0">Controle como outros usuários te veem</p>
              </div>
            </div>

            <div className="space-y-2">
              {STATUS_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = status === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    className={`flex items-center gap-4 w-full p-4 rounded-xl border transition-all duration-200 text-left ${
                      active
                        ? "bg-[rgba(167,139,250,0.08)] border-[rgba(167,139,250,0.25)]"
                        : "bg-transparent border-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.02)]"
                    }`}
                    onClick={() => handleStatusChange(opt.key)}
                    disabled={savingStatus}
                  >
                    <span
                      className="flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0"
                      style={{ background: opt.color, boxShadow: `0 0 12px ${opt.color}40` }}
                    >
                      <Icon className="text-white text-sm" />
                    </span>
                    <div className="flex-1">
                      <span className={`block text-sm font-semibold ${active ? "text-[#f0ebff]" : "text-[#b8a8d9]"}`}>
                        {opt.label}
                      </span>
                      <span className="block text-xs text-[#7a6a9a]">{opt.description}</span>
                    </div>
                    {active && (
                      <span className="text-[#4fd8c4]">
                        <FaCheck />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {status === "auto" && (
              <div className="mt-4 flex items-center gap-2.5 p-3.5 bg-[rgba(251,191,36,0.05)] border border-[rgba(251,191,36,0.1)] rounded-xl text-sm text-[#b8a8d9]">
                <FaClock className="text-[#fbbf24] flex-shrink-0" />
                <span>
                  Modo automático: você aparece{" "}
                  <strong className="text-[#f0ebff]">{isTabActive ? "online" : "ausente"}</strong> com base na
                  atividade da aba.
                </span>
              </div>
            )}

            {statusSaved && (
              <p className="mt-4 flex items-center gap-2 text-[#4fd8c4] text-sm">
                <FaCheck /> Status atualizado
              </p>
            )}
          </section>

          {/* ── Cartão de Conta ── */}
          <section className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] rounded-2xl p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-[rgba(167,139,250,0.1)] border border-[rgba(167,139,250,0.1)] text-[#a78bfa] text-lg flex-shrink-0">
                <FaUser />
              </div>
              <div>
                <h2 className="font-['Sora','Inter',system-ui,sans-serif] text-lg font-bold text-[#f0ebff] m-0">Conta</h2>
                <p className="text-sm text-[#b8a8d9] m-0">Informações da sua conta</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3.5 bg-[rgba(255,255,255,0.02)] rounded-xl border border-[rgba(255,255,255,0.04)]">
                <span className="block text-xs font-semibold text-[#7a6a9a] uppercase tracking-wide mb-1">E-mail</span>
                <span className="block text-sm text-[#f0ebff] font-medium">{user.email || "—"}</span>
              </div>
              <div className="p-3.5 bg-[rgba(255,255,255,0.02)] rounded-xl border border-[rgba(255,255,255,0.04)]">
                <span className="block text-xs font-semibold text-[#7a6a9a] uppercase tracking-wide mb-1">ID do usuário</span>
                <span className="block text-sm text-[#f0ebff] font-mono text-xs truncate">{user.uid}</span>
              </div>
              <div className="p-3.5 bg-[rgba(255,255,255,0.02)] rounded-xl border border-[rgba(255,255,255,0.04)]">
                <span className="block text-xs font-semibold text-[#7a6a9a] uppercase tracking-wide mb-1">Provedor</span>
                <span className="block text-sm text-[#f0ebff] font-medium">
                  {user.providerData?.[0]?.providerId || "—"}
                </span>
              </div>
              <div className="p-3.5 bg-[rgba(255,255,255,0.02)] rounded-xl border border-[rgba(255,255,255,0.04)]">
                <span className="block text-xs font-semibold text-[#7a6a9a] uppercase tracking-wide mb-1">Conta criada</span>
                <span className="block text-sm text-[#f0ebff] font-medium">
                  {user.metadata?.creationTime
                    ? new Date(user.metadata.creationTime).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })
                    : "—"}
                </span>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}