// app/login/LoginContent.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth, signInWithEmailAndPassword } from "@/lib/firebase";
import { FaEye, FaEyeSlash } from "react-icons/fa";

export default function LoginContent() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const { username, password } = formData;
    const usernameLower = username.toLowerCase().trim();

    if (!username || !password) {
      setError("Preencha todos os campos");
      return;
    }

    setLoading(true);

    try {
      const syntheticEmail = `${usernameLower}@users.identity.app`;
      await signInWithEmailAndPassword(auth, syntheticEmail, password);
      router.push("/dm");
    } catch (err: any) {
      console.error("Erro detalhado:", err);
      let message = "Erro ao entrar. Verifique suas credenciais.";

      if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        message = "Username ou senha incorretos.";
      } else if (err.code === "auth/too-many-requests") {
        message = "Muitas tentativas falhas. Tente novamente mais tarde.";
      } else if (err.code === "auth/network-request-failed") {
        message = "Erro de rede. Verifique sua conexão.";
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <main className="min-h-screen min-h-dvh flex items-center justify-center p-5 bg-[radial-gradient(ellipse_at_20%_20%,#1a0a2e_0%,#0a0618_50%,#2d1045_100%)] relative overflow-hidden">
      {/* Orbs decorativos */}
      <div className="absolute w-[600px] h-[600px] -top-[200px] -right-[200px] bg-[radial-gradient(circle,rgba(167,139,250,0.08)_0%,transparent_70%)] pointer-events-none blur-[80px]" />
      <div className="absolute w-[500px] h-[500px] -bottom-[200px] -left-[200px] bg-[radial-gradient(circle,rgba(255,138,91,0.05)_0%,transparent_70%)] pointer-events-none blur-[80px]" />

      <div className="relative w-full max-w-[420px] bg-[linear-gradient(165deg,rgba(20,10,40,0.95),rgba(30,15,50,0.95))] backdrop-blur-[20px] border border-[rgba(255,255,255,0.06)] rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.5)] p-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2.5 mb-2">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] flex items-center justify-center text-white text-xl font-extrabold font-['Sora','Inter',system-ui,sans-serif] shadow-[0_4px_16px_rgba(167,139,250,0.25)]">
              B
            </div>
            <h1 className="font-['Sora','Inter',system-ui,sans-serif] text-2xl font-extrabold text-[#f0ebff] tracking-tight">blii</h1>
          </div>
          <h2 className="font-['Sora','Inter',system-ui,sans-serif] text-lg font-bold text-[#f0ebff] m-0">Bem-vindo de volta</h2>
          <p className="text-sm text-[#b8a8d9] m-0">Entre na sua conta</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="username" className="text-sm font-semibold text-[#b8a8d9] tracking-wide">
              Username
            </label>
            <input
              id="username"
              type="text"
              placeholder="Digite seu username"
              className="w-full h-11 px-3.5 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#f0ebff] text-sm font-inherit outline-none transition-all duration-300 placeholder:text-[#7a6a9a] focus:border-[#a78bfa] focus:bg-[rgba(255,255,255,0.06)] disabled:opacity-50 disabled:cursor-not-allowed"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-semibold text-[#b8a8d9] tracking-wide">
              Senha
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Digite sua senha"
                className="w-full h-11 px-3.5 pr-11 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#f0ebff] text-sm font-inherit outline-none transition-all duration-300 placeholder:text-[#7a6a9a] focus:border-[#a78bfa] focus:bg-[rgba(255,255,255,0.06)] disabled:opacity-50 disabled:cursor-not-allowed"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 bg-transparent border-none rounded-lg text-[#7a6a9a] cursor-pointer transition-all duration-200 hover:text-[#f0ebff]"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          {error && (
            <p className="m-0 px-3.5 py-2.5 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.15)] rounded-xl text-[#f87171] text-sm text-center">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full h-11 px-5 rounded-xl text-sm font-semibold font-inherit cursor-pointer transition-all duration-300 bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] border-none text-white shadow-[0_4px_16px_rgba(167,139,250,0.25)] hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(167,139,250,0.35)] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            disabled={loading}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="text-center text-sm text-[#7a6a9a] mt-6">
          Não tem uma conta?{" "}
          <Link href="/register" className="text-[#a78bfa] font-semibold hover:underline transition-all duration-200">
            Criar conta
          </Link>
        </p>
      </div>
    </main>
  );
}