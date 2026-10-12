import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Activity,
  ArrowUpRight,
  BrainCircuit,
  ChevronDown,
  Clock3,
  Database,
  History,
  Layers3,
  Menu,
  Play,
  Search,
  Target,
  Zap,
  Share2,
  Copy,
  CheckCircle2,
  X,
  TrendingUp,
  ShieldCheck
} from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getApiHealth, getBrandDashboard, getHistory, getRecommendation, getScanResult, runVisibilityScan, saveAction } from './services/api';
import type { HindsightRecord, Recommendation, ScanResult } from './types';

const BENCHMARK_PRESETS = [
  { brand: 'Notion', category: 'Project management software' },
  { brand: 'Linear', category: 'Issue tracking & sprint software' },
  { brand: 'Figma', category: 'Collaborative UI design software' },
  { brand: 'Nike', category: 'Performance running shoes' },
  { brand: 'Stripe', category: 'Developer payment processing infrastructure' },
];

const MONITORED_ENGINES = [
  { name: 'GPT-4o Search', active: true },
  { name: 'Perplexity Pro', active: true },
  { name: 'Gemini 1.5 Pro', active: true },
  { name: 'Claude 3.5', active: true },
  { name: 'Google SGE', active: true },
];

export default function App() {
  const [scanNo, setScanNo] = useState(1);
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<HindsightRecord | null>(null);
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [menu, setMenu] = useState(false);
  const [snippets, setSnippets] = useState(false);
  const [brand, setBrand] = useState(() => localStorage.getItem('geo-agent-brand') ?? 'Notion');
  const [category, setCategory] = useState(() => localStorage.getItem('geo-agent-category') ?? 'Project management software');
  const [mode, setMode] = useState<'demo' | 'live'>('demo');
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [apiMode, setApiMode] = useState<'mock' | 'live'>('mock');
  const [apiReady, setApiReady] = useState(true);
  const [error, setError] = useState('');
  const [actionText, setActionText] = useState('');
  const [outcomeText, setOutcomeText] = useState('');
  const [visibilityDelta, setVisibilityDelta] = useState('0');
  const [savingAction, setSavingAction] = useState(false);

  // Teardown modal for viral content creation & client screen recording
  const [teardownOpen, setTeardownOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function load(n: number) {
    setScanNo(n);
    setMode('demo');
    setError('');
    setLoading(true);
    try {
      const [s, h, r] = await Promise.all([getScanResult(n), getHistory(), getRecommendation(n)]);
      setScan(s);
      setHistory(h);
      setRec(r);
    } finally {
      setLoading(false);
    }
  }

  function clearDisplayedBrandData() {
    setScan(null);
    setHistory(null);
    setRec(null);
    setScanNo(1);
    setMode('demo');
  }

  async function runScan() {
    setError('');
    clearDisplayedBrandData();
    setMode('live');
    setLoading(true);
    try {
      const result = await runVisibilityScan(brand, category);
      setScan(result.scan);
      setHistory(result.memory);
      setRec(result.recommendation);
      setScanNo(result.recommendation.scan_number);
      setApiStatus('online');
      getApiHealth()
        .then(health => {
          setApiMode(health.mode);
          setApiReady(health.ready);
        })
        .catch(() => { });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not run scan. Start the Python API and try again.');
      getApiHealth()
        .then(health => {
          setApiStatus('online');
          setApiMode(health.mode);
          setApiReady(health.ready);
        })
        .catch(() => setApiStatus('offline'));
    } finally {
      setLoading(false);
    }
  }

  async function recordAction(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSavingAction(true);
    try {
      const updated = await saveAction(brand, actionText, outcomeText, Number(visibilityDelta));
      setHistory(updated);
      setActionText('');
      setOutcomeText('');
      setVisibilityDelta('0');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the action.');
    } finally {
      setSavingAction(false);
    }
  }

  function applyPreset(item: { brand: string; category: string }) {
    setBrand(item.brand);
    setCategory(item.category);
    clearDisplayedBrandData();
    if (item.brand === 'Notion') {
      void load(1);
    }
  }

  function copyTeardownSummary() {
    if (!scan) return;
    const rate = Math.round((scan.mentions / (scan.total_queries || 1)) * 100);
    const topComp = ranked[0] ? `${ranked[0][0]} (${ranked[0][1]} mentions)` : 'None';
    const text = `[OMNEO AEO AUDIT: ${brand.toUpperCase()}]\nCategory: ${category}\nCitation Visibility: ${rate}%\nMentions: ${scan.mentions}/${scan.total_queries}\nTop Displacer: ${topComp}\nRecommendation: ${rec?.recommendation ?? 'N/A'}\nAudit Engine: Omneo AEO Intelligence Platform`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  useEffect(() => {
    localStorage.setItem('geo-agent-brand', brand);
    localStorage.setItem('geo-agent-category', category);
  }, [brand, category]);

  useEffect(() => {
    let active = true;
    getApiHealth()
      .then(health => {
        if (active) {
          setApiStatus('online');
          setApiMode(health.mode);
          setApiReady(health.ready);
        }
      })
      .catch(() => {
        if (active) setApiStatus('offline');
      });

    getBrandDashboard(brand)
      .then(saved => {
        if (!active) return;
        if (saved.scan && saved.recommendation) {
          setScan(saved.scan);
          setHistory(saved.history);
          setRec(saved.recommendation);
          setScanNo(saved.history.scan_history.length);
          setMode('live');
        } else {
          void load(1);
        }
      })
      .catch(() => {
        if (active) void load(1);
      });

    return () => {
      active = false;
    };
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

  const shownActions =
    mode === 'live'
      ? history?.actions_log ?? []
      : scanNo < 5
        ? []
        : scanNo < 10
          ? history?.actions_log.slice(0, Math.min(2, Math.floor((scanNo - 1) / 2))) ?? []
          : history?.actions_log ?? [];

  const baselineMentions = history?.scan_history[0]?.mentions ?? scan?.mentions ?? 0;
  const liftMentions = (scan?.mentions ?? baselineMentions) - baselineMentions;
  const maxComp = Math.max(1, ...ranked.map(x => x[1]));
  const citationRate = scan && scan.total_queries ? Math.round((scan.mentions / scan.total_queries) * 100) : 0;

  return (
    <div className="shell">
      {/* Sidebar */}
      <aside className={`sidebar ${menu ? 'open' : ''}`}>
        <div className="brandmark">
          <div className="brand-icon">
            <BrainCircuit size={20} />
          </div>
          <div>
            <b>Omneo</b>
            <small>AEO / GEO VISIBILITY LAB</small>
          </div>
          <button className="mobile-close" onClick={() => setMenu(false)} aria-label="Close navigation">
            ×
          </button>
        </div>

        <div className="nav-label">COMMAND WORKSPACE</div>
        <nav>
          <a className="nav-item active" href="#overview">
            <Activity size={15} />
            Executive Overview
            <span className="nav-active-dot" />
          </a>
          <a className="nav-item" href="#history">
            <TrendingUp size={15} />
            Citation Trajectory
          </a>
          <a className="nav-item" href="#memory">
            <Database size={15} />
            Hindsight Memory Vault
          </a>
        </nav>

        <div className="loop-card">
          <div className="loop-title">
            <Zap size={13} /> COMPOUNDING INTELLIGENCE
          </div>
          <p>Each scan indexes brand deltas into the Hindsight memory layer for continuous recommendation optimization.</p>
          <div className="loop-route">
            <span>Audit</span>
            <i>→</i>
            <span>Retain</span>
            <i>→</i>
            <span>Displace</span>
          </div>
          <div className="loop-connected">
            <i /> Memory layer active
          </div>
        </div>

        <div className="sidebar-bottom">
          <div className="workspace-avatar">OM</div>
          <div>
            <b>Omneo Core</b>
            <small>v1.4 Institutional</small>
          </div>
          <ShieldCheck size={14} style={{ marginLeft: 'auto', color: 'var(--accent-lime)' }} />
        </div>
      </aside>

      {/* Main Container */}
      <main id="overview" className="main">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-left">
            <button className="menu-toggle" onClick={() => setMenu(!menu)} aria-label="Toggle navigation">
              <Menu size={18} />
            </button>
            <span className={`status-dot ${apiStatus === 'offline' || !apiReady ? 'offline' : ''}`} />
            <span className="crumb-muted">
              {apiStatus === 'online' ? 'Engine live' : apiStatus === 'offline' ? 'API offline' : 'Connecting'}
            </span>
            <span className="slash">/</span>
            <span className="topbar-badge-omneo">Omneo Intelligence System</span>
          </div>

          <div className="header-right">
            <div className="engine-chips">
              {MONITORED_ENGINES.map(eng => (
                <div className={`engine-chip ${eng.active ? 'active' : ''}`} key={eng.name}>
                  <i />
                  <span>{eng.name}</span>
                </div>
              ))}
            </div>

            <div className={`demo-badge ${apiStatus === 'offline' || !apiReady ? 'api-offline' : ''}`}>
              {apiStatus === 'checking'
                ? 'INITIALIZING'
                : apiStatus === 'offline'
                  ? 'BACKEND OFFLINE'
                  : apiMode === 'live'
                    ? apiReady
                      ? 'LIVE SEARCH ACTIVE'
                      : 'PROVIDER KEYS NEEDED'
                    : 'MOCK SEARCH MODE'}
            </div>

            <button
              className="teardown-trigger-btn"
              onClick={() => setTeardownOpen(true)}
              title="Generate Executive Audit Card for sharing or video breakdown"
            >
              <Share2 size={13} />
              <span>Export Audit</span>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="content">
          {/* Hero Section */}
          <section className="hero">
            <div className="eyebrow">
              AEO & GENERATIVE SEARCH INTELLIGENCE <span />
            </div>
            <h1>Does AI Recommend Your Brand?</h1>
            <div className="hero-bottom">
              <p>
                Analyze real-time answer citations across Perplexity, ChatGPT, and Claude. Identify where competitors are displacing your market share and run memory-guided action steps.
              </p>
              <div className={`workspace-state ${apiStatus === 'offline' || !apiReady ? 'offline' : ''}`}>
                <i />
                <span>
                  {apiStatus === 'offline'
                    ? 'ENGINE OFFLINE'
                    : apiStatus === 'checking'
                      ? 'CONNECTING'
                      : !apiReady
                        ? 'KEYS REQUIRED'
                        : 'AEO SYSTEM ONLINE'}
                </span>
                <span />
                <Clock3 size={13} />
                <span>{loading ? 'Executing scan…' : mode === 'live' ? 'Brand memory indexed' : 'Benchmark dataset'}</span>
              </div>
            </div>

            {/* Benchmark Preset Bar */}
            <div className="presets-bar">
              <span className="presets-label">QUICK BENCHMARKS:</span>
              {BENCHMARK_PRESETS.map(item => (
                <button
                  key={item.brand}
                  className={`preset-chip ${brand.toLowerCase() === item.brand.toLowerCase() ? 'active' : ''}`}
                  onClick={() => applyPreset(item)}
                >
                  ⚡ {item.brand}
                </button>
              ))}
            </div>
          </section>

          {/* Control Form Card */}
          <section className="control-card">
            <div className="brand-fields">
              <label>
                TARGET BRAND
                <input
                  aria-label="Brand"
                  value={brand}
                  onChange={e => {
                    setBrand(e.target.value);
                    clearDisplayedBrandData();
                    setError('');
                  }}
                  placeholder="e.g. Notion, Linear, Stripe"
                />
              </label>
              <label>
                MARKET CATEGORY
                <input
                  aria-label="Category"
                  value={category}
                  onChange={e => {
                    setCategory(e.target.value);
                    clearDisplayedBrandData();
                    setError('');
                  }}
                  placeholder="e.g. Project management software"
                />
              </label>
              <button
                className="scan-button"
                onClick={() => void runScan()}
                disabled={loading || !brand.trim() || !category.trim()}
              >
                <Play size={13} fill="currentColor" />
                {loading ? 'Executing Audit…' : 'Run Visibility Scan'}
              </button>
            </div>

            {loading && (
              <div className="scan-progress" role="status">
                ⚡ Real-time audit in progress: synthesizing queries, gathering multi-engine search evidence, analyzing displacement metrics, and indexing memory precedents...
              </div>
            )}

            {apiStatus === 'offline' && (
              <div className="scan-error" role="status">
                Backend API offline. Launch the engine in your terminal with <code>python -m integration.api</code>.
              </div>
            )}

            {apiMode === 'live' && !apiReady && (
              <div className="scan-error" role="status">
                Live mode enabled, but API keys are missing. Configure Groq, Tavily, and Serper in <code>.env</code>.
              </div>
            )}

            {error && <div className="scan-error" role="alert">{error}</div>}

            {mode === 'demo' && (
              <div className="selector-row">
                <div>
                  <span className="selector-kicker">COMPOUNDING MEMORY TIMELINE</span>
                  <p>Experience how the recommendation agent sharpens its strategy from baseline to mature accumulated evidence.</p>
                </div>
                <div className="selector-control">
                  {[1, 5, 10].map(n => (
                    <button
                      className={`scan-choice ${scanNo === n ? 'chosen' : ''}`}
                      key={n}
                      onClick={() => void load(n)}
                      aria-pressed={scanNo === n}
                    >
                      <span>STAGE</span>
                      <b>{n}</b>
                    </button>
                  ))}
                  <small>of 10 benchmark cycles</small>
                </div>
              </div>
            )}
          </section>

          {/* KPI Dashboard */}
          <section className="kpis" aria-label="Visibility metrics">
            <article className="kpi kpi-mentions">
              <div className="kpi-label">
                CITATION SHARE
                <Target size={15} />
              </div>
              <div className="kpi-value">
                {scan?.mentions ?? '—'}
                <small> / {scan?.total_queries ?? '—'}</small>
              </div>
              <div className="kpi-foot">
                Queries Won · Cycle {scanNo}
              </div>
            </article>

            <article className="kpi kpi-visibility">
              <div className="kpi-label">
                AEO CITATION INDEX
                <ArrowUpRight size={15} />
              </div>
              <div className="kpi-value">
                {scan ? citationRate : '—'}
                <small>%</small>
              </div>
              <div className="kpi-foot" style={{ color: liftMentions >= 0 ? 'var(--accent-emerald)' : 'var(--accent-coral)' }}>
                {liftMentions >= 0 ? '+' : ''}
                {liftMentions} citations vs. baseline
              </div>
            </article>

            <article className="kpi kpi-competitor">
              <div className="kpi-label">
                TOP CATEGORY DISPLACER
                <Search size={15} />
              </div>
              <div className="kpi-value word-value">{ranked[0]?.[0] ?? '—'}</div>
              <div className="kpi-foot">{ranked[0]?.[1] ?? 0} AI answer recommendations</div>
            </article>

            <article className="kpi kpi-current">
              <div className="kpi-label">
                MEMORY DEPTH
                <Database size={15} />
              </div>
              <div className="kpi-value">#{scanNo}</div>
              <div className="kpi-foot">
                {mode === 'demo'
                  ? scanNo === 1
                    ? 'Initial Baseline'
                    : scanNo === 5
                      ? 'Pattern Precedents Indexed'
                      : 'Compounded Precision'
                  : `${history?.scan_history.length ?? scanNo} audit cycles stored`}
              </div>
            </article>
          </section>

          {/* Primary Visualization Grid */}
          <section className="primary-grid" id="history">
            {/* Trend Chart */}
            <article className="panel chart-panel">
              <div className="panel-title">
                <div>
                  <h2>
                    <Activity size={15} />
                    Citation Lift Over Time
                  </h2>
                  <p>{mode === 'live' ? 'Historical citation retention for this brand' : 'Progression across staged AI answer iterations'}</p>
                </div>
                <div className="lift-pill">
                  <span>NET LIFT</span>
                  <b>{liftMentions >= 0 ? '+' : ''}{liftMentions} citations</b>
                </div>
              </div>

              <div className="chart-wrap">
                {chart && (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chart} margin={{ top: 14, right: 12, bottom: 0, left: -19 }}>
                      <CartesianGrid stroke="rgba(255, 255, 255, 0.05)" vertical={false} strokeDasharray="3 4" />
                      <XAxis
                        dataKey="scan"
                        tickFormatter={v => `S${v}`}
                        tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                        axisLine={false}
                        tickLine={false}
                        dy={9}
                      />
                      <YAxis
                        domain={[0, 10]}
                        ticks={[0, 2, 4, 6, 8, 10]}
                        tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        content={({ active, payload, label }) =>
                          active && payload?.length ? (
                            <div className="chart-tooltip">
                              <small>CYCLE {label}</small>
                              <b>{payload[0].value} citations recorded</b>
                            </div>
                          ) : null
                        }
                      />
                      <Line
                        type="monotone"
                        dataKey="mentions"
                        stroke="#ccff00"
                        strokeWidth={2.8}
                        dot={({ cx, cy, payload }) => (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={payload.selected ? 6 : 3.5}
                            fill={payload.selected ? '#ccff00' : '#07080b'}
                            stroke={payload.selected ? '#ffffff' : '#ccff00'}
                            strokeWidth={payload.selected ? 2.5 : 2}
                          />
                        )}
                        activeDot={{ r: 6, fill: '#ccff00', stroke: '#ffffff', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="chart-footer">
                <span>Cycle 1 · Baseline</span>
                <span>
                  <i /> Inspected: Cycle {scanNo}
                </span>
                <span>Cycle {history?.scan_history.length ?? 10} · Latest</span>
              </div>
            </article>

            {/* Competitor Displacement Panel */}
            <article className="panel competitor-panel">
              <div className="panel-title">
                <div>
                  <h2>
                    <Activity size={15} />
                    Competitive Displacement
                  </h2>
                  <p>Share of citations across equivalent answer queries</p>
                </div>
                <span className="count-pill">/{scan?.total_queries ?? 10} queries</span>
              </div>

              <div className="competitor-list">
                {ranked.length ? (
                  ranked.map(([name, value], i) => (
                    <div className="competitor-row" key={name}>
                      <div className="competitor-label">
                        <span>{name}</span>
                        <small>{value} citations</small>
                      </div>
                      <div className="bar-track">
                        <span
                          className={i === 0 ? 'bar-leader' : ''}
                          style={{ width: `${(value / maxComp) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-competitors">No category competitors detected in this scan set.</div>
                )}
              </div>
            </article>
          </section>

          {/* Evidence Grid: Queries + Memory Ledger */}
          <section className="evidence-grid">
            {/* Customer Prompts */}
            <article className="panel query-card">
              <div className="panel-title">
                <div>
                  <h2>
                    <Search size={15} />
                    Audited Customer Prompts
                  </h2>
                  <p>High-intent query matrix tested across AI models</p>
                </div>
                <span className="count-pill">{scan?.queries_tested.length ?? 0} Prompts</span>
              </div>
              <ol className="query-list">
                {scan?.queries_tested.map((q, i) => (
                  <li key={q}>
                    <span>{String(i + 1).padStart(2, '0')}</span>
                    <b>{q}</b>
                  </li>
                ))}
              </ol>
            </article>

            {/* Hindsight Memory Ledger */}
            <article className="panel memory-card" id="memory">
              <div className="panel-title">
                <div>
                  <h2>
                    <History size={15} />
                    Hindsight Memory Ledger
                  </h2>
                  <p>Historical actions & observed citation delta feedback</p>
                </div>
                <span className="count-pill">{shownActions.length} Actions</span>
              </div>

              {shownActions.length ? (
                <div className="timeline">
                  {shownActions.map(a => (
                    <article className="timeline-item" key={a.date}>
                      <div className="timeline-marker" />
                      <div className="action-card">
                        <div className="action-head">
                          <b>{a.action}</b>
                          <time>{a.date}</time>
                        </div>
                        <p>{a.outcome_summary}</p>
                        <span className="delta">
                          {a.visibility_delta > 0 ? '+' : ''}
                          {a.visibility_delta} {Math.abs(a.visibility_delta) === 1 ? 'citation' : 'citations'}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-memory">
                  <b>No precedent actions logged for {brand} yet</b>
                  <p>Log your digital actions and citation outcomes below to train the recommendation engine.</p>
                </div>
              )}

              {mode === 'live' && (
                <form className="action-form" onSubmit={recordAction}>
                  <label>
                    Action Implemented
                    <input
                      value={actionText}
                      onChange={e => setActionText(e.target.value)}
                      placeholder="e.g. Published high-authority LLM comparison matrix"
                      required
                    />
                  </label>
                  <label>
                    Observed Search Impact
                    <input
                      value={outcomeText}
                      onChange={e => setOutcomeText(e.target.value)}
                      placeholder="e.g. Perplexity cited section 4 in top 3 answers"
                      required
                    />
                  </label>
                  <div className="action-form-bottom">
                    <label>
                      Citation Delta
                      <input
                        type="number"
                        step="1"
                        value={visibilityDelta}
                        onChange={e => setVisibilityDelta(e.target.value)}
                        required
                      />
                    </label>
                    <button type="submit" disabled={savingAction || !actionText.trim() || !outcomeText.trim()}>
                      {savingAction ? 'Indexing…' : 'Record to Hindsight'}
                    </button>
                  </div>
                </form>
              )}
            </article>
          </section>

          {/* Executive Recommendation Memo */}
          <section className="recommendation">
            <div className="rec-top">
              <span className="rec-spark">✣</span>
              <span>STRATEGIC ACTION DIRECTIVE</span>
              <small>Synthesis for Cycle #{scanNo}</small>
            </div>
            <h2>{rec?.recommendation ?? 'Generating strategic recommendation…'}</h2>
            <div className="rec-bottom">
              <div>
                <span>PRECEDENT CITATION EVIDENCE</span>
                <p>{rec?.based_on_past_action ?? 'Baseline initial directive — awaiting historical action records'}</p>
              </div>
              <div className="confidence">
                <span>CONFIDENCE RATING</span>
                <p>{rec?.confidence_note ?? 'Institutional standard'}</p>
              </div>
            </div>
          </section>

          {/* Raw AI Response Drawer */}
          <section className="snippets panel">
            <button className="snippets-toggle" onClick={() => setSnippets(!snippets)} aria-expanded={snippets}>
              <div>
                <h2>
                  <Layers3 size={15} />
                  Raw Generative Search Snippets <span>{scan?.raw_snippets.length ?? 0}</span>
                </h2>
              </div>
              <ChevronDown size={15} className={snippets ? 'rotated' : ''} />
            </button>
            {snippets && (
              <div className="snippet-body">
                {scan?.raw_snippets.map((s, i) => (
                  <article key={s}>
                    <span>ENGINE CITATION 0{i + 1}</span>
                    <p>“{s}”</p>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* Footer */}
          <footer className="footer">
            <span>OMNEO AEO INTELLIGENCE PLATFORM · {mode === 'live' ? 'CONNECTED MULTI-ENGINE PIPELINE' : 'BENCHMARK MEMORY SUITE'}</span>
            <span>
              {mode === 'live'
                ? loading
                  ? `${apiMode === 'mock' ? 'Simulated multi-engine audit' : 'Live provider search'} · in progress`
                  : `${apiMode === 'mock' ? 'Simulated multi-engine audit' : 'Live provider search'} · indexed in Hindsight`
                : 'Verified benchmark data ready for presentation'}
            </span>
          </footer>
        </div>
      </main>

      {/* Executive Teardown Modal (For Screen Recordings, TikTok, Reels & LinkedIn) */}
      {teardownOpen && (
        <div className="teardown-modal-overlay" onClick={() => setTeardownOpen(false)}>
          <div className="teardown-card" onClick={e => e.stopPropagation()}>
            <button className="teardown-modal-close" onClick={() => setTeardownOpen(false)} aria-label="Close modal">
              <X size={16} />
            </button>

            <span className="teardown-badge">
              <ShieldCheck size={12} /> OMNEO VERIFIED AUDIT
            </span>

            <h3>{brand} vs. The Category</h3>
            <span className="category-tag">MARKET: {category}</span>

            <div className="teardown-metrics-row">
              <div className="teardown-metric">
                <small>CITATION SHARE</small>
                <b>{citationRate}%</b>
              </div>
              <div className="teardown-metric">
                <small>QUERIES WON</small>
                <b>{scan?.mentions ?? 0}/{scan?.total_queries ?? 10}</b>
              </div>
              <div className="teardown-metric">
                <small>TOP DISPLACER</small>
                <b style={{ color: 'var(--accent-coral)', fontSize: '18px' }}>
                  {ranked[0]?.[0] ?? 'None'}
                </b>
              </div>
            </div>

            <div className="teardown-verdict">
              <span>EXECUTIVE VERDICT:</span>
              <p>{rec?.recommendation ?? 'Awaiting scan evaluation...'}</p>
            </div>

            <div className="teardown-footer">
              <span>AUDITED VIA OMNEO AEO ENGINE · PERPLEXITY / CHATGPT / GEMINI</span>
              <button className="teardown-copy-btn" onClick={copyTeardownSummary}>
                {copied ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                <span>{copied ? 'Copied Summary!' : 'Copy Summary'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Backdrop Scrim */}
      {menu && <button className="scrim" aria-label="Close navigation" onClick={() => setMenu(false)} />}
    </div>
  );
}
