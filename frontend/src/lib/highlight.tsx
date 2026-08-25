import type { ReactNode } from "react";

type Entity = { entityType: string; spanStart: number | null; spanEnd: number | null };

const ENTITY_STYLES: Record<string, string> = {
  person: "border-b-2 border-primary bg-primary-fixed px-1 rounded-sm",
  org: "border-b-2 border-secondary bg-secondary-fixed px-1 rounded-sm",
  date: "border-b-2 border-tertiary bg-tertiary-fixed px-1 rounded-sm",
  monetary: "border-b-2 border-secondary-container bg-secondary-container/20 px-1 rounded-sm",
};

export function highlightEntities(text: string, entities: Entity[]): ReactNode[] {
  const spans = entities
    .filter((e) => e.spanStart != null && e.spanEnd != null && e.spanEnd! <= text.length)
    .sort((a, b) => a.spanStart! - b.spanStart!);

  const nodes: ReactNode[] = [];
  let cursor = 0;

  for (const span of spans) {
    const start = span.spanStart!;
    const end = span.spanEnd!;
    if (start < cursor) continue; // skip overlaps
    if (start > cursor) nodes.push(text.slice(cursor, start));
    nodes.push(
      <span key={`${start}-${end}`} className={ENTITY_STYLES[span.entityType] ?? ""}>
        {text.slice(start, end)}
      </span>,
    );
    cursor = end;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));

  return nodes;
}
