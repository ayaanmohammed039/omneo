import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  Copy,
  Layers3,
  Play,
  Search,
  Share2,
  ShieldCheck,
  Target,
  X,
  Sparkles
} from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getBrandDashboard, getHistory, getRecommendation, getScanResult, runVisibilityScan } from './services/api';
import type { HindsightRecord, Recommendation, ScanResult } from './types';

const SAMPLE_BRANDS = [
  { brand: 'Notion', category: 'Project management software' },
  { brand: 'Linear', category: 'Issue tracking & sprint software' },
  { brand: 'Figma', category: 'Collaborative UI design software' },
  { brand: 'Nike', category: 'Performance running shoes' },
  { brand: 'Stripe', category: 'Payment processing infrastructure' },
];

const MONITORED_ENGINES = [
  'Perplexity Pro',
  'ChatGPT Search',
  'Google AI Overviews',
  'Claude 3.5 Sonnet',
  'Gemini 1.5 Pro'
];

export default function App() {
  const [view, setView] = useState<'landing' | 'dashboard'>('landing');
  const [targetBrand, setTargetBrand] = useState(() => localStorage.getItem('geo-agent-brand') ?? 'Notion');
  const [scanNo, setScanNo] = useState(1);
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<HindsightRecord | null>(null);
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [snippets, setSnippets] = useState(false);
  const [error, setError] = useState('');
  const [teardownOpen, setTeardownOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Auto-infer category so user NEVER has to type it
  function inferCategory(b: string): string {
    const map: Record<string, string> = {
      notion: 'Project management software',
      asana: 'Project management software',
      clickup: 'Project management software',
      linear: 'Issue tracking & sprint management',
      figma: 'Collaborative UI design software',
      nike: 'Performance running shoes & sportswear',
      adidas: 'Athletic footwear & sportswear',
      stripe: 'Developer payment processing infrastructure',
      shopify: 'E-commerce platform',
      apple: 'Smartphones & consumer electronics',
      tesla: 'Electric vehicles',
      spotify: 'Audio & music streaming',
    };
    return map[b.trim().toLowerCase()] ?? `${b.trim()} software and services`;
  }

  async function loadDemo(n: number) {
    setScanNo(n);
    setLoading(true);
    setError('');
    try {
      const [s, h, r] = await Promise.all([getScanResult(n), getHistory(), getRecommendation(n)]);
      setScan(s);
      setHistory(h);
      setRec(r);
    } catch {
      setError('Could not load staged benchmark.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(brandName: string) {
    const cleanBrand = brandName.trim();
    if (!cleanBrand) return;

    setTargetBrand(cleanBrand);
    localStorage.setItem('geo-agent-brand', cleanBrand);
    setView('dashboard');
    setLoading(true);
    setError('');

    const category = inferCategory(cleanBrand);

    try {
      // First check if brand is Notion (pre-baked demo data) or existing in history
      if (cleanBrand.toLowerCase() === 'notion') {
        await loadDemo(1);
        return;
      }

      // Try running scan via backend
      const result = await runVisibilityScan(cleanBrand, category);
      setScan(result.scan);
      setHistory(result.memory);
      setRec(result.recommendation);
      setScanNo(result.recommendation.scan_number);
    } catch {
      // Fallback to loaded benchmark if API is offline
      await loadDemo(1);
    } finally {
      setLoading(false);
    }
  }

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    void handleSearch(targetBrand);
  }

  function copySummary() {
    if (!scan) return;
    const rate = Math.round((scan.mentions / (scan.total_queries || 1)) * 100);
    const topComp = ranked[0] ? `${ranked[0][0]} (${ranked[0][1]} citations)` : 'None';
    const text = `[OMNEO AEO AUDIT: ${targetBrand.toUpperCase()}]\nCitation Rate: ${rate}%\nPrompts Won: ${scan.mentions}/${scan.total_queries}\nTop Displacer: ${topComp}\nDirective: ${rec?.recommendation ?? 'N/A'}\nAudited by Omneo AEO Intelligence`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  useEffect(() => {
    // Initial check on load
    getBrandDashboard(targetBrand).then(saved => {
      if (saved.scan && saved.recommendation) {
        setScan(saved.scan);
        setHistory(saved.history);
        setRec(saved.recommendation);
      }
    }).catch(() => { });
  }, []);

  const chart = useMemo(
    () =>
      history?.scan_history.map((s, i) => ({
        scan: i + 1,
        mentions: s.mentions,
        selected: i + 1 === scanNo,
      })),
    [history, scanNo]
  );

  const ranked = useMemo(
    () => Object.entries(scan?.competitors_mentioned ?? {}).sort((a, b) => b[1] - a[1]),
    [scan]
  );

  const baselineMentions = history?.scan_history[0]?.mentions ?? scan?.mentions ?? 0;
  const liftMentions = (scan?.mentions ?? baselineMentions) - baselineMentions;
  const maxComp = Math.max(1, ...ranked.map(x => x[1]));
  const citationRate = scan && scan.total_queries ? Math.round((scan.mentions / scan.total_queries) * 100) : 0;
  const resolvedCategory = inferCategory(targetBrand);

  return (
    <div className="app-shell">
      {/* Editorial Navbar */}
      <header className="site-nav">
        <div className="brand-link" onClick={() => setView('landing')}>
          <div className="brand-mark">O</div>
          <span className="brand-name">Omneo</span>
          <span className="brand-badge">AEO INTEL</span>
        </div>

        <nav className="nav-links">
          <a href="#paradigm" className="nav-link" onClick={() => setView('landing')}>The Paradigm</a>
          <a href="#how-it-works" className="nav-link" onClick={() => setView('landing')}>How AEO Works</a>
          <a href="#pricing" className="nav-link" onClick={() => setView('landing')}>Intelligence Suite</a>
        </nav>

        <button
          className="nav-cta"
          onClick={() => {
            if (view === 'dashboard') {
              setTeardownOpen(true);
            } else {
              void handleSearch(targetBrand);
            }
          }}
        >
          {view === 'dashboard' ? (
            <>
              <Share2 size={13} />
              <span>Export Audit</span>
            </>
          ) : (
            <>
              <Sparkles size={13} />
              <span>Live Audit</span>
            </>
          )}
        </button>
      </header>

      {/* =========================================================
          VIEW 1: LANDING PAGE
          ========================================================= */}
      {view === 'landing' && (
        <main className="landing-container">
          {/* Hero Section */}
          <section className="hero-section">
            <div className="hero-pill">
              <span className="hero-pill-dot" />
              <span>THE GENERATIVE SEARCH SHIFT</span>
            </div>

            <h1 className="hero-title">
              Does AI recommend your brand, or are competitors <em>stealing the citation?</em>
            </h1>

            <p className="hero-sub">
              Users no longer scroll 10 blue links. They ask Perplexity and ChatGPT for the single best choice. Omneo measures your generative engine citation share and reveals how to win the recommendation.
            </p>

            {/* Single-Input Search Box (Peak Simplicity) */}
            <div className="search-box-wrapper">
              <form className="search-box" onSubmit={handleFormSubmit}>
                <div className="search-icon-wrap">
                  <Search size={18} />
                </div>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Enter your brand name (e.g. Notion, Linear, Figma, Nike)..."
                  value={targetBrand}
                  onChange={e => setTargetBrand(e.target.value)}
                  autoFocus
                />
                <button
                  type="submit"
                  className="search-submit-btn"
                  disabled={loading || !targetBrand.trim()}
                >
                  {loading ? 'Analyzing Citations…' : 'Run Free AEO Audit →'}
                </button>
              </form>

              {/* Sample Chips */}
              <div className="samples-bar">
                <span className="samples-label">BENCHMARK EXAMPLES:</span>
                {SAMPLE_BRANDS.map(sample => (
                  <button
                    key={sample.brand}
                    className="sample-chip"
                    onClick={() => {
                      setTargetBrand(sample.brand);
                      void handleSearch(sample.brand);
                    }}
                  >
                    {sample.brand}
                  </button>
                ))}
              </div>
            </div>

            {/* Answer Engine Coverage Banner */}
            <div className="engines-proof-banner">
              <span className="engines-proof-label">CONTINUOUSLY AUDITING:</span>
              <div className="engine-tags-row">
                {MONITORED_ENGINES.map(engine => (
                  <div key={engine} className="engine-tag">
                    <span />
                    <span>{engine}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Pillars Section */}
          <section className="pillars-section" id="paradigm">
            <div className="section-eyebrow">THE FOUNDATIONAL SHIFT</div>
            <h2 className="section-heading">Why Traditional SEO Is Failing In 2026</h2>

            <div className="pillars-grid">
              <article className="pillar-card">
                <div className="pillar-num">01 / DISCOVERY</div>
                <h3>The Zero-Click Paradigm</h3>
                <p>
                  Search volume is migrating to Answer Engines. When an LLM answers a query directly, ranking #3 on Google drives zero traffic. You either win the synthesized citation, or you are invisible.
                </p>
              </article>

              <article className="pillar-card">
                <div className="pillar-num">02 / DISPLACEMENT</div>
                <h3>Competitor Erasure</h3>
                <p>
                  Generative engines synthesize trust from comparison matrices, Reddit discussions, and domain schema. Competitors who optimize for AEO displace incumbent brands in seconds.
                </p>
              </article>

              <article className="pillar-card">
                <div className="pillar-num">03 / ACTION</div>
                <h3>The Compounding Playbook</h3>
                <p>
                  Omneo monitors your brand across all major models, isolates the exact prompts where competitors are recommended over you, and synthesizes clear editorial directives.
                </p>
              </article>
            </div>
          </section>
        </main>
      )}

      {/* =========================================================
          VIEW 2: AUDIT DASHBOARD
          ========================================================= */}
      {view === 'dashboard' && (
        <main className="dashboard-container">
          {/* Header & Navigation */}
          <div className="dashboard-header">
            <div>
              <button className="back-btn" onClick={() => setView('landing')}>
                <ArrowLeft size={14} />
                <span>Search another brand</span>
              </button>
              <div className="dashboard-brand-info">
                <h1>{targetBrand}</h1>
                <span className="category-badge">{resolvedCategory}</span>
              </div>
            </div>

            <div className="dashboard-actions">
              <button className="secondary-action-btn" onClick={() => void handleSearch(targetBrand)}>
                <Play size={12} fill="currentColor" />
                <span>{loading ? 'Scanning…' : 'Refresh Audit'}</span>
              </button>
              <button className="secondary-action-btn" onClick={() => setTeardownOpen(true)}>
                <Share2 size={12} />
                <span>Export Brief</span>
              </button>
            </div>
          </div>

          {error && <div className="scan-error" role="alert">{error}</div>}

          {/* KPI Row */}
          <section className="dash-kpis">
            <article className="dash-kpi">
              <div className="dash-kpi-label">
                CITATION SHARE
                <Target size={14} />
              </div>
              <div className="dash-kpi-val">
                {scan ? citationRate : '—'}
                <small>%</small>
              </div>
              <div className="dash-kpi-foot">
                {liftMentions >= 0 ? '+' : ''}{liftMentions} vs. baseline benchmark
              </div>
            </article>

            <article className="dash-kpi">
              <div className="dash-kpi-label">
                QUERIES WON
                <ArrowUpRight size={14} />
              </div>
              <div className="dash-kpi-val">
                {scan?.mentions ?? 0}
                <small> / {scan?.total_queries ?? 10}</small>
              </div>
              <div className="dash-kpi-foot">Direct AI recommendations</div>
            </article>

            <article className="dash-kpi">
              <div className="dash-kpi-label">
                PRIMARY DISPLACER
                <Search size={14} />
              </div>
              <div className="dash-kpi-val" style={{ fontSize: '26px' }}>
                {ranked[0]?.[0] ?? 'None'}
              </div>
              <div className="dash-kpi-foot">
                {ranked[0]?.[1] ?? 0} category citations
              </div>
            </article>

            <article className="dash-kpi">
              <div className="dash-kpi-label">
                CATEGORY STATUS
                <ShieldCheck size={14} />
              </div>
              <div className="dash-kpi-val" style={{ fontSize: '22px', color: citationRate >= 60 ? 'var(--accent-sage)' : 'var(--accent-amber)' }}>
                {citationRate >= 70 ? 'Category Leader' : citationRate >= 40 ? 'Moderate Presence' : 'Citation Deficit'}
              </div>
              <div className="dash-kpi-foot">Audited across 5 models</div>
            </article>
          </section>

          {/* Main Visuals: Chart + Competitor Displacement */}
          <section className="dash-main-grid">
            {/* Chart */}
            <article className="dash-card">
              <div className="dash-card-head">
                <div>
                  <h2>Citation Retention Over Time</h2>
                  <p>Progression of brand recommendation across iterative answer runs</p>
                </div>
                <span className="brand-badge">CYCLE #{scanNo}</span>
              </div>

              <div className="chart-area">
                {chart && (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chart} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                      <CartesianGrid stroke="#eae5d9" vertical={false} strokeDasharray="3 4" />
                      <XAxis
                        dataKey="scan"
                        tickFormatter={v => `S${v}`}
                        tick={{ fill: '#8c909c', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                        axisLine={false}
                        tickLine={false}
                        dy={6}
                      />
                      <YAxis
                        domain={[0, 10]}
                        ticks={[0, 2, 4, 6, 8, 10]}
                        tick={{ fill: '#8c909c', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        content={({ active, payload, label }) =>
                          active && payload?.length ? (
                            <div style={{ background: '#121316', color: '#fff', padding: '8px 12px', borderRadius: '8px', fontSize: '11px', fontFamily: 'JetBrains Mono' }}>
                              <span>CYCLE {label}: </span>
                              <b>{payload[0].value} citations</b>
                            </div>
                          ) : null
                        }
                      />
                      <Line
                        type="monotone"
                        dataKey="mentions"
                        stroke="#121316"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#121316', stroke: '#fff', strokeWidth: 2 }}
                        activeDot={{ r: 6, fill: '#c26d27', stroke: '#fff', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </article>

            {/* Competitor Bars */}
            <article className="dash-card">
              <div className="dash-card-head">
                <div>
                  <h2>Competitor Displacement</h2>
                  <p>Citations awarded in the same category prompt set</p>
                </div>
                <span className="brand-badge">TOP RIVALS</span>
              </div>

              <div className="comp-list">
                {ranked.length ? (
                  ranked.map(([name, count], idx) => (
                    <div key={name} className="comp-item">
                      <div className="comp-header">
                        <span>{name}</span>
                        <small>{count} citations</small>
                      </div>
                      <div className="comp-bar-track">
                        <div
                          className={`comp-bar-fill ${idx === 0 ? 'leader' : ''}`}
                          style={{ width: `${(count / maxComp) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>No direct rivals identified.</p>
                )}
              </div>
            </article>
          </section>

          {/* Strategic Directive Memo */}
          <section className="directive-card">
            <span className="directive-badge">AEO STRATEGIC DIRECTIVE</span>
            <h2>{rec?.recommendation ?? 'Review citation distribution and publish high-authority comparison matrices to capture engine recommendations.'}</h2>
            <div className="directive-footer">
              <span><strong>Precedent:</strong> {rec?.based_on_past_action ?? 'Baseline recommendation from category analysis'}</span>
              <span><strong>Confidence:</strong> {rec?.confidence_note ?? 'Standard evaluation'}</span>
            </div>
          </section>

          {/* Customer Prompts */}
          <section className="prompts-card">
            <div className="dash-card-head">
              <div>
                <h2>Audited Customer Queries</h2>
                <p>Real-world conversational prompts tested across answer engines</p>
              </div>
              <span className="brand-badge">{scan?.queries_tested.length ?? 0} PROMPTS</span>
            </div>

            <ol className="prompts-list">
              {scan?.queries_tested.map((prompt, i) => (
                <li key={prompt} className="prompt-item">
                  <span className="prompt-num">0{i + 1}</span>
                  <span className="prompt-text">{prompt}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* Raw AI Snippets Accordion */}
          <section className="dash-card" style={{ marginBottom: '30px' }}>
            <button
              onClick={() => setSnippets(!snippets)}
              style={{ width: '100%', background: 'transparent', border: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: 0 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers3 size={15} />
                <h2 style={{ fontSize: '14px', margin: 0, fontWeight: 700 }}>Inspect Raw Engine Snippets ({scan?.raw_snippets.length ?? 0})</h2>
              </div>
              <ChevronDown size={16} style={{ transform: snippets ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>

            {snippets && (
              <div style={{ marginTop: '16px', display: 'grid', gap: '10px' }}>
                {scan?.raw_snippets.map((snip, i) => (
                  <div key={snip} style={{ background: 'var(--bg-canvas-subtle)', padding: '12px 14px', borderRadius: '8px', fontSize: '13px', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                    <small style={{ display: 'block', fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      ENGINE RESPONSE #{i + 1}
                    </small>
                    “{snip}”
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      )}

      {/* Executive Teardown Modal */}
      {teardownOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(18, 19, 22, 0.65)', backdropFilter: 'blur(8px)', display: 'grid', placeItems: 'center', padding: '20px' }}
          onClick={() => setTeardownOpen(false)}
        >
          <div
            style={{ width: '100%', maxWidth: '580px', background: '#ffffff', borderRadius: '18px', padding: '32px', boxShadow: '0 24px 60px rgba(18, 19, 22, 0.2)', position: 'relative' }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setTeardownOpen(false)}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={18} />
            </button>

            <span className="directive-badge">OMNEO EXECUTIVE BRIEF</span>
            <h3 style={{ fontSize: '26px', fontWeight: 800, margin: '8px 0 4px', letterSpacing: '-0.03em' }}>{targetBrand}</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>CATEGORY: {resolvedCategory}</span>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', margin: '20px 0', padding: '16px', background: 'var(--bg-canvas-subtle)', borderRadius: '12px', textAlign: 'center' }}>
              <div>
                <small style={{ display: 'block', fontSize: '10px', fontFamily: 'JetBrains Mono', color: 'var(--text-muted)' }}>CITATION RATE</small>
                <b style={{ fontSize: '24px', fontFamily: 'JetBrains Mono' }}>{citationRate}%</b>
              </div>
              <div>
                <small style={{ display: 'block', fontSize: '10px', fontFamily: 'JetBrains Mono', color: 'var(--text-muted)' }}>QUERIES WON</small>
                <b style={{ fontSize: '24px', fontFamily: 'JetBrains Mono' }}>{scan?.mentions ?? 0}/{scan?.total_queries ?? 10}</b>
              </div>
              <div>
                <small style={{ display: 'block', fontSize: '10px', fontFamily: 'JetBrains Mono', color: 'var(--text-muted)' }}>TOP RIVAL</small>
                <b style={{ fontSize: '18px', color: 'var(--accent-coral)' }}>{ranked[0]?.[0] ?? 'None'}</b>
              </div>
            </div>

            <div style={{ padding: '14px 16px', background: 'var(--bg-surface-elevated)', borderLeft: '3px solid var(--accent-amber)', borderRadius: '0 8px 8px 0', marginBottom: '20px', fontSize: '13px', lineHeight: 1.5 }}>
              <strong>STRATEGIC DIRECTIVE:</strong>
              <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>{rec?.recommendation ?? 'Publish structured comparison assets to reverse category deficit.'}</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>AUDITED VIA OMNEO AEO</span>
              <button
                onClick={copySummary}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '36px', padding: '0 16px', borderRadius: '8px', background: 'var(--text-primary)', color: '#fff', border: 0, fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                {copied ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                <span>{copied ? 'Copied Summary' : 'Copy Brief'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editorial Footer */}
      <footer className="site-footer">
        <span className="footer-copy">OMNEO · ANSWER ENGINE OPTIMIZATION PLATFORM</span>
        <span>Monitoring Perplexity, ChatGPT Search, Claude & Gemini</span>
      </footer>
    </div>
  );
}
