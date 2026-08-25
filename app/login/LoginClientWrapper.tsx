// app/login/LoginClientWrapper.tsx
"use client";

import dynamic from 'next/dynamic';

const LoginContent = dynamic(
  () => import('./LoginContent'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen min-h-dvh flex items-center justify-center bg-[radial-gradient(ellipse_at_20%_20%,#1a0a2e_0%,#0a0618_50%,#2d1045_100%)]">
        <div className="w-8 h-8 border-3 border-white/6 border-t-[#a78bfa] rounded-full animate-spin" />
      </div>
    ),
  }
);

export default function LoginClientWrapper() {
  return <LoginContent />;
}