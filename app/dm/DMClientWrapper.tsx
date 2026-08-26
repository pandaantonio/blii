// app/dm/DMClientWrapper.tsx
"use client";

import dynamic from 'next/dynamic';

const DMContent = dynamic(
  () => import('./DMContent'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen min-h-dvh flex flex-col items-center justify-center gap-4 text-[#b8a8d9] text-sm w-full px-4">
        <div className="w-10 h-10 border-3 border-white/6 border-t-[#a78bfa] rounded-full animate-spin" />
        <p>Carregando mensagens...</p>
      </div>
    ),
  }
);

export default function DMClientWrapper() {
  return <DMContent />;
}