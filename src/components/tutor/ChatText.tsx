import { Fragment, type ReactNode } from "react";

// Renders the small Markdown subset the study buddy is asked to use:
// paragraphs, "- " bullets, "1. " steps, **bold**, *italic* and `code`.
// Built from React elements, never raw HTML, so a reply can't inject markup.

function inline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith("**")) parts.push(<strong key={match.index}>{token.slice(2, -2)}</strong>);
    else if (token.startsWith("`"))
      parts.push(
        <code key={match.index} className="rounded bg-ink-100 px-1 py-0.5 font-mono text-[0.85em]">
          {token.slice(1, -1)}
        </code>,
      );
    else parts.push(<em key={match.index}>{token.slice(1, -1)}</em>);
    last = match.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

type Block = { type: "p"; lines: string[] } | { type: "ul" | "ol"; items: string[] };

function blocks(text: string): Block[] {
  const result: Block[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    const step = line.match(/^\s*\d+[.)]\s+(.*)$/);
    const last = result.at(-1);
    if (bullet || step) {
      const type = bullet ? "ul" : "ol";
      const item = (bullet ?? step)![1];
      if (last?.type === type) last.items.push(item);
      else result.push({ type, items: [item] });
    } else if (!line.trim()) {
      if (last && !(last.type === "p" && last.lines.length === 0)) result.push({ type: "p", lines: [] });
    } else {
      const heading = line.replace(/^#{1,6}\s+/, "");
      if (last?.type === "p") last.lines.push(heading);
      else result.push({ type: "p", lines: [heading] });
    }
  }
  return result.filter((block) => (block.type === "p" ? block.lines.length > 0 : true));
}

export function ChatText({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-2 text-[0.9375rem] leading-relaxed">
      {blocks(text).map((block, i) => {
        if (block.type === "p") {
          return (
            <p key={i}>
              {block.lines.map((line, j) => (
                <Fragment key={j}>
                  {j > 0 && <br />}
                  {inline(line)}
                </Fragment>
              ))}
            </p>
          );
        }
        const List = block.type;
        return (
          <List key={i} className={List === "ul" ? "list-disc pl-5" : "list-decimal pl-5"}>
            {block.items.map((item, j) => (
              <li key={j} className="pl-0.5">
                {inline(item)}
              </li>
            ))}
          </List>
        );
      })}
    </div>
  );
}
