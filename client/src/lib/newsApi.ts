import { NEWS_SOURCES, type BriefResponse, type NewsArticle, type NewsResponse, type NewsSourceId } from "@shared/news";

export interface SearchParams {
  query: string;
  topic: string;
  geography: string;
  sources: string[];
  days: string;
  language: string;
  sort: "recent" | "relevance";
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
  return payload;
}

export async function searchNews(params: SearchParams): Promise<NewsResponse> {
  const query = new URLSearchParams({
    query: params.query,
    topic: params.topic,
    geography: params.geography,
    sources: params.sources.join(","),
    days: params.days,
    language: params.language,
    sort: params.sort,
  });
  return readJson<NewsResponse>(await fetch(`/api/news?${query}`, { cache: "no-store", signal: AbortSignal.timeout(30_000) }));
}

export async function requestBrief(
  kind: "brief" | "ask",
  articles: NewsArticle[],
  question = ""
): Promise<BriefResponse> {
  return readJson<BriefResponse>(await fetch("/api/brief", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind,
      articles: articles.slice(0, 8),
      question: question.slice(0, 700)
    }),
    signal: AbortSignal.timeout(100_000),
  }));
}

const SAVED_KEY = "sentinel.saved.v1";
const QUERIES_KEY = "sentinel.queries.v1";
const SOURCE_IDS = new Set<string>(NEWS_SOURCES.map(source => source.id));
const TOPICS = new Set(["Security", "Politics", "Technology", "Business", "Climate", "Health", "World"]);
const DAYS = new Set(["1", "7", "30", "365", "all"]);
const LANGUAGES = new Set(["en", "es", "fr", "de", "ar"]);
export interface SavedItem { id: string; kind: "article" | "search"; label: string; article?: NewsArticle; search?: SearchParams; savedAt: string; collectedAt: string | null; }

type RecordValue = Record<string, unknown>;

function record(value: unknown): value is RecordValue {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function cleanText(value: unknown, limit: number) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function safeNewsArticle(value: unknown): NewsArticle | null {
  if (!record(value)) return null;
  const sourceIdText = cleanText(value.sourceId, 24);
  const source = NEWS_SOURCES.find(item => item.id === sourceIdText);
  const title = cleanText(value.title, 300);
  const id = cleanText(value.id, 40);
  if (!source || !title || !id) return null;
  let url: URL;
  try { url = new URL(cleanText(value.url, 2048)); } catch { return null; }
  if (url.protocol !== "https:" || url.hostname !== "news.google.com" || url.username || url.password || !url.pathname.startsWith("/rss/articles/")) return null;
  const dateText = value.publishedAt === null ? null : cleanText(value.publishedAt, 60);
  const publishedAt = dateText && Number.isFinite(Date.parse(dateText)) ? new Date(dateText).toISOString() : null;
  const topicText = cleanText(value.topic, 32);
  return {
    id,
    title,
    source: source.name,
    sourceId: source.id as NewsSourceId,
    url: url.toString(),
    publishedAt,
    snippet: cleanText(value.snippet, 1_200),
    topic: TOPICS.has(topicText) ? topicText : "World",
    clusterId: cleanText(value.clusterId, 40) || id,
  };
}

function safeSearchParams(value: unknown): SearchParams | null {
  if (!record(value)) return null;
  if (!Array.isArray(value.sources) || value.sources.length < 1 || value.sources.length > NEWS_SOURCES.length) return null;
  if (value.sources.some(source => typeof source !== "string" || !SOURCE_IDS.has(source))) return null;
  const days = cleanText(value.days, 8);
  const language = cleanText(value.language, 8);
  const sort = cleanText(value.sort, 16);
  if (!DAYS.has(days) || !LANGUAGES.has(language) || (sort !== "recent" && sort !== "relevance")) return null;
  return {
    query: cleanText(value.query, 240),
    topic: cleanText(value.topic, 80),
    geography: cleanText(value.geography, 80),
    sources: [...new Set(value.sources as string[])],
    days,
    language,
    sort,
  };
}

function safeSavedItem(value: unknown): SavedItem | null {
  if (!record(value)) return null;
  const savedAtText = cleanText(value.savedAt, 60);
  const savedAtMs = Date.parse(savedAtText);
  const savedAt = Number.isFinite(savedAtMs) ? new Date(savedAtMs).toISOString() : new Date().toISOString();
  const collectionText = cleanText(value.collectedAt, 60);
  const collectionMs = Date.parse(collectionText);
  const collectedAt = collectionText && Number.isFinite(collectionMs) ? new Date(collectionMs).toISOString() : null;
  const label = cleanText(value.label, 300);
  if (value.kind === "article") {
    const article = safeNewsArticle(value.article);
    if (!article) return null;
    return { id: article.id, kind: "article", label: article.title, article, savedAt, collectedAt };
  }
  if (value.kind === "search") {
    const search = safeSearchParams(value.search);
    const id = cleanText(value.id, 80);
    if (!search || !label || !id) return null;
    return { id, kind: "search", label, search, savedAt, collectedAt: null };
  }
  return null;
}

function readSaved(key: string): SavedItem[] {
  try {
    const raw = window.localStorage.getItem(key) || "[]";
    if (raw.length > 512_000) return [];
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    const limit = key === SAVED_KEY ? 100 : 50;
    return value.slice(0, limit).map(safeSavedItem).filter((item): item is SavedItem => item !== null);
  } catch { return []; }
}

function writeSaved(key: string, items: SavedItem[], limit: number) {
  try {
    window.localStorage.setItem(key, JSON.stringify(items.slice(0, limit)));
    return true;
  } catch { return false; }
}

export function loadSaved() { return readSaved(SAVED_KEY); }
export function loadInvestigations() { return readSaved(QUERIES_KEY); }

export function saveArticle(article: NewsArticle, collectedAt: string | null = null) {
  const safeArticle = safeNewsArticle(article);
  if (!safeArticle) return false;
  const collectedMs = collectedAt ? Date.parse(collectedAt) : Number.NaN;
  const safeCollectedAt = Number.isFinite(collectedMs) ? new Date(collectedMs).toISOString() : null;
  const saved = loadSaved().filter(item => item.id !== safeArticle.id);
  saved.unshift({ id: safeArticle.id, kind: "article", label: safeArticle.title, article: safeArticle, savedAt: new Date().toISOString(), collectedAt: safeCollectedAt });
  return writeSaved(SAVED_KEY, saved, 100);
}

export function saveInvestigation(label: string, search: SearchParams) {
  const clean = cleanText(label, 240);
  const safeSearch = safeSearchParams(search);
  if (!clean || !safeSearch) return false;
  const signature = JSON.stringify([clean.toLowerCase(), safeSearch]);
  const hash = Array.from(signature).reduce((value, character) => Math.imul(value ^ character.charCodeAt(0), 16777619) >>> 0, 2166136261).toString(16);
  const id = `query-${hash}`;
  const saved = loadInvestigations().filter(item => item.id !== id);
  saved.unshift({ id, kind: "search", label: clean, search: safeSearch, savedAt: new Date().toISOString(), collectedAt: null });
  return writeSaved(QUERIES_KEY, saved, 50);
}

export function removeSaved(id: string) {
  const safeId = cleanText(id, 80);
  if (!safeId) return false;
  const reportsRemoved = writeSaved(SAVED_KEY, loadSaved().filter(item => item.id !== safeId), 100);
  const searchesRemoved = writeSaved(QUERIES_KEY, loadInvestigations().filter(item => item.id !== safeId), 50);
  return reportsRemoved && searchesRemoved;
}
