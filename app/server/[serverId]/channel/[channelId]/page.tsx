// app/server/[serverId]/channel/[channelId]/page.tsx
"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";

const ChatContent = dynamic(() => import("./ChatContent"), {
  ssr: false,
});

export default function ChannelPage() {
  const params = useParams<{ serverId: string; channelId: string }>();
  return <ChatContent channelId={params.channelId} />;
}
