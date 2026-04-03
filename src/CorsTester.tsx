import { useState } from 'react'
import { Sun, Moon, Languages, Globe, ArrowRight, ArrowLeft, AlertTriangle, CheckCircle, XCircle, Info, ChevronDown, ChevronUp } from 'lucide-react'

// ── i18n ─────────────────────────────────────────────────────────────────────
const translations = {
  en: {
    title: 'CORS Visual Reference',
    subtitle: 'Understand Cross-Origin Resource Sharing: request flows, required headers, and common errors. Interactive educational tool.',
    scenarioTitle: 'Simulate a Request',
    origin: 'Origin (your app)',
    target: 'Target URL',
    method: 'HTTP Method',
    hasAuth: 'Sends credentials (cookies / Authorization)',
    customHeader: 'Custom request header',
    analyze: 'Analyze',
    flowTitle: 'Request Flow',
    headersTitle: 'Required Headers',
    errorsTitle: 'Common CORS Errors',
    errorsDesc: 'Click an error to see the fix',
    simple: 'Simple Request',
    preflight: 'Preflight Required',
    noCorsProblem: 'Same origin — no CORS needed',
    browserLabel: 'Browser',
    serverLabel: 'Server',
    step: 'Step',
    preflightReq: 'OPTIONS preflight request',
    preflightRes: 'Preflight response (must allow)',
    actualReq: 'Actual request',
    actualRes: 'Response with CORS headers',
    simpleReqLabel: 'Request (simple)',
    simpleResLabel: 'Response',
    serverMustReturn: 'Server must return',
    tip: 'Tip',
    builtBy: 'Built by',
    notice: 'Real CORS enforcement happens in the browser. This tool explains the mechanism — it cannot bypass or test live servers.',
    crossOrigin: 'Cross-origin',
    sameOrigin: 'Same-origin',
    wildcardWarning: 'Wildcard (*) cannot be used with credentials.',
  },
  pt: {
    title: 'Referencia Visual de CORS',
    subtitle: 'Entenda o Cross-Origin Resource Sharing: fluxos de requisicao, cabecalhos necessarios e erros comuns. Ferramenta educacional interativa.',
    scenarioTitle: 'Simular uma Requisicao',
    origin: 'Origem (seu app)',
    target: 'URL de destino',
    method: 'Metodo HTTP',
    hasAuth: 'Envia credenciais (cookies / Authorization)',
    customHeader: 'Cabecalho personalizado',
    analyze: 'Analisar',
    flowTitle: 'Fluxo da Requisicao',
    headersTitle: 'Cabecalhos Necessarios',
    errorsTitle: 'Erros Comuns de CORS',
    errorsDesc: 'Clique em um erro para ver a solucao',
    simple: 'Requisicao Simples',
    preflight: 'Preflight Necessario',
    noCorsProblem: 'Mesma origem — CORS nao e necessario',
    browserLabel: 'Navegador',
    serverLabel: 'Servidor',
    step: 'Passo',
    preflightReq: 'Requisicao OPTIONS preflight',
    preflightRes: 'Resposta do preflight (deve permitir)',
    actualReq: 'Requisicao real',
    actualRes: 'Resposta com cabecalhos CORS',
    simpleReqLabel: 'Requisicao (simples)',
    simpleResLabel: 'Resposta',
    serverMustReturn: 'O servidor deve retornar',
    tip: 'Dica',
    builtBy: 'Criado por',
    notice: 'O CORS e aplicado pelo navegador. Esta ferramenta explica o mecanismo — nao pode contornar ou testar servidores reais.',
    crossOrigin: 'Cross-origin',
    sameOrigin: 'Mesma origem',
    wildcardWarning: 'Wildcard (*) nao pode ser usado com credenciais.',
  },
} as const
type Lang = keyof typeof translations

// ── Logic ─────────────────────────────────────────────────────────────────────
const SIMPLE_METHODS = new Set(['GET', 'HEAD', 'POST'])
const SAFELISTED_HEADERS = new Set(['accept','accept-language','content-language','content-type','range'])

function isSameOrigin(origin: string, target: string): boolean {
  try {
    const o = new URL(origin.startsWith('http') ? origin : `https://${origin}`)
    const t = new URL(target.startsWith('http') ? target : `https://${target}`)
    return o.origin === t.origin
  } catch { return false }
}

function needsPreflight(method: string, hasAuth: boolean, customHeader: string): boolean {
  if (!SIMPLE_METHODS.has(method)) return true
  if (customHeader.trim() && !SAFELISTED_HEADERS.has(customHeader.trim().toLowerCase())) return true
  if (hasAuth) return false // credentials alone don't trigger preflight
  return false
}

// ── Common errors data ────────────────────────────────────────────────────────
const ERRORS = [
  {
    id: 'missing-header',
    title: 'No Access-Control-Allow-Origin header',
    desc: 'The server response does not include Access-Control-Allow-Origin.',
    fix: 'Add to server response: Access-Control-Allow-Origin: https://your-app.com (or * for public APIs)',
    severity: 'error' as const,
  },
  {
    id: 'wildcard-credentials',
    title: 'Wildcard with credentials',
    desc: 'Access-Control-Allow-Origin: * cannot be combined with Access-Control-Allow-Credentials: true.',
    fix: 'Replace * with the exact origin: Access-Control-Allow-Origin: https://your-app.com',
    severity: 'error' as const,
  },
  {
    id: 'preflight-blocked',
    title: 'Preflight request rejected',
    desc: 'The OPTIONS request returned 4xx or missing Allow-Methods/Headers.',
    fix: 'Handle OPTIONS: Access-Control-Allow-Methods: GET, POST, PUT\nAccess-Control-Allow-Headers: Content-Type, Authorization',
    severity: 'error' as const,
  },
  {
    id: 'method-not-allowed',
    title: 'Method not in Access-Control-Allow-Methods',
    desc: 'The actual request method is not listed in the preflight response.',
    fix: 'Expand allowed methods: Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH',
    severity: 'warning' as const,
  },
  {
    id: 'header-not-allowed',
    title: 'Request header not in Access-Control-Allow-Headers',
    desc: 'A custom header sent by the browser is not permitted by the server.',
    fix: 'List the header explicitly: Access-Control-Allow-Headers: Content-Type, Authorization, X-Custom-Header',
    severity: 'warning' as const,
  },
  {
    id: 'no-expose',
    title: 'Response header not accessible',
    desc: 'JS cannot read a response header because it is not exposed.',
    fix: 'Add: Access-Control-Expose-Headers: X-Total-Count, X-Request-Id',
    severity: 'info' as const,
  },
] as const

type SeverityType = 'error' | 'warning' | 'info'

// ── Sub-components ────────────────────────────────────────────────────────────
function HeaderBadge({ name, value }: { name: string; value: string }) {
  return (
    <div className="rounded-md bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 px-3 py-2">
      <span className="font-mono text-xs text-amber-600 dark:text-amber-400">{name}: </span>
      <span className="font-mono text-xs text-zinc-700 dark:text-zinc-300">{value}</span>
    </div>
  )
}

function Arrow({ label, dir = 'right' }: { label: string; dir?: 'right' | 'left' }) {
  return (
    <div className={`flex items-center gap-2 text-xs text-zinc-500 my-1 ${dir === 'left' ? 'flex-row-reverse' : ''}`}>
      <div className="flex-1 border-t border-dashed border-zinc-300 dark:border-zinc-700" />
      <span className="shrink-0 bg-white dark:bg-zinc-900 px-1">{label}</span>
      {dir === 'right' ? <ArrowRight size={14} className="text-amber-500 shrink-0" /> : <ArrowLeft size={14} className="text-amber-500 shrink-0" />}
    </div>
  )
}

function ErrorCard({ err }: { err: typeof ERRORS[number] }) {
  const [open, setOpen] = useState(false)
  const colors: Record<SeverityType, string> = {
    error: 'border-red-200 dark:border-red-800',
    warning: 'border-amber-200 dark:border-amber-800',
    info: 'border-blue-200 dark:border-blue-800',
  }
  const icons: Record<SeverityType, React.ReactNode> = {
    error: <XCircle size={15} className="text-red-500 shrink-0 mt-0.5" />,
    warning: <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />,
    info: <Info size={15} className="text-blue-500 shrink-0 mt-0.5" />,
  }
  return (
    <div className={`rounded-lg border ${colors[err.severity]} bg-white dark:bg-zinc-900 overflow-hidden`}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
        {icons[err.severity]}
        <span className="flex-1 text-sm font-medium">{err.title}</span>
        {open ? <ChevronUp size={14} className="text-zinc-400 mt-0.5 shrink-0" /> : <ChevronDown size={14} className="text-zinc-400 mt-0.5 shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-zinc-100 dark:border-zinc-800 pt-3">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{err.desc}</p>
          <div className="rounded-md bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 px-3 py-2">
            <pre className="font-mono text-xs text-green-600 dark:text-green-400 whitespace-pre-wrap">{err.fix}</pre>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CorsTester() {
  const [lang, setLang] = useState<Lang>(() => navigator.language.startsWith('pt') ? 'pt' : 'en')
  const [dark, setDark] = useState(() => {
    const d = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.classList.toggle('dark', d)
    return d
  })
  const [origin, setOrigin] = useState('https://app.example.com')
  const [target, setTarget] = useState('https://api.example.com/data')
  const [method, setMethod] = useState('GET')
  const [hasAuth, setHasAuth] = useState(false)
  const [customHeader, setCustomHeader] = useState('')
  const [analyzed, setAnalyzed] = useState(false)

  const t = translations[lang]
  const toggleDark = () => { const n=!dark; setDark(n); document.documentElement.classList.toggle('dark',n) }

  const sameOrigin = isSameOrigin(origin, target)
  const preflight = !sameOrigin && needsPreflight(method, hasAuth, customHeader)
  const originValue = origin || 'https://app.example.com'

  const methods = ['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS']

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 transition-colors">
      <header className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
              <Globe size={18} className="text-white" />
            </div>
            <span className="font-semibold">CORS Tester</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setLang(l => l === 'en' ? 'pt' : 'en')} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <Languages size={14} />{lang.toUpperCase()}
            </button>
            <button onClick={toggleDark} className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <a href="https://github.com/gmowses/cors-tester" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 py-10">
        <div className="max-w-5xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold">{t.title}</h1>
            <p className="mt-2 text-zinc-500 dark:text-zinc-400">{t.subtitle}</p>
          </div>

          {/* Simulator */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-5">
            <h2 className="font-semibold">{t.scenarioTitle}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-500">{t.origin}</label>
                <input value={origin} onChange={e => { setOrigin(e.target.value); setAnalyzed(false) }} className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-500">{t.target}</label>
                <input value={target} onChange={e => { setTarget(e.target.value); setAnalyzed(false) }} className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-500">{t.method}</label>
                <div className="flex flex-wrap gap-1.5">
                  {methods.map(m => (
                    <button key={m} onClick={() => { setMethod(m); setAnalyzed(false) }} className={`px-2.5 py-1 rounded text-xs font-mono font-medium border transition-colors ${method===m ? 'bg-amber-500 border-amber-500 text-white' : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>{m}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-500">{t.customHeader}</label>
                <input value={customHeader} onChange={e => { setCustomHeader(e.target.value); setAnalyzed(false) }} placeholder="X-Custom-Header" className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={hasAuth} onChange={e => { setHasAuth(e.target.checked); setAnalyzed(false) }} className="h-4 w-4 cursor-pointer accent-amber-500" />
              <span className="text-sm">{t.hasAuth}</span>
            </label>
            <button onClick={() => setAnalyzed(true)} className="flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-amber-600 transition-colors">
              <Globe size={15} />
              {t.analyze}
            </button>
          </div>

          {analyzed && (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Flow diagram */}
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">{t.flowTitle}</h2>
                  {sameOrigin
                    ? <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400">{t.sameOrigin}</span>
                    : preflight
                    ? <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">{t.preflight}</span>
                    : <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400">{t.simple}</span>
                  }
                </div>

                {sameOrigin ? (
                  <div className="flex items-center gap-3 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-4 py-3">
                    <CheckCircle size={18} className="text-green-500 shrink-0" />
                    <p className="text-sm">{t.noCorsProblem}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Boxes */}
                    <div className="flex items-stretch gap-4">
                      <div className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-center">
                        <p className="text-[10px] uppercase tracking-wide text-zinc-400 mb-1">{t.browserLabel}</p>
                        <p className="text-xs font-mono truncate text-zinc-600 dark:text-zinc-400">{originValue}</p>
                      </div>
                      <div className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-center">
                        <p className="text-[10px] uppercase tracking-wide text-zinc-400 mb-1">{t.serverLabel}</p>
                        <p className="text-xs font-mono truncate text-zinc-600 dark:text-zinc-400">{target}</p>
                      </div>
                    </div>

                    {preflight ? (
                      <>
                        <Arrow label={`${t.step} 1: OPTIONS`} />
                        <div className="rounded-md border border-zinc-100 dark:border-zinc-800 px-3 py-2 text-xs text-zinc-500">
                          <p className="font-medium text-zinc-700 dark:text-zinc-300 mb-1">{t.preflightReq}</p>
                          <p className="font-mono">Origin: {originValue}</p>
                          <p className="font-mono">Access-Control-Request-Method: {method}</p>
                          {customHeader && <p className="font-mono">Access-Control-Request-Headers: {customHeader}</p>}
                        </div>
                        <Arrow label={`${t.step} 2: 204 / 200`} dir="left" />
                        <div className="rounded-md border border-zinc-100 dark:border-zinc-800 px-3 py-2 text-xs text-zinc-500">
                          <p className="font-medium text-zinc-700 dark:text-zinc-300 mb-1">{t.preflightRes}</p>
                          <p className="font-mono text-green-600 dark:text-green-400">Access-Control-Allow-Origin: {hasAuth ? originValue : '*'}</p>
                          <p className="font-mono text-green-600 dark:text-green-400">Access-Control-Allow-Methods: {method}</p>
                          {customHeader && <p className="font-mono text-green-600 dark:text-green-400">Access-Control-Allow-Headers: {customHeader}</p>}
                          {hasAuth && <p className="font-mono text-green-600 dark:text-green-400">Access-Control-Allow-Credentials: true</p>}
                        </div>
                        <Arrow label={`${t.step} 3: ${method}`} />
                        <Arrow label={`${t.step} 4: 200 OK`} dir="left" />
                        <div className="rounded-md border border-zinc-100 dark:border-zinc-800 px-3 py-2 text-xs text-zinc-500">
                          <p className="font-medium text-zinc-700 dark:text-zinc-300 mb-1">{t.actualRes}</p>
                          <p className="font-mono text-green-600 dark:text-green-400">Access-Control-Allow-Origin: {hasAuth ? originValue : '*'}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <Arrow label={`${method} ${t.simpleReqLabel}`} />
                        <div className="rounded-md border border-zinc-100 dark:border-zinc-800 px-3 py-2 text-xs text-zinc-500">
                          <p className="font-mono">Origin: {originValue}</p>
                        </div>
                        <Arrow label={`200 OK ${t.simpleResLabel}`} dir="left" />
                        <div className="rounded-md border border-zinc-100 dark:border-zinc-800 px-3 py-2 text-xs text-zinc-500">
                          <p className="font-mono text-green-600 dark:text-green-400">Access-Control-Allow-Origin: {hasAuth ? originValue : '*'}</p>
                          {hasAuth && <p className="font-mono text-green-600 dark:text-green-400">Access-Control-Allow-Credentials: true</p>}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Required headers */}
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3">
                <h2 className="font-semibold">{t.headersTitle}</h2>
                {sameOrigin ? (
                  <p className="text-sm text-zinc-500">{t.noCorsProblem}</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-zinc-400 uppercase tracking-wide font-semibold">{t.serverMustReturn}</p>
                    <HeaderBadge name="Access-Control-Allow-Origin" value={hasAuth ? originValue : '*'} />
                    {hasAuth && <HeaderBadge name="Access-Control-Allow-Credentials" value="true" />}
                    {preflight && <>
                      <HeaderBadge name="Access-Control-Allow-Methods" value={method} />
                      {customHeader && <HeaderBadge name="Access-Control-Allow-Headers" value={customHeader} />}
                    </>}
                    {hasAuth && (
                      <div className="flex items-start gap-2 rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                        <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                        {t.wildcardWarning}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Common errors */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
            <div>
              <h2 className="font-semibold">{t.errorsTitle}</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.errorsDesc}</p>
            </div>
            <div className="space-y-2">
              {ERRORS.map(err => <ErrorCard key={err.id} err={err} />)}
            </div>
          </div>

          <p className="text-[10px] text-zinc-400">{t.notice}</p>
        </div>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs text-zinc-400">
          <span>{t.builtBy} <a href="https://github.com/gmowses" className="text-zinc-600 dark:text-zinc-300 hover:text-amber-500 transition-colors">Gabriel Mowses</a></span>
          <span>MIT License</span>
        </div>
      </footer>
    </div>
  )
}
