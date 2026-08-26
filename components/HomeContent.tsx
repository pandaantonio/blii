// app/components/HomeContent.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";

export default function HomeContent() {
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
      <div className="min-h-screen min-h-dvh flex flex-col items-center justify-center gap-4 text-[#b8a8d9] text-sm tracking-wide bg-[radial-gradient(ellipse_at_20%_20%,#1a0a2e_0%,#0a0618_50%,#2d1045_100%)]">
        <div className="w-9 h-9 border-[2.5px] border-white/6 border-t-[#a78bfa] rounded-full animate-spin" />
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <main className="relative min-h-screen min-h-dvh overflow-hidden flex items-center justify-center p-4 sm:p-6 text-[#f0ebff] font-['Inter',system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] bg-[radial-gradient(ellipse_at_20%_20%,#1a0a2e_0%,#0a0618_50%,#2d1045_100%)]">
      {/* Keyframes for the ambient orbs (no Tailwind config access, so declared locally) */}
      <style>{`
        @keyframes homeOrbPulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.1); }
        }
        @keyframes homeOrbPulseReverse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>

      {/* Ambient orbs */}
      <div
        className="absolute z-0 top-[42%] left-1/2 w-[min(70vw,520px)] h-[min(70vw,520px)] -translate-x-1/2 -translate-y-1/2 pointer-events-none blur-sm motion-reduce:animate-none bg-[radial-gradient(circle,rgba(167,139,250,0.3)_0%,rgba(255,106,53,0.1)_40%,transparent_70%)]"
        style={{ animation: "homeOrbPulse 8s ease-in-out infinite" }}
        aria-hidden="true"
      />
      <div
        className="absolute z-0 bottom-[8%] right-[12%] w-[min(45vw,340px)] h-[min(45vw,340px)] pointer-events-none blur-md motion-reduce:animate-none bg-[radial-gradient(circle,rgba(255,106,53,0.2)_0%,rgba(167,139,250,0.1)_40%,transparent_70%)]"
        style={{ animation: "homeOrbPulseReverse 10s ease-in-out infinite reverse" }}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-[440px] min-[480px]:max-w-[480px] text-center py-2">
        <p className="inline-block text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#a78bfa] mb-5 opacity-90 [text-shadow:0_0_20px_rgba(167,139,250,0.3)]">
          Rede social
        </p>

        <h1 className="font-['Sora','Inter',system-ui,sans-serif] text-[clamp(2.35rem,7vw,3.35rem)] font-extrabold leading-[1.12] tracking-[-0.03em] m-0 mb-5 [text-shadow:0_2px_40px_rgba(0,0,0,0.3)]">
          Conecte-se com
          <br />
          <span className="not-italic [background:linear-gradient(105deg,#a78bfa_0%,#ff8a5b_100%)] bg-clip-text text-transparent [filter:drop-shadow(0_2px_20px_rgba(167,139,250,0.2))]">
            elegância
          </span>
        </h1>

        <p className="text-[clamp(0.95rem,2.5vw,1.1rem)] leading-[1.65] text-[#b8a8d9] mx-auto mb-9 max-w-[36ch] [text-shadow:0_2px_20px_rgba(0,0,0,0.2)]">
          Conversas, servidores e momentos — em um espaço pensado para ser
          calmo, moderno e genuinamente seu.
        </p>

        <div className="flex flex-col min-[480px]:flex-row gap-3 w-full max-w-[320px] min-[480px]:max-w-none justify-center mx-auto mb-7">
          {user ? (
            <Link
              href="/dm"
              className="inline-flex items-center justify-center h-[52px] px-6 rounded-xl text-base font-semibold no-underline text-white bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] shadow-[0_4px_30px_rgba(167,139,250,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_8px_40px_rgba(167,139,250,0.4)] hover:from-[#ff6a35] hover:to-[#9048dd] active:translate-y-0 active:scale-[0.98] min-[480px]:min-w-[148px] min-[480px]:flex-none motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:scale-100"
            >
              Aplicativo
            </Link>
          ) : (
            <>
              <Link
                href="/register"
                className="inline-flex items-center justify-center h-[52px] px-6 rounded-xl text-base font-semibold no-underline text-white bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] shadow-[0_4px_30px_rgba(167,139,250,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_8px_40px_rgba(167,139,250,0.4)] hover:from-[#ff6a35] hover:to-[#9048dd] active:translate-y-0 active:scale-[0.98] min-[480px]:min-w-[148px] min-[480px]:flex-none motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:scale-100"
              >
                Criar conta
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center h-[52px] px-6 rounded-xl text-base font-semibold no-underline text-[#f0ebff] bg-white/5 backdrop-blur-[10px] border-[1.5px] border-white/10 transition-all duration-200 hover:bg-white/10 hover:border-[#a78bfa] hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(167,139,250,0.15)] active:translate-y-0 min-[480px]:min-w-[148px] min-[480px]:flex-none motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                Entrar
              </Link>
            </>
          )}
        </div>

        <p className="text-[0.8rem] text-[#7a6a9a] tracking-[0.04em] m-0">
          Gratuito · Privado · Sem ruído
        </p>
      </div>
    </main>
  );
}
