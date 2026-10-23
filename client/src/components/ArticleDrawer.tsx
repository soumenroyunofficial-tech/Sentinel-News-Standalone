import { useEffect, useRef } from "react";
import { Bookmark, Clock3, ExternalLink, Layers3, MapPin, Search, X } from "lucide-react";
import type { NewsArticle } from "@shared/news";

function readableDate(value: string | null) {
  if (!value) return "Publication time not supplied";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date) : "Publication time not supplied";
}

function readableCollectionDate(value: string | null) {
  if (!value) return "Collection time not recorded";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date) : "Collection time not recorded";
}

function headlineTerms(title: string, source: string) {
  const cleanTitle = title.replace(/\s+[-–—|]\s+(?:AP News|Associated Press|Reuters|BBC(?: News)?|NPR|The Guardian|Al Jazeera(?: English)?|DW(?:\.com)?)$/i, "");
  const stop = new Set(["The", "A", "An", "After", "Before", "How", "What", "Why", "When", "Where", "Who", "This", "That", "New", "Latest", "Breaking", "Watch", "Video", "Opinion", "News", "Reuters", "Associated", "Press", "BBC", "NPR", "Guardian", "Jazeera", "English", "Deutsche", "Welle", "DW", "AP"]);
  return [...new Set(cleanTitle.match(/\b(?:[A-Z]{2,}|[A-Z][\p{L}\p{M}'’.-]{2,})\b/gu) ?? [])]
    .filter(term => !stop.has(term) && term.toLowerCase() !== source.toLowerCase())
    .slice(0, 6);
}

export default function ArticleDrawer({
  article, related, saved, collectedAt, onClose, onSave, onRelated, onPivot,
}: {
  article: NewsArticle;
  related: NewsArticle[];
  saved: boolean;
  collectedAt: string | null;
  onClose: () => void;
  onSave: () => void;
  onRelated: (article: NewsArticle) => void;
  onPivot: (query: string) => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const closeHandlerRef = useRef(onClose);
  closeHandlerRef.current = onClose;

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = closeButtonRef.current?.closest<HTMLElement>("[role='dialog']");
    const focusables = () => Array.from(dialog?.querySelectorAll<HTMLElement>("a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex='-1'])") ?? []);
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeHandlerRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const controls = focusables();
      if (!controls.length) {
        event.preventDefault();
        dialog?.focus();
        return;
      }
      if (event.shiftKey && document.activeElement === controls[0]) {
        event.preventDefault();
        controls.at(-1)?.focus();
      } else if (!event.shiftKey && document.activeElement === controls.at(-1)) {
        event.preventDefault();
        controls[0].focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <aside className="article-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" tabIndex={-1}>
        <div className="drawer-top"><span className="eyebrow">ARTICLE INTELLIGENCE / {article.id.slice(0, 6).toUpperCase()}</span><button ref={closeButtonRef} className="icon-action" onClick={onClose} aria-label="Close article details"><X size={18} /></button></div>
        <span className={`source-mark source-${article.sourceId}`}>{article.source}</span>
        <h2 id="drawer-title" className="drawer-title">{article.title}</h2>
        <div className="drawer-date"><Clock3 size={14} /> {readableDate(article.publishedAt)}</div>
        <div className="drawer-brief"><span className="eyebrow">SOURCE EXCERPT</span><p>{article.snippet || "No excerpt was supplied by the feed. Open the publisher's story for its full report."}</p></div>
        <div className="context-block"><span className="eyebrow">REPORTING CONTEXT</span><div className="context-row"><span><Layers3 size={14} /> Topic signal</span><b>{article.topic}</b></div><div className="context-row"><span><MapPin size={14} /> Coverage</span><b>Open-source reporting</b></div><div className="context-row"><span><Clock3 size={14} /> Published</span><b>{readableDate(article.publishedAt)}</b></div><div className="context-row"><span><Clock3 size={14} /> Collected</span><b>{readableCollectionDate(collectedAt)}</b></div></div>
        <div className="headline-pivots"><span className="eyebrow">SEARCH PIVOTS</span><button onClick={() => onPivot(article.topic)}><Layers3 size={13} /> Topic · {article.topic}<Search size={12} /></button><div className="headline-term-list">{headlineTerms(article.title, article.source).map(term => <button key={term} onClick={() => onPivot(term)}><MapPin size={11} /> {term}<Search size={10} /></button>)}</div><button onClick={() => onPivot(article.title)}><Search size={13} /> Search this headline</button><small>Headline name signals are unverified search pivots, not entity extraction. All pivots query only the selected public publishers.</small></div>
        <div className="drawer-actions"><a className="publisher-link" href={article.url} target="_blank" rel="noopener noreferrer">Open story via Google News <ExternalLink size={14} /></a><button className="secondary-action" onClick={onSave}><Bookmark size={14} fill={saved ? "currentColor" : "none"} /> {saved ? "Saved to workspace" : "Save report"}</button></div>
        <p className="source-link-note">The RSS article link opens its Google News story page, which provides the publisher's linked report.</p>
        {related.length > 0 && <div className="related-block"><div className="eyebrow">RELATED COVERAGE <span>{related.length}</span></div>{related.map(item => <button key={item.id} className="related-item" onClick={() => onRelated(item)}><small>{item.source} · {readableDate(item.publishedAt)}</small><strong>{item.title}</strong></button>)}</div>}
        <p className="drawer-disclaimer">This workspace analyzes public reporting only. It is not classified, a threat assessment, or operational guidance.</p>
      </aside>
    </div>
  );
}
