"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser ?? null);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen min-h-dvh flex flex-col items-center justify-center gap-4 text-[#b8a8d9] text-[0.95rem] tracking-wide">
        <div className="w-9 h-9 border-[2.5px] border-white/10 border-t-[#ff8a5b] rounded-full animate-spin" />
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen min-h-dvh flex items-center justify-center relative overflow-hidden p-6 text-[#f0ebff] font-sans">
      {/* Ambient orbs */}
      <div
        className="absolute w-[min(70vw,520px)] h-[min(70vw,520px)] top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0 blur-[4px]
                   bg-[radial-gradient(circle,rgba(167,139,250,0.22)_0%,transparent_68%)]"
        aria-hidden="true"
      />
      <div
        className="absolute w-[min(45vw,340px)] h-[min(45vw,340px)] bottom-[8%] right-[12%] pointer-events-none z-0 blur-lg
                   bg-[radial-gradient(circle,rgba(255,106,53,0.15)_0%,transparent_70%)]"
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-[440px] text-center py-2 sm:max-w-[480px]">
        <p className="inline-block text-[0.72rem] font-semibold tracking-[0.18em] uppercase text-[#a78bfa] opacity-90 mb-5">
          Rede social
        </p>

        <h1 className="font-[family-name:var(--font-display)] text-[clamp(2.35rem,7vw,3.35rem)] font-extrabold leading-[1.12] tracking-[-0.03em] text-[#f0ebff] mb-5">
          Conecte-se com
          <br />
          <em className="not-italic bg-gradient-to-br from-[#a78bfa] to-[#ff8a5b] bg-clip-text text-transparent">
            elegância
          </em>
        </h1>

        <p className="text-[clamp(0.95rem,2.5vw,1.1rem)] leading-relaxed text-[#b8a8d9] max-w-[36ch] mx-auto mb-9">
          Conversas, servidores e momentos — em um espaço pensado para ser
          calmo, moderno e genuinamente seu.
        </p>

        <div className="flex flex-col gap-3 w-full max-w-[320px] mx-auto mb-7 sm:flex-row sm:max-w-none sm:justify-center">
          {user ? (
            <Link
              href="/dm"
              className="inline-flex items-center justify-center h-[52px] px-6 rounded-xl text-base font-semibold text-white
                         bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] shadow-[0_4px_16px_rgba(167,139,250,0.25)]
                         transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(167,139,250,0.35)]
                         hover:from-[#ff6a35] hover:to-[#9048dd] active:translate-y-0
                         sm:min-w-[148px]"
            >
              Aplicativo
            </Link>
          ) : (
            <>
              <Link
                href="/register"
                className="inline-flex items-center justify-center h-[52px] px-6 rounded-xl text-base font-semibold text-white
                           bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] shadow-[0_4px_16px_rgba(167,139,250,0.25)]
                           transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(167,139,250,0.35)]
                           hover:from-[#ff6a35] hover:to-[#9048dd] active:translate-y-0
                           sm:min-w-[148px]"
              >
                Criar conta
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center h-[52px] px-6 rounded-xl text-base font-semibold text-[#f0ebff]
                           bg-transparent border-[1.5px] border-[rgba(167,139,250,0.3)]
                           transition-all duration-200 hover:bg-white/10 hover:border-[#a78bfa] hover:-translate-y-0.5
                           active:translate-y-0 sm:min-w-[148px]"
              >
                Entrar
              </Link>
            </>
          )}
        </div>

        <p className="text-[0.8rem] text-[#7a6a9a] tracking-wide m-0">
          Gratuito · Privado · Sem ruído
        </p>
      </div>
    </main>
  );
}