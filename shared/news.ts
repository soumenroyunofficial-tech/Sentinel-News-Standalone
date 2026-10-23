
export const NEWS_SOURCES = [
  { id: "ap", name: "Associated Press", domains: ["apnews.com"] },
  { id: "bbc", name: "BBC News", domains: ["bbc.com", "bbc.co.uk"] },
  { id: "reuters", name: "Reuters", domains: ["reuters.com"] },
  { id: "guardian", name: "The Guardian", domains: ["theguardian.com"] },
  { id: "npr", name: "NPR", domains: ["npr.org"] },
  { id: "aljazeera", name: "Al Jazeera English", domains: ["aljazeera.com"] },
  { id: "dw", name: "Deutsche Welle", domains: ["dw.com"] },
  { id: "thehindu", name: "The Hindu", domains: ["thehindu.com"] },
  { id: "ndtv", name: "NDTV", domains: ["ndtv.com"] },
  { id: "toi", name: "Times of India", domains: ["timesofindia.indiatimes.com"] },
  { id: "indiatoday", name: "India Today", domains: ["indiatoday.in"] },
  { id: "sky", name: "Sky News", domains: ["sky.com"] },
  { id: "euronews", name: "Euronews", domains: ["euronews.com"] },
  { id: "cbs", name: "CBS News", domains: ["cbsnews.com"] },
  { id: "nytimes", name: "The New York Times", domains: ["nytimes.com"] },
] as const;

export type NewsSourceId = (typeof NEWS_SOURCES)[number]["id"];

export interface NewsArticle {
  id: string;
  title: string;
  source: string;
  sourceId: NewsSourceId;
  url: string;
  publishedAt: string | null;
  snippet: string;
  topic: string;
  clusterId: string;
}

export interface NewsResponse {
  articles: NewsArticle[];
  queriedSources: number;
  availableSources: number;
  partial: boolean;
  updatedAt: string;
  sourceErrors: string[];
}

export interface BriefResponse {
  text: string;
  citations: Array<Pick<NewsArticle, "id" | "title" | "source" | "url"> & { ref: string }>;
}
