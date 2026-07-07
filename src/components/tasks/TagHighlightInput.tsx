"use client";

import { forwardRef, useEffect, useRef, useCallback } from "react";
import { parseTags } from "@/lib/domain/tags/parser";
import { parseDates } from "@/lib/domain/dates/parser";

interface Mark {
  start: number;
  end: number;
  isTag: boolean;
  symbol?: string;
}

function buildHighlight(text: string) {
  const { tags } = parseTags(text);
  const dates = parseDates(text);
  if (tags.length === 0 && dates.length === 0) return null;

  const marks: Mark[] = [
    ...tags.map((tag) => ({ start: tag.start, end: tag.end, isTag: true, symbol: tag.symbol })),
    ...dates.map((date) => ({ start: date.start, end: date.end, isTag: false })),
  ].sort((a, b) => a.start - b.start);

  const segments: { text: string; isTag: boolean; isDate?: boolean; symbol?: string }[] = [];
  let last = 0;

  for (const mark of marks) {
    if (mark.start < last) continue;
    if (mark.start > last) {
      segments.push({ text: text.slice(last, mark.start), isTag: false });
    }
    segments.push({
      text: text.slice(mark.start, mark.end),
      isTag: mark.isTag,
      isDate: !mark.isTag,
      symbol: mark.symbol,
    });
    last = mark.end;
  }

  if (last < text.length) {
    segments.push({ text: text.slice(last), isTag: false });
  }

  return segments;
}

const TAG_CLASS: Record<string, string> = {
  "#": "tag-exec",
  "@": "tag-ref",
  "/": "tag-work",
  "$": "tag-label",
};

function renderSegments(
  segments: ReturnType<typeof buildHighlight>,
  userNames?: Set<string>,
) {
  if (!segments) return null;
  return segments.map((seg, i) => {
    let cls = TAG_CLASS[seg.symbol!] ?? "";
    if (seg.isTag && seg.symbol === "@" && userNames) {
      const name = seg.text.slice(1).toLowerCase().replace(/-/g, " ");
      for (const u of userNames) {
        if (u.toLowerCase() === name) { cls = "tag-user"; break; }
      }
    }
    return seg.isTag ? (
      <span key={i} className={`tag-hl ${cls}`}>{seg.text}</span>
    ) : seg.isDate ? (
      <span key={i} className="date-highlight">{seg.text}</span>
    ) : (
      <span key={i}>{seg.text}</span>
    );
  });
}

interface Props extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value"> {
  value: string;
  userNames?: Set<string>;
  multiline?: boolean;
}

export const TagHighlightInput = forwardRef<HTMLTextAreaElement, Props>(
  function TagHighlightInput({ value, className, userNames, multiline, ...rest }, ref) {
    const internalRef = useRef<HTMLTextAreaElement | null>(null);
    const segments = buildHighlight(value);

    const setRef = useCallback((el: HTMLTextAreaElement | null) => {
      internalRef.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
    }, [ref]);

    useEffect(() => {
      if (!multiline) return;
      const el = internalRef.current;
      if (!el) return;
      el.style.height = "auto";
      const h = el.scrollHeight;
      el.style.height = (h > 0 ? h : 24) + "px";
    }, [value, multiline]);

    return (
      <div className="tag-highlight-wrapper">
        {segments && (
          <div className="tag-highlight-overlay" aria-hidden="true">
            {renderSegments(segments, userNames)}
          </div>
        )}
        <textarea
          ref={setRef}
          className={`${className ?? ""} ${segments ? "tag-highlight-input" : ""}`}
          value={value}
          rows={1}
          {...rest}
        />
      </div>
    );
  },
);
