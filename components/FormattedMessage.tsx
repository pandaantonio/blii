// components/FormattedMessage.tsx
import React, { ReactNode } from "react";

const EMOJI_REGEX =
  /(?:\p{Extended_Pictographic}(?:\uFE0F)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F)?)*)/gu;

const TOKEN_REGEX =
  /(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|!\[[^\]]*\]\([^)\s]+\)|\[[^\]]+\]\([^)\s]+\))/g;

const HAS_TOKEN_REGEX = new RegExp(TOKEN_REGEX.source);

const isSafeUrl = (url: string): boolean => /^(https?:\/\/|mailto:)/i.test(url);

const isOnlyEmoji = (text: string): boolean => {
  const cleaned = text.replace(/\s/g, "");
  if (!cleaned) return false;
  const withoutEmoji = cleaned.replace(new RegExp(EMOJI_REGEX), "");
  return withoutEmoji.length === 0;
};

const renderTextWithEmojis = (text: string, keyPrefix: string): ReactNode[] => {
  if (!text) return [];

  const onlyEmoji = isOnlyEmoji(text);
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let idx = 0;

  const regex = new RegExp(EMOJI_REGEX);
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const textSegment = text.slice(lastIndex, match.index);
      const lines = textSegment.split("\n");
      lines.forEach((line, lineIdx) => {
        if (lineIdx > 0) {
          nodes.push(<br key={`${keyPrefix}-br-${idx++}`} />);
        }
        if (line) {
          nodes.push(
            <React.Fragment key={`${keyPrefix}-t-${idx++}`}>
              {line}
            </React.Fragment>
          );
        }
      });
    }

    nodes.push(
      <span
        key={`${keyPrefix}-e-${idx++}`}
        className={`emoji ${onlyEmoji ? "emoji-only" : ""}`}
      >
        {match[0]}
      </span>
    );

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    const textSegment = text.slice(lastIndex);
    const lines = textSegment.split("\n");
    lines.forEach((line, lineIdx) => {
      if (lineIdx > 0) {
        nodes.push(<br key={`${keyPrefix}-br-${idx++}`} />);
      }
      if (line) {
        nodes.push(
          <React.Fragment key={`${keyPrefix}-t-${idx++}`}>
            {line}
          </React.Fragment>
        );
      }
    });
  }

  return nodes;
};

interface MessagePart {
  type: "bold-italic" | "bold" | "italic" | "underline" | "image" | "link" | "text";
  content: string;
  url?: string;
  key: string;
}

const parseMessage = (message: string, keyPrefix: string): MessagePart[] => {
  const parts: MessagePart[] = [];
  let lastIndex = 0;
  let idx = 0;

  const regex = new RegExp(TOKEN_REGEX);
  let match: RegExpExecArray | null;

  while ((match = regex.exec(message)) !== null) {
    const matchStart = match.index;
    const matchEnd = matchStart + match[0].length;

    if (matchStart > lastIndex) {
      parts.push({
        type: "text",
        content: message.substring(lastIndex, matchStart),
        key: `${keyPrefix}-${idx++}`,
      });
    }

    const token = match[0];

    if (token.startsWith("***") && token.endsWith("***")) {
      parts.push({
        type: "bold-italic",
        content: token.slice(3, -3),
        key: `${keyPrefix}-${idx++}`,
      });
    } else if (token.startsWith("**") && token.endsWith("**")) {
      parts.push({
        type: "bold",
        content: token.slice(2, -2),
        key: `${keyPrefix}-${idx++}`,
      });
    } else if (token.startsWith("__") && token.endsWith("__")) {
      parts.push({
        type: "underline",
        content: token.slice(2, -2),
        key: `${keyPrefix}-${idx++}`,
      });
    } else if (token.startsWith("![")) {
      const imageMatch = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(token);
      parts.push({
        type: "image",
        content: imageMatch ? imageMatch[1] : "GIF",
        url: imageMatch ? imageMatch[2] : "",
        key: `${keyPrefix}-${idx++}`,
      });
    } else if (token.startsWith("[")) {
      const linkMatch = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(token);
      parts.push({
        type: "link",
        content: linkMatch ? linkMatch[1] : token,
        url: linkMatch ? linkMatch[2] : "",
        key: `${keyPrefix}-${idx++}`,
      });
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push({
        type: "italic",
        content: token.slice(1, -1),
        key: `${keyPrefix}-${idx++}`,
      });
    }

    lastIndex = matchEnd;
  }

  if (lastIndex < message.length) {
    parts.push({
      type: "text",
      content: message.substring(lastIndex),
      key: `${keyPrefix}-${idx++}`,
    });
  }

  return parts;
};

const renderPart = (part: MessagePart): ReactNode => {
  switch (part.type) {
    case "bold-italic":
      return (
        <strong key={part.key}>
          <em>{renderTextWithEmojis(part.content, part.key)}</em>
        </strong>
      );
    case "bold":
      return (
        <strong key={part.key}>
          {renderTextWithEmojis(part.content, part.key)}
        </strong>
      );
    case "italic":
      return (
        <em key={part.key}>{renderTextWithEmojis(part.content, part.key)}</em>
      );
    case "underline":
      return (
        <u key={part.key}>{renderTextWithEmojis(part.content, part.key)}</u>
      );
    case "image":
      if (part.url && isSafeUrl(part.url)) {
        return (
          <img
            key={part.key}
            src={part.url}
            alt={part.content || "GIF"}
            className="message-gif max-w-full rounded-md object-cover my-1"
            loading="lazy"
          />
        );
      }
      return null;
    case "link":
      if (part.url && isSafeUrl(part.url)) {
        return (
          <a
            key={part.key}
            href={part.url}
            target="_blank"
            rel="noopener noreferrer"
            className="message-link text-indigo-400 underline hover:text-indigo-300"
          >
            {renderTextWithEmojis(part.content, part.key)}
          </a>
        );
      }
      return (
        <span key={part.key}>
          {renderTextWithEmojis(part.content, part.key)}
        </span>
      );
    case "text":
    default:
      return (
        <React.Fragment key={part.key}>
          {renderTextWithEmojis(part.content, part.key)}
        </React.Fragment>
      );
  }
};

interface FormattedMessageProps {
  text: string;
}

export default function FormattedMessage({ text }: FormattedMessageProps) {
  if (!text) return null;

  const hasFormatting = HAS_TOKEN_REGEX.test(text);

  if (!hasFormatting) {
    const lines = text.split("\n");
    return (
      <span className="message-text">
        {lines.map((line, index) => (
          <React.Fragment key={`m-${index}`}>
            {renderTextWithEmojis(line, `m-${index}`)}
            {index < lines.length - 1 && <br />}
          </React.Fragment>
        ))}
      </span>
    );
  }

  const parts = parseMessage(text, "m");

  return (
    <span className="message-text">
      {parts.map((part, index) => {
        const rendered = renderPart(part);
        const hasNewline = part.content && part.content.includes("\n");
        return (
          <React.Fragment key={part.key}>
            {rendered}
            {hasNewline && index < parts.length - 1 && <br />}
          </React.Fragment>
        );
      })}
    </span>
  );
}