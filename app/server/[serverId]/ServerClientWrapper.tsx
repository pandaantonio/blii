// app/server/[serverId]/ServerClientWrapper.tsx
"use client";

import dynamic from 'next/dynamic';

const ServerContent = dynamic(
  () => import('./ServerContent'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen min-h-dvh flex flex-col items-center justify-center gap-4 text-[#b8a8d9] text-sm ml-[68px] w-[calc(100%-68px)] bg-[radial-gradient(ellipse_at_20%_20%,#1a0a2e_0%,#0a0618_50%,#2d1045_100%)]">
        <div className="w-10 h-10 border-3 border-white/6 border-t-[#a78bfa] rounded-full animate-spin" />
        <p>Carregando servidor...</p>
      </div>
    ),
  }
);

interface ServerClientWrapperProps {
  serverId: string;
}

export default function ServerClientWrapper({ serverId }: ServerClientWrapperProps) {
  return <ServerContent serverId={serverId} />;
}