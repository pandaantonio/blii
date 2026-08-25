// app/dm/[userId]/page.tsx
import DMClientWrapper from '../DMClientWrapper';

interface DMUserPageProps {
  params: Promise<{
    userId: string;
  }>;
}

export default async function DMUserPage({ params }: DMUserPageProps) {
  const { userId } = await params;
  return <DMClientWrapper />;
}