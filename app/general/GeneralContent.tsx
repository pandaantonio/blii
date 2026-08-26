// app/general/GeneralContent.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db, ref, onValue, signOut } from "@/lib/firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { FaComment, FaServer, FaSignOutAlt, FaUser, FaCog } from "react-icons/fa";

interface AppUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export default function GeneralContent() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
          setUsername(data.username || "");
          setDisplayName(data.displayName || data.username || "Usuário");
          setPhotoURL(data.photoURL || currentUser.photoURL || null);
        } else {
          setDisplayName(currentUser.displayName || "Usuário");
        }
        setLoading(false);
      });

      return () => unsubscribeUser();
    });

    return () => unsubscribe();
  }, [mounted, router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  const handleSettings = () => {
    router.push("/settings");
  };

  if (!mounted || loading || !user) {
    return (
      <div className="min-h-screen min-h-dvh flex flex-col items-center justify-center gap-4 text-[#b8a8d9] text-sm px-4 bg-[radial-gradient(ellipse_at_20%_20%,#1a0a2e_0%,#0a0618_50%,#2d1045_100%)]">
        <div className="w-10 h-10 border-3 border-white/6 border-t-[#a78bfa] rounded-full animate-spin" />
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-dvh relative overflow-hidden text-[#f0ebff] font-['Inter',system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] bg-[radial-gradient(ellipse_at_20%_20%,#1a0a2e_0%,#0a0618_50%,#2d1045_100%)] flex flex-col items-center justify-center p-4 sm:p-6">
      {/* Orbs decorativos */}
      <div className="fixed w-[800px] h-[800px] -top-[300px] -right-[200px] bg-[radial-gradient(circle,rgba(167,139,250,0.06)_0%,transparent_70%)] pointer-events-none z-0 blur-[80px]" aria-hidden="true" />
      <div className="fixed w-[600px] h-[600px] -bottom-[200px] -left-[200px] bg-[radial-gradient(circle,rgba(255,138,91,0.04)_0%,transparent_70%)] pointer-events-none z-0 blur-[80px]" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-2xl flex flex-col gap-6 sm:gap-8">
        {/* Perfil + ações */}
        <div className="flex items-center justify-between gap-2 sm:gap-3 bg-white/2 backdrop-blur-xl border border-white/4 rounded-2xl px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] flex items-center justify-center text-white font-bold uppercase overflow-hidden flex-shrink-0">
              {photoURL ? (
                <img src={photoURL} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <FaUser />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm sm:text-base font-semibold text-[#f0ebff] m-0 truncate">{displayName}</p>
              {username && <p className="text-xs text-[#7a6a9a] m-0 truncate">@{username}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 bg-white/4 border border-white/6 rounded-xl text-[#b8a8d9] cursor-pointer transition-all duration-200 hover:bg-white/8 hover:text-[#f0ebff] hover:border-[#a78bfa]"
              onClick={handleSettings}
              title="Configurações"
            >
              <FaCog className="text-sm sm:text-base" />
            </button>
            <button
              type="button"
              className="flex items-center justify-center gap-2 h-9 sm:h-10 px-3 sm:px-4 bg-white/4 border border-white/6 rounded-xl text-[#b8a8d9] text-sm font-semibold cursor-pointer transition-all duration-200 hover:bg-white/8 hover:text-[#f0ebff]"
              onClick={handleLogout}
            >
              <FaSignOutAlt className="text-sm sm:text-base" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>

        {/* Título */}
        <div className="text-center px-2">
          <h1 className="font-['Sora','Inter',system-ui,sans-serif] text-2xl sm:text-3xl font-bold text-[#f0ebff] m-0 mb-2">
            Para onde vamos?
          </h1>
          <p className="text-sm sm:text-base text-[#b8a8d9] m-0">
            Escolha entre suas mensagens diretas ou seus servidores.
          </p>
        </div>

        {/* Botões de navegação */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          <button
            type="button"
            className="group flex flex-col items-start gap-4 p-6 sm:p-8 bg-white/2 border border-white/4 rounded-3xl text-left cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:bg-white/4 hover:border-[rgba(167,139,250,0.25)] hover:shadow-[0_16px_40px_rgba(167,139,250,0.15)]"
            onClick={() => router.push("/dm")}
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] flex items-center justify-center text-white text-xl shadow-[0_8px_24px_rgba(167,139,250,0.25)] transition-transform duration-300 group-hover:scale-105">
              <FaComment />
            </div>
            <div>
              <h2 className="font-['Sora','Inter',system-ui,sans-serif] text-lg font-bold text-[#f0ebff] m-0 mb-1">
                Mensagens
              </h2>
              <p className="text-sm text-[#7a6a9a] m-0">
                Converse com seus amigos por mensagem direta.
              </p>
            </div>
          </button>

          <button
            type="button"
            className="group flex flex-col items-start gap-4 p-6 sm:p-8 bg-white/2 border border-white/4 rounded-3xl text-left cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:bg-white/4 hover:border-[rgba(167,139,250,0.25)] hover:shadow-[0_16px_40px_rgba(167,139,250,0.15)]"
            onClick={() => router.push("/servers")}
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] flex items-center justify-center text-white text-xl shadow-[0_8px_24px_rgba(167,139,250,0.25)] transition-transform duration-300 group-hover:scale-105">
              <FaServer />
            </div>
            <div>
              <h2 className="font-['Sora','Inter',system-ui,sans-serif] text-lg font-bold text-[#f0ebff] m-0 mb-1">
                Servidores
              </h2>
              <p className="text-sm text-[#7a6a9a] m-0">
                Acesse ou crie servidores e converse em comunidade.
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}