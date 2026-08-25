// app/dm/[userId]/DMChatClientWrapper.tsx
"use client";

import dynamic from "next/dynamic";

const DMChatContent = dynamic(() => import("./DMChatContent"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen min-h-dvh flex flex-col items-center justify-center gap-4 text-[#b8a8d9] text-sm ml-0 md:ml-[68px] w-full md:w-[calc(100%-68px)] bg-[radial-gradient(ellipse_at_20%_20%,#1a0a2e_0%,#0a0618_50%,#2d1045_100%)]">
      <div className="w-10 h-10 border-3 border-white/6 border-t-[#a78bfa] rounded-full animate-spin" />
      <p>Carregando conversa...</p>
    </div>
  ),
});

interface DMChatClientWrapperProps {
  userId: string;
}

export default function DMChatClientWrapper({ userId }: DMChatClientWrapperProps) {
  return <DMChatContent userId={userId} />;
}