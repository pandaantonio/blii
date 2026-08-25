// app/dm/[userId]/page.tsx
import DMChatClientWrapper from "./DMChatClientWrapper";

interface DMChatPageProps {
  params: Promise<{ userId: string }>;
}

export default async function DMChatPage({ params }: DMChatPageProps) {
  const { userId } = await params;
  return <DMChatClientWrapper userId={userId} />;
}