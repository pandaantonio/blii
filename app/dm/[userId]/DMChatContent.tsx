// app/dm/[userId]/DMChatContent.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db, ref, get, onValue } from "@/lib/firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { FaUserSlash, FaArrowLeft } from "react-icons/fa";
import Sidebar from "@/components/Sidebar";
import DMConversation from "../DMConversation";

interface AppUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

interface Peer {
  userId: string;
  username: string;
  displayName: string;
  photoURL: string | null;
  dmId: string | null;
}

interface DMChatContentProps {
  userId: string;
}

export default function DMChatContent({ userId }: DMChatContentProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [peer, setPeer] = useState<Peer | null>(null);
  const [peerLoading, setPeerLoading] = useState(true);
  const [peerNotFound, setPeerNotFound] = useState(false);

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

  // Carrega o peer a partir do userId da URL
  useEffect(() => {
    if (!mounted || !user || !userId) return;

    let cancelled = false;
    setPeerLoading(true);
    setPeerNotFound(false);

    (async () => {
      const userRef = ref(db, `users/${userId}`);
      const userSnap = await get(userRef);
      if (cancelled) return;

      if (!userSnap.exists()) {
        setPeer(null);
        setPeerNotFound(true);
        setPeerLoading(false);
        return;
      }

      const userData = userSnap.val();
      setPeer({
        userId,
        username: userData.username || "Usuário",
        displayName: userData.displayName || userData.username || "Usuário",
        photoURL: userData.photoURL || null,
        dmId: null,
      });
      setPeerLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [mounted, user, userId]);

  const handleBack = () => {
    router.push("/dm");
  };

  if (!mounted || loading || !user || peerLoading) {
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

  if (peerNotFound || !peer) {
    return (
      <>
        <Sidebar />
        <div className="min-h-screen min-h-dvh flex items-center justify-center pl-[64px] px-4 text-[#f0ebff] font-['Inter',system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] bg-[radial-gradient(ellipse_at_20%_20%,#1a0a2e_0%,#0a0618_50%,#2d1045_100%)]">
          <div className="bg-white/2 backdrop-blur-xl border border-white/6 rounded-2xl p-8 md:p-12 text-center max-w-md">
            <div className="text-4xl text-[#7a6a9a] mb-4"><FaUserSlash /></div>
            <h2 className="font-['Sora','Inter',system-ui,sans-serif] text-2xl font-bold text-[#f0ebff] m-0">Usuário não encontrado</h2>
            <p className="text-sm text-[#b8a8d9] my-3">Este usuário não existe ou foi removido.</p>
            <button
              type="button"
              className="px-6 py-2.5 bg-white/6 border border-white/6 rounded-xl text-[#f0ebff] text-sm font-semibold font-inherit cursor-pointer transition-all duration-200 hover:bg-white/10"
              onClick={handleBack}
            >
              Voltar para mensagens
            </button>
          </div>
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
        <div className="relative z-10 flex flex-col w-full max-w-[1400px] h-[calc(100vh-40px)] max-h-[900px] bg-white/2 backdrop-blur-[40px] border border-white/4 rounded-3xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.5)]">
          <button
            type="button"
            className="flex items-center gap-2 flex-shrink-0 h-11 px-4 border-b border-white/4 bg-white/2 text-sm font-semibold text-[#7a6a9a] cursor-pointer transition-all duration-200 hover:bg-white/4 hover:text-[#f0ebff]"
            onClick={handleBack}
          >
            <FaArrowLeft className="text-xs" />
            Voltar para mensagens
          </button>
          <main className="flex-1 flex flex-col min-w-0 bg-white/1 overflow-hidden">
            <DMConversation
              user={user}
              peer={peer}
              username={username}
              displayName={displayName}
              photoURL={photoURL}
              onBack={handleBack}
            />
          </main>
        </div>
      </div>
    </>
  );
}