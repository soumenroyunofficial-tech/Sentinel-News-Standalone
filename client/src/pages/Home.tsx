import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  Activity, Bookmark, BookmarkCheck, BrainCircuit, Check, ChevronDown, ChevronRight, Clock3,
  Compass, Database, ExternalLink, Filter, Globe2, Layers3, ListFilter, LoaderCircle,
  MapPin, Newspaper, Radio, RefreshCw, Search, ShieldCheck, SlidersHorizontal,
  Sparkles, Target, Trash2, TrendingUp, X,
} from "lucide-react";
import type { BriefResponse, NewsArticle, NewsResponse } from "@shared/news";
import { NEWS_SOURCES } from "@shared/news";
import ArticleDrawer from "@/components/ArticleDrawer";
import BriefPanel from "@/components/BriefPanel";
import StoryCard from "@/components/StoryCard";
import {
  loadInvestigations, loadSaved, removeSaved, requestBrief, saveArticle, saveInvestigation,
  searchNews, type SavedItem, type SearchParams,
} from "@/lib/newsApi";

const DEFAULT_SOURCES = NEWS_SOURCES.map(source => source.id);
type View = "overview" | "search" | "saved";

function formatTime(value: string | null) {
  if (!value) return "TIME UNAVAILABLE";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "TIME UNAVAILABLE";
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", timeZone: "UTC", hour12: false }).format(date) + " UTC";
}

function BrandMark({ small = false }: { small?: boolean }) {
  return <span className={`brand-mark${small ? " brand-mark-small" : ""}`} aria-hidden="true"><i /><b /><em /></span>;
}

export default function Home() {
  const [view, setView] = useState<View>("overview");
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("");
  const [geography, setGeography] = useState("");
  const [days, setDays] = useState("1");
  const [language, setLanguage] = useState("en");
  const [sort, setSort] = useState<"recent" | "relevance">("recent");
  const [selectedSources, setSelectedSources] = useState<string[]>(DEFAULT_SOURCES);
  const [sourcePickerOpen, setSourcePickerOpen] = useState(false);
  const [data, setData] = useState<NewsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [workspaceNotice, setWorkspaceNotice] = useState("");
  const [saved, setSaved] = useState<SavedItem[]>(() => loadSaved());
  const [investigations, setInvestigations] = useState<SavedItem[]>(() => loadInvestigations());
  const [drawerArticle, setDrawerArticle] = useState<NewsArticle | null>(null);
  const [drawerCollectedAt, setDrawerCollectedAt] = useState<string | null>(null);
  const [briefOutput, setBriefOutput] = useState<BriefResponse | null>(null);
  const [briefError, setBriefError] = useState("");
  const [briefBusy, setBriefBusy] = useState(false);
  const [briefEvidence, setBriefEvidence] = useState<NewsArticle[]>([]);
  const [clock, setClock] = useState(new Date());
  const searchRef = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);

  const articles = data?.articles ?? [];
  const clusterSizes = useMemo(() => {
    const sizes = new Map<string, number>();
    articles.forEach(article => sizes.set(article.clusterId, (sizes.get(article.clusterId) ?? 0) + 1));
    return sizes;
  }, [articles]);
  const coverageLeader = useMemo(() => {
    const groups = new Map<string, NewsArticle[]>();
    articles.forEach(article => groups.set(article.clusterId, [...(groups.get(article.clusterId) ?? []), article]));
    return [...groups.values()]
      .filter(group => new Set(group.map(article => article.sourceId)).size > 1)
      .sort((a, b) => new Set(b.map(article => article.sourceId)).size - new Set(a.map(article => article.sourceId)).size)[0]?.[0] ?? null;
  }, [articles]);
  const coverageSources = coverageLeader ? [...new Set(articles.filter(article => article.clusterId === coverageLeader.clusterId).map(article => article.source))] : [];
  const topicCounts = useMemo(() => {
    const counts = new Map<string, number>();
    articles.forEach(article => counts.set(article.topic, (counts.get(article.topic) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [articles]);
  const savedIds = useMemo(() => new Set(saved.map(item => item.id)), [saved]);
  const analystEvidence = briefEvidence.length ? briefEvidence : articles.slice(0, 5);

  const currentParams = (): SearchParams => ({ query, topic, geography, sources: selectedSources, days, language, sort });
  const paramsRef = useRef<SearchParams>(currentParams());
  paramsRef.current = currentParams();

  async function runSearch(overrides: Partial<SearchParams> = {}) {
    const params = { ...currentParams(), ...overrides };
    const sequence = ++requestId.current;
    setLoading(true);
    setLoadError("");
    try {
      const result = await searchNews(params);
      if (sequence !== requestId.current) return;
      setData(result);
      setBriefOutput(null);
      setBriefEvidence([]);
      setBriefError("");
    } catch (error) {
      if (sequence !== requestId.current) return;
      setLoadError(error instanceof Error ? error.message : "News collection could not be reached.");
    } finally {
      if (sequence === requestId.current) setLoading(false);
    }
  }

  useEffect(() => { void runSearch(); }, []);
  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => {
      const sequence = ++requestId.current;
      void searchNews(paramsRef.current).then(result => {
        if (sequence !== requestId.current) return;
        setData(result);
        setLoadError("");
        setBriefOutput(null);
        setBriefEvidence([]);
        setBriefError("");
      }).catch(error => {
        if (sequence === requestId.current) setLoadError(error instanceof Error ? error.message : "News collection could not be reached.");
      });
    }, 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setView("search");
    void runSearch();
  }

  function toggleSource(id: string) {
    setSelectedSources(current => {
      if (current.includes(id)) return current.length === 1 ? current : current.filter(item => item !== id);
      return [...current, id];
    });
  }

  function openArticle(article: NewsArticle, collectedAt = data?.updatedAt ?? null) {
    setDrawerArticle(article);
    setDrawerCollectedAt(collectedAt);
  }

  function toggleSave(article: NewsArticle, collectedAt = data?.updatedAt ?? null) {
    const stored = savedIds.has(article.id) ? removeSaved(article.id) : saveArticle(article, collectedAt);
    setWorkspaceNotice(stored ? "" : "This browser could not update the saved workspace. Check its available storage and try again.");
    setSaved(loadSaved());
    setInvestigations(loadInvestigations());
  }

  function saveCurrentSearch() {
    const label = query.trim() || [topic, geography].filter(Boolean).join(" · ") || "Latest reporting";
    const stored = saveInvestigation(label, currentParams());
    setWorkspaceNotice(stored ? "" : "This browser could not save the investigation. Check its available storage and try again.");
    setInvestigations(loadInvestigations());
  }

  function reopenInvestigation(item: SavedItem) {
    const params = item.search ?? { ...currentParams(), query: item.label };
    setQuery(params.query);
    setTopic(params.topic);
    setGeography(params.geography);
    setSelectedSources(params.sources.length ? params.sources : DEFAULT_SOURCES);
    setDays(params.days);
    setLanguage(params.language);
    setSort(params.sort);
    setView("search");
    void runSearch(params);
  }

  function deleteSaved(id: string) {
    setWorkspaceNotice(removeSaved(id) ? "" : "This browser could not update the saved workspace. Check its available storage and try again.");
    setSaved(loadSaved());
    setInvestigations(loadInvestigations());
  }

  async function generateBrief(kind: "brief" | "ask", evidence = articles.slice(0, 5), question = "") {
    if (!evidence.length) return;
    setBriefBusy(true);
    setBriefError("");
    setBriefOutput(null);
    setBriefEvidence(evidence);
    try {
      setBriefOutput(await requestBrief(kind, evidence, question));
    } catch (error) {
      setBriefError(error instanceof Error ? error.message : "The AI analyst is temporarily unavailable.");
    } finally {
      setBriefBusy(false);
    }
  }

  const title = view === "search" ? "Bounded source search" : view === "saved" ? "Saved workspace" : "Situation overview";
  const viewHint = view === "search" ? "Search selected publishers by phrase. Use the analyst console for questions requiring synthesis." : view === "saved" ? "Your saved reporting and investigations are stored locally in this browser." : "Latest open-source reporting across your selected source set.";
  const activeSaved = saved;
  const activeInvestigations = investigations;
  const drawerRelated = drawerArticle ? articles.filter(item => item.clusterId === drawerArticle.clusterId && item.id !== drawerArticle.id) : [];

  return (
    <div className="sentinel-shell">
      <aside className="side-rail">
        <a className="brand-lockup" href="#overview" onClick={event => { event.preventDefault(); setView("overview"); }}>
          <BrandMark /><span className="brand-word">SENTINEL<small>OPEN-SOURCE INTELLIGENCE</small></span>
        </a>
        <div className="rail-classification"><span className="status-pulse" /> PUBLIC SOURCE MONITOR <b>LIVE</b></div>
        <div className="rail-section-label">WORKSPACE</div>
        <nav className="rail-nav" aria-label="Main navigation">
          <button aria-label="Overview" aria-current={view === "overview" ? "page" : undefined} className={view === "overview" ? "rail-link active" : "rail-link"} onClick={() => setView("overview")}><Compass size={16} /><span>Overview</span><ChevronRight size={13} /></button>
          <button aria-label="Search selected sources" aria-current={view === "search" ? "page" : undefined} className={view === "search" ? "rail-link active" : "rail-link"} onClick={() => { setView("search"); window.setTimeout(() => searchRef.current?.focus(), 0); }}><Search size={16} /><span>Deep search</span><span className="nav-shortcut">⌘ K</span></button>
          <button aria-label="Saved workspace" aria-current={view === "saved" ? "page" : undefined} className={view === "saved" ? "rail-link active" : "rail-link"} onClick={() => setView("saved")}><Bookmark size={16} /><span>Saved workspace</span><span className="nav-count">{saved.length + investigations.length}</span></button>
        </nav>
        <div className="rail-section-label source-nav-label">COLLECTION</div>
        <button className="rail-link collection-link" onClick={() => { setSourcePickerOpen(value => !value); window.scrollTo({ top: 0, behavior: "smooth" }); }} aria-label="Source monitor" aria-expanded={sourcePickerOpen} aria-controls="source-picker-panel"><Database size={16} /><span>Source monitor</span><span className="nav-count">{selectedSources.length}</span></button>
        <div className="rail-source-card">
          <div className="rail-source-top"><span>ACTIVE SOURCE SET</span><SlidersHorizontal size={13} /></div>
          <strong>{selectedSources.length} <small>/ 7 publishers</small></strong>
          <div className="source-meter"><i style={{ width: `${selectedSources.length / 7 * 100}%` }} /></div>
          <p>Coverage is intentionally limited to the publishers shown in search filters.</p>
        </div>
        <div className="rail-bottom">
          <div className="open-source-note"><ShieldCheck size={15} /><span>PUBLIC SOURCES ONLY<small>No classified feeds or operational data.</small></span></div>
          <div className="rail-build">SENTINEL // OPEN NEWS<br />COLLECTOR v1.0</div>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div className="mobile-brand"><BrandMark small /><b>SENTINEL</b></div>
          <div className="breadcrumb"><span>OPEN NEWS DESK</span><ChevronRight size={13} /><b>{view === "saved" ? "WORKSPACE" : view === "search" ? "SEARCH" : "OVERVIEW"}</b></div>
          <div className="topbar-tools"><span className="top-live"><i /> LIVE COLLECTION</span><span className="top-utc"><Clock3 size={13} /> {clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })} LOCAL</span><button className="top-refresh" onClick={() => void runSearch()} disabled={loading} title="Refresh live reporting"><RefreshCw size={15} className={loading ? "spin" : ""} /><span>Refresh</span></button></div>
        </header>

        <main className="dashboard-content">
          <div className="page-heading">
            <div><div className="eyebrow"><span className="section-mark" /> NEWS INTELLIGENCE / {clock.toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short", year: "numeric" }).toUpperCase()}</div><h1>{title}</h1><p>{viewHint}</p></div>
            <div className="classification-chip"><ShieldCheck size={14} /> OSINT <span>UNCLASSIFIED</span></div>
          </div>

          <form className="search-command" onSubmit={submitSearch}>
            <Search size={19} className="search-icon" />
            <input ref={searchRef} value={query} onChange={event => setQuery(event.target.value)} placeholder="Search a keyword, name, place or headline phrase…" aria-label="Search selected publishers by keyword or phrase" />
            {query && <button type="button" className="clear-query" onClick={() => setQuery("")} aria-label="Clear search"><X size={15} /></button>}
            <span className="search-divider" />
            <span className="search-scope"><Globe2 size={13} /> {selectedSources.length} SOURCES</span>
            <button className="search-submit" type="submit" aria-label="Search selected publishers"><span>Search</span><Search size={15} /></button>
          </form>

          <div className="filter-row">
            <div className="filter-source-wrap">
              <button id="source-filter-button" className={`filter-button${sourcePickerOpen ? " filter-selected" : ""}`} onClick={() => setSourcePickerOpen(value => !value)} type="button" aria-expanded={sourcePickerOpen} aria-controls="source-picker-panel"><Filter size={14} /> Sources <span className="filter-value">{selectedSources.length}/7</span><ChevronDown size={13} /></button>
              {sourcePickerOpen && <div id="source-picker-panel" className="source-popover" role="region" aria-label="Publisher source filters" onKeyDown={event => { if (event.key === "Escape") { setSourcePickerOpen(false); document.getElementById("source-filter-button")?.focus(); } }}><div className="popover-top"><b>Publishers in scope</b><button onClick={() => setSourcePickerOpen(false)} aria-label="Close sources"><X size={14} /></button></div><p>Only these outlets are queried.</p>{NEWS_SOURCES.map(source => <label className="source-check" key={source.id}><input type="checkbox" checked={selectedSources.includes(source.id)} onChange={() => toggleSource(source.id)} /><span className="fake-check"><Check size={12} /></span><span>{source.name}</span></label>)}<button className="apply-sources" type="button" onClick={() => { setSourcePickerOpen(false); void runSearch(); }}>Apply source set <ChevronRight size={14} /></button></div>}
            </div>
            <label className="filter-select"><Clock3 size={14} /><select value={days} onChange={event => setDays(event.target.value)} aria-label="Date range"><option value="1">Past 24 hours</option><option value="7">Past 7 days</option><option value="30">Past 30 days</option><option value="365">Past year</option><option value="all">Any time</option></select><ChevronDown size={13} /></label>
            <label className="filter-select topic-select"><Layers3 size={14} /><select value={topic} onChange={event => setTopic(event.target.value)} aria-label="Topic search hint"><option value="">All topics</option><option>Security</option><option>Politics</option><option>Technology</option><option>Business</option><option>Climate</option><option>Health</option><option>World</option></select><ChevronDown size={13} /></label>
            <label className="filter-geo"><MapPin size={14} /><input value={geography} onChange={event => setGeography(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void runSearch(); } }} placeholder="Location term" aria-label="Add a geography search hint" /></label>
            <label className="filter-select language-select"><Globe2 size={14} /><select value={language} onChange={event => setLanguage(event.target.value)} aria-label="News edition"><option value="en">English · US</option><option value="es">Español · US</option><option value="fr">Français · FR</option><option value="de">Deutsch · DE</option><option value="ar">العربية · UAE</option></select><ChevronDown size={13} /></label>
            <label className="filter-select sort-select"><TrendingUp size={14} /><select value={sort} onChange={event => setSort(event.target.value as "recent" | "relevance")} aria-label="Sort"><option value="recent">Most recent</option><option value="relevance">Relevance</option></select><ChevronDown size={13} /></label>
            <button className="apply-filter" onClick={() => void runSearch()} type="button">Apply filters</button>
          </div>
          <p className="filter-scope-hint">Topic and location are Google News search hints. Edition guides the feed query; individual article language and topic are not independently verified.</p>
          {workspaceNotice && <div className="workspace-storage-notice" role="status">{workspaceNotice}</div>}

          {view === "saved" ? (
            <section className="saved-workspace">
              <div className="saved-header"><div><div className="eyebrow"><BookmarkCheck size={12} /> PERSONAL WORKSPACE</div><h2>Saved reporting & investigations</h2><p>Stored as plain text in this browser on this device; not encrypted or synced. Remove items when finished, especially on a shared device.</p></div><button className="secondary-action" onClick={saveCurrentSearch}><Bookmark size={14} /> Save current search</button></div>
              <div className="saved-columns">
                <section className="panel saved-list-panel"><div className="panel-heading"><div><div className="eyebrow">REFERENCE LIBRARY</div><h2>Saved reports <span className="count-pill">{activeSaved.length}</span></h2></div></div>{activeSaved.length ? activeSaved.map(item => item.article && <div className="saved-row" key={item.id}><button className="saved-row-copy" onClick={() => openArticle(item.article!, item.collectedAt)}><span className="saved-source">{item.article.source} · {formatTime(item.article.publishedAt)}</span><b>{item.label}</b></button><button className="icon-action delete-action" onClick={() => deleteSaved(item.id)} aria-label="Remove saved report"><Trash2 size={14} /></button></div>) : <div className="empty-saved"><Bookmark size={22} /><b>No reports saved yet</b><span>Use the bookmark icon on a story to add it here.</span></div>}</section>
                <section className="panel saved-list-panel"><div className="panel-heading"><div><div className="eyebrow">SEARCH FILES</div><h2>Investigations <span className="count-pill">{activeInvestigations.length}</span></h2></div></div>{activeInvestigations.length ? activeInvestigations.map(item => <div className="saved-row" key={item.id}><button className="saved-row-copy" onClick={() => reopenInvestigation(item)}><span className="saved-source">SAVED QUERY · {new Date(item.savedAt).toLocaleDateString()}</span><b>{item.label}</b></button><button className="icon-action delete-action" onClick={() => deleteSaved(item.id)} aria-label="Remove saved search"><Trash2 size={14} /></button></div>) : <div className="empty-saved"><Search size={22} /><b>No investigations saved</b><span>Save your current search to reopen it later.</span></div>}</section>
              </div>
            </section>
          ) : (
            <>
              <div className="telemetry-strip">
                <div className="telemetry-item"><div className="telemetry-icon teal"><Radio size={17} /></div><div><span>REPORTS IN VIEW</span><b>{loading && !data ? "—" : articles.length.toString().padStart(2, "0")}</b></div></div>
                <div className="telemetry-divider" />
                <div className="telemetry-item"><div className="telemetry-icon amber"><Database size={17} /></div><div><span>SOURCES ONLINE</span><b>{data ? `${data.availableSources}/${data.queriedSources}` : "—"}</b></div></div>
                <div className="telemetry-divider" />
                <div className="telemetry-item"><div className="telemetry-icon blue"><Activity size={17} /></div><div><span>COLLECTION STATE</span><b className="telemetry-state">{loading ? "UPDATING" : data?.partial ? "PARTIAL" : data ? "CURRENT" : "STANDBY"}</b></div></div>
                <div className="telemetry-updated"><span>LAST COLLECTION</span><b>{data?.updatedAt ? formatTime(data.updatedAt) : "WAITING"}</b></div>
              </div>

              {data?.partial && <div className="partial-notice"><Radio size={14} /><span>Partial collection: {data.availableSources} of {data.queriedSources} selected sources responded.</span></div>}
              {loadError && <div className="feed-error" role="alert"><span><X size={15} /> {loadError}</span><button onClick={() => void runSearch()}>Retry <RefreshCw size={13} /></button></div>}

              {view === "overview" && articles.length > 0 && (
                <div className="signal-ticker"><div className="ticker-label"><span className="status-pulse" /> LATEST</div><div className="ticker-headline">{articles.slice(0, 2).map(article => <span key={article.id}><b>{article.source.toUpperCase()}</b> {article.title}</span>)}</div><button onClick={() => setView("search")} aria-label="View all reports"><ChevronRight size={16} /></button></div>
              )}

              <div className="workspace-grid">
                <section className="feed-column">
                  {view === "overview" && <div className="coverage-signal"><span className="coverage-icon"><Layers3 size={16} /></span><div className="coverage-copy"><div className="eyebrow"><Target size={11} /> PRIORITY CUE / CROSS-PUBLISHER COVERAGE</div>{coverageLeader ? <><button className="coverage-headline" onClick={() => openArticle(coverageLeader)}>{coverageLeader.title}</button><small>{coverageSources.length} publishers · {coverageSources.join(" · ")}</small></> : <span className="coverage-empty">No multi-publisher story cluster in this collection yet.</span>}</div><span className="coverage-limit">Coverage breadth only<br />not a risk score</span></div>}
                  <div className="feed-heading"><div><div className="eyebrow"><span className="live-dot" /> {view === "search" ? "QUERY RESULTS" : "LIVE INTELLIGENCE"}</div><h2>{view === "search" && query ? `Results for “${query}”` : "Latest reporting"}</h2></div><div className="feed-heading-actions"><span><ListFilter size={13} /> {articles.length} reports</span><button className="save-query-button" onClick={saveCurrentSearch}><Bookmark size={13} /> Save search</button></div></div>
                  {loading && articles.length === 0 && <div className="loading-state"><LoaderCircle size={24} className="spin" /><span>Querying selected public sources…</span></div>}
                  {!loading && !loadError && articles.length === 0 && <div className="empty-feed"><Newspaper size={24} /><h3>No matching stories in this source set</h3><p>Try a broader date range, fewer filters or a different query.</p><button className="secondary-action" onClick={() => { setQuery(""); setTopic(""); setGeography(""); setDays("1"); setSelectedSources(DEFAULT_SOURCES); void runSearch({ query: "", topic: "", geography: "", days: "1", sources: DEFAULT_SOURCES }); }}>Reset filters</button></div>}
                  <div className="story-list">{articles.map((article, index) => <div className={`story-wrap${index === 0 ? " first-story" : ""}`} key={article.id}>{index === 0 && view === "overview" && <div className="lead-label"><Target size={12} /> NEWEST REPORT</div>}<StoryCard article={article} clusterSize={clusterSizes.get(article.clusterId) ?? 1} saved={savedIds.has(article.id)} onOpen={() => openArticle(article)} onSave={() => toggleSave(article)} onBrief={() => void generateBrief("brief", [article])} /></div>)}</div>
                </section>
                <aside className="right-column">
                  <BriefPanel articles={analystEvidence} busy={briefBusy} output={briefOutput} error={briefError} onBrief={() => void generateBrief("brief", articles.slice(0, 5))} onAsk={question => void generateBrief("ask", analystEvidence, question)} />
                  <section className="panel emerging-panel"><div className="panel-heading"><div><div className="eyebrow"><TrendingUp size={12} /> SIGNAL WATCH</div><h2>Emerging topics</h2></div><span className="derived-label">FROM RESULTS</span></div>{topicCounts.length ? <div className="topic-list">{topicCounts.map(([name, count], index) => <button key={name} className="topic-row" onClick={() => { setTopic(name); setView("search"); void runSearch({ topic: name }); }}><span className={`topic-rank rank-${index + 1}`}>{String(index + 1).padStart(2, "0")}</span><span className="topic-name">{name}</span><span className="topic-count">{count} report{count === 1 ? "" : "s"}</span><ChevronRight size={13} /></button>)}</div> : <p className="topic-empty">Topics will appear as reports arrive.</p>}<p className="topic-disclaimer">Topic tags are lightweight signals based on headline and excerpt wording, not threat ratings.</p></section>
                  <div className="source-scope-note"><ShieldCheck size={15} /><div><b>Source scope is limited</b><p>Results come from the {selectedSources.length} selected publishers above and refresh every five minutes. This is not a complete internet index.</p></div></div>
                  <button className="source-footer-link" onClick={() => setSourcePickerOpen(true)}><SlidersHorizontal size={13} /> Review source set <ChevronRight size={13} /></button>
                </aside>
              </div>
            </>
          )}
          <footer className="page-footer"><span>SENTINEL // PUBLIC NEWS ANALYSIS</span><span>NOT CLASSIFIED · VERIFY WITH ORIGINAL REPORTING</span></footer>
        </main>
      </div>

      {drawerArticle && <ArticleDrawer article={drawerArticle} related={drawerRelated} saved={savedIds.has(drawerArticle.id)} collectedAt={drawerCollectedAt} onClose={() => { setDrawerArticle(null); setDrawerCollectedAt(null); }} onSave={() => toggleSave(drawerArticle, drawerCollectedAt)} onRelated={article => openArticle(article)} onPivot={value => { setQuery(value); setTopic(""); setView("search"); setDrawerArticle(null); setDrawerCollectedAt(null); void runSearch({ query: value, topic: "" }); }} />}
    </div>
  );
}
