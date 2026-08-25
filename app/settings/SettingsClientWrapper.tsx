// app/settings/SettingsClientWrapper.tsx
"use client";

import dynamic from 'next/dynamic';

const SettingsContent = dynamic(
  () => import('./SettingsContent'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen min-h-dvh flex flex-col items-center justify-center gap-4 text-[#b8a8d9] text-sm ml-[68px] w-[calc(100%-68px)]">
        <div className="w-10 h-10 border-3 border-white/6 border-t-[#a78bfa] rounded-full animate-spin" />
        <p>Carregando configurações...</p>
      </div>
    ),
  }
);

export default function SettingsClientWrapper() {
  return <SettingsContent />;
}