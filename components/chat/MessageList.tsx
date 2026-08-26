// components/chat/MessageList.tsx
"use client";

import { Message, MsgBlock } from "./types";
import MessageBubble from "./MessageBubble";

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  ownDisplayName: string;
  peerDisplayName: string;
  onDelete: (id: string) => void;
}

function groupIntoBlocks(messages: Message[]): MsgBlock[] {
  const blocks: MsgBlock[] = [];
  for (const msg of messages) {
    const last = blocks[blocks.length - 1];
    if (last && last.authorId === msg.authorId) {
      const prevTs = last.msgs[last.msgs.length - 1].timestamp;
      if (msg.timestamp - prevTs < 240_000) {
        last.msgs.push(msg);
        continue;
      }
    }
    blocks.push({
      authorId: msg.authorId,
      authorName: msg.displayName,
      photoURL: msg.photoURL,
      msgs: [msg],
    });
  }
  return blocks;
}

export default function MessageList({
  messages,
  currentUserId,
  ownDisplayName,
  peerDisplayName,
  onDelete,
}: MessageListProps) {
  if (messages.length === 0) return null;

  const blocks = groupIntoBlocks(messages);

  return (
    <>
      {blocks.map((block, bi) => {
        const isOwn = block.authorId === currentUserId;
        const prevBlock = bi > 0 ? blocks[bi - 1] : null;
        const showHeader = !prevBlock || prevBlock.authorId !== block.authorId;
        const gapBefore = bi > 0 && !showHeader ? "mt-[2px]" : "mt-4";

        return (
          <div
            key={`${block.authorId}-${block.msgs[0].id}`}
            className={`flex items-start gap-3 ${gapBefore} ${isOwn ? "flex-row-reverse" : ""}`}
          >
            {showHeader ? (
              <div className="w-10 h-10 flex-shrink-0 rounded-full bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] flex items-center justify-center text-white text-sm font-bold uppercase overflow-hidden mt-0.5">
                {block.photoURL ? (
                  <img
                    src={block.photoURL}
                    alt={block.authorName}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  block.authorName?.charAt(0)?.toUpperCase() || "U"
                )}
              </div>
            ) : (
              <div className="w-10 flex-shrink-0" />
            )}

            <div
              className={`flex-1 min-w-0 flex flex-col gap-[2px] ${isOwn ? "items-end" : ""}`}
            >
              {block.msgs.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isOwn={isOwn}
                  showHeader={showHeader && block.msgs.indexOf(msg) === 0}
                  authorName={isOwn ? ownDisplayName : peerDisplayName}
                  authorColor={isOwn ? "#ff8a5b" : "#a78bfa"}
                  onDelete={isOwn ? onDelete : undefined}
                />
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}