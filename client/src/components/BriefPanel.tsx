import { FormEvent, useState } from "react";
import { ArrowUp, Bot, ExternalLink, LoaderCircle, Sparkles } from "lucide-react";
import type { BriefResponse, NewsArticle } from "@shared/news";

export default function BriefPanel({
  articles, busy, output, error, onBrief, onAsk,
}: {
  articles: NewsArticle[];
  busy: boolean;
  output: BriefResponse | null;
  error: string;
  onBrief: () => void;
  onAsk: (question: string) => void;
}) {
  const [question, setQuestion] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const clean = question.trim();
    if (!clean || busy) return;
    onAsk(clean);
    setQuestion("");
  };
  const cited = output?.citations ?? [];
  return (
    <section className="panel analyst-panel">
      <div className="panel-heading">
        <div><div className="eyebrow"><Sparkles size={12} /> SENTINEL AI</div><h2>Analyst console</h2></div>
        <span className="ai-status"><i /> SOURCE-LINKED</span>
      </div>
      <div className="analyst-prompt">
        <span className="analyst-orb"><Bot size={18} /></span>
        <div><strong>Brief from retrieved reporting</strong><p>Summaries and answers cite only the linked articles below.</p></div>
      </div>
      <button className="brief-button" type="button" disabled={!articles.length || busy} onClick={onBrief}>
        {busy ? <LoaderCircle className="spin" size={15} /> : <Sparkles size={15} />}
        {busy ? "Analyzing source material…" : "Generate intelligence brief"}
      </button>
      {error && <div className="inline-error" role="alert">{error}</div>}
      {output && (
        <div className="brief-output">
          <div className="brief-output-label"><span>ANALYST OUTPUT</span><span>{cited.length} model-referenced source{cited.length === 1 ? "" : "s"}</span></div>
          <p className="brief-text">{output.text}</p>
          {cited.length ? <div className="citation-list">
            {cited.map(citation => <a key={citation.id} href={citation.url} target="_blank" rel="noopener noreferrer" title={citation.title} aria-label={`${citation.ref}: ${citation.title}`}><b>[{citation.ref}]</b><span>{citation.source}</span><small>{citation.title}</small><ExternalLink size={11} /></a>)}
          </div> : <div className="citation-warning">No valid source markers were returned. Treat the text as uncited and check the linked reports.</div>}
        </div>
      )}
      <div className="evidence-selection">
        <span>AVAILABLE EVIDENCE</span>
        <b>{articles.length} {articles.length === 1 ? "report" : "reports"}</b>
        <small>from the current source set</small>
      </div>
      <form className="analyst-input" onSubmit={submit}>
        <input aria-label="Ask the analyst" value={question} onChange={event => setQuestion(event.target.value)} placeholder="Ask about these reports…" disabled={busy || !articles.length} />
        <button type="submit" aria-label="Send question" disabled={busy || !question.trim() || !articles.length}><ArrowUp size={17} /></button>
      </form>
      <p className="analyst-footnote">AI synthesis can be incomplete. Verify important details in the original reporting.</p>
    </section>
  );
}
