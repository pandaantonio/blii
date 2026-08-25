// app/server/[serverId]/page.tsx
"use client";

import dynamic from "next/dynamic";

const ChannelListContent = dynamic(() => import("./ChannelListContent"), {
  ssr: false,
});

export default function ServerPage() {
  return <ChannelListContent />;
}
