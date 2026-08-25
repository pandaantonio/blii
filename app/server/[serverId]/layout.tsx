// app/server/[serverId]/layout.tsx
import ServerLayoutClient from "./ServerLayoutClient";

interface ServerLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    serverId: string;
  }>;
}

export default async function ServerLayout({ children, params }: ServerLayoutProps) {
  const { serverId } = await params;
  return <ServerLayoutClient serverId={serverId}>{children}</ServerLayoutClient>;
}
