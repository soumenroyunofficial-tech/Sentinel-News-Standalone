import { Bookmark, Clock3, ExternalLink, Layers3, Sparkles } from "lucide-react";
import type { NewsArticle } from "@shared/news";

function timeAgo(value: string | null) {
  if (!value) return "Time not supplied";
  const publishedAt = new Date(value).getTime();
  if (!Number.isFinite(publishedAt)) return "Time not supplied";
  const minutes = Math.max(0, Math.floor((Date.now() - publishedAt) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}

export default function StoryCard({
  article, clusterSize, saved, onOpen, onSave, onBrief,
}: {
  article: NewsArticle;
  clusterSize: number;
  saved: boolean;
  onOpen: () => void;
  onSave: () => void;
  onBrief: () => void;
}) {
  return (
    <article className="story-card">
      <div className="story-meta">
        <span className={`source-mark source-${article.sourceId}`}>{article.source}</span>
        <span className="meta-separator" />
        <span><Clock3 size={12} /> {timeAgo(article.publishedAt)}</span>
        <span className="meta-spacer" />
        <span className="topic-chip">{article.topic}</span>
      </div>
      <button className="story-headline" type="button" onClick={onOpen}>{article.title}</button>
      {article.snippet && <p className="story-snippet">{article.snippet}</p>}
      <div className="story-footer">
        <div className="story-actions">
          <button type="button" className="text-action" onClick={onOpen}>Open intelligence <ExternalLink size={13} /></button>
          <button type="button" className="icon-action" title={saved ? "Saved" : "Save story"} onClick={onSave} aria-label={saved ? "Saved story" : "Save story"}>
            <Bookmark size={15} fill={saved ? "currentColor" : "none"} />
          </button>
          <button type="button" className="icon-action" title="Generate AI brief" onClick={onBrief} aria-label="Generate AI brief"><Sparkles size={15} /></button>
        </div>
        {clusterSize > 1 && <span className="cluster-count"><Layers3 size={13} /> {clusterSize} reports</span>}
      </div>
    </article>
  );
}
