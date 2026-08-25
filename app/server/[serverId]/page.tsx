// app/server/[serverId]/page.tsx
import ServerClientWrapper from './ServerClientWrapper';

interface ServerPageProps {
  params: Promise<{
    serverId: string;
  }>;
}

export default async function ServerPage({ params }: ServerPageProps) {
  const { serverId } = await params;
  return <ServerClientWrapper serverId={serverId} />;
}