// app/server/[serverId]/channel/[channelId]/members/page.tsx
"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";

const MembersContent = dynamic(() => import("./MembersContent"), {
  ssr: false,
});

export default function MembersPage() {
  const params = useParams<{ serverId: string; channelId: string }>();
  return <MembersContent channelId={params.channelId} />;
}
