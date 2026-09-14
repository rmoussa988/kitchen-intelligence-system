import { useMemo } from 'react';
import { Ring, P, shortDate, timeHM } from '../../../ui';
import { useLang } from '../../../i18n/LangContext';
import { useStore } from '../../../store';
import type { Text } from '../text';
import { SCORES, SCORE_TREND, TREND_COLOR, COMPONENTS, ISSUES, KPI_GROUPS, bandFor, scoreColorFor, SEV_STYLE, type Bi, type Sev, type Tab } from '../data';

interface Props { t: Text; onTab: (tab: Tab) => void; go: (module: string, params?: Record<string, string>) => void }

interface IssueRow { key: string; sev: Sev; title: string; sub: string; ts: string; live: boolean; act: () => void }

/** MGT-DSH-01 — Kitchen Health: score ring per scope, component pills, KPI groups, "what needs attention". */
export default function HealthView({ t, onTab, go }: Props) {
  const { isAr } = useLang();
  const store = useStore();
  const scope = store.scope;
  const bi = (b: Bi) => (isAr ? b.ar : b.en);

  const score = SCORES[scope];
  const scoreColor = scoreColorFor(score);
  const verdict = score >= 80 ? t.good : score >= 65 ? t.watch : t.poor;
  const scopeLabel = scope === 'all' ? t.all : t.locs[scope];

  const alerts = store.state.alerts;
  const issueRows = useMemo<IssueRow[]>(() => {
    const rank: Record<Sev, number> = { red: 0, amber: 1, info: 2 };
    const stat: IssueRow[] = ISSUES.filter((i) => store.inScope(i.loc)).map((i) => ({
      key: 'i-' + i.ref, sev: i.sev, title: bi(i), sub: bi(i.sub) + ' · ' + i.ref, ts: '', live: false, act: () => go(i.module, i.params),
    }));
    // The prototype's 4th issue ("Corrective action overdue …", MGT-CMP-01) is the only live row: it is the
    // overdue corrective action this module itself raises. We keep the panel to that curated set rather than
    // mirroring the whole alert feed (which duplicated static issues and contradicted the Compliance tracker).
    const live: IssueRow[] = alerts.filter((a) => !a.dismissed && a.moduleId === 'health' && a.type === 'corrective_overdue' && store.inScope(a.loc)).map((a) => {
      const ref = 'MGT-CMP-01';
      return {
        key: a.id, sev: a.severity, title: isAr ? a.ar : a.en, sub: `${shortDate(a.ts, isAr)} ${timeHM(a.ts)} · ${ref}`, ts: a.ts, live: true,
        act: () => onTab('compliance'),
      };
    });
    return [...stat, ...live].sort((x, y) => rank[x.sev] - rank[y.sev] || Number(x.live) - Number(y.live) || (y.ts > x.ts ? 1 : y.ts < x.ts ? -1 : 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alerts, scope, isAr]);

  return (
    <>
      {/* ── score + components ── */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'stretch', flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 280, background: P.ink, color: P.page, borderRadius: 16, padding: '22px 26px', display: 'flex', alignItems: 'center', gap: 24 }}>
          <Ring value={score} size={120} stroke={10} color={scoreColor} track={P.inkBorder}
            label={<span style={{ fontSize: 34, fontWeight: 700, color: P.page }}>{score}</span>}
            sub={<span style={{ color: P.inkMuted }}>/ 100</span>} />
          <div>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.5px', color: P.inkMuted }}>{t.healthScore} · {scopeLabel}</div>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{verdict}</div>
            <div dir="ltr" style={{ fontSize: 13, color: TREND_COLOR, marginTop: 4, textAlign: 'start' }}>{SCORE_TREND} {t.vsLastMonth}</div>
          </div>
        </div>
        <div style={{ flex: 1.4, minWidth: 320, display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 8, alignContent: 'stretch' }}>
          {COMPONENTS.filter((c) => c.scores[scope] > 0).map((c) => {
            const v = c.scores[scope];
            const [bg, border, fg] = bandFor(v);
            return (
              <button key={c.key} onClick={() => (c.drill.tab ? onTab(c.drill.tab) : go(c.drill.module, c.drill.params))} title={t.actToast + ' ' + bi(c)}
                style={{ textAlign: 'start', border: `1px solid ${border}`, background: bg, borderRadius: 12, padding: '10px 13px', cursor: 'pointer', fontFamily: 'inherit', color: P.text }}>
                <div style={{ fontSize: 11, color: P.text3 }}>{bi(c)}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 3 }}>
                  <span dir="ltr" style={{ fontSize: 20, fontWeight: 700, color: fg }}>{v}</span>
                  <span dir="ltr" style={{ fontSize: 10.5, color: c.delta >= 0 ? '#48603A' : '#96382E' }}>{(c.delta >= 0 ? '+' : '−') + Math.abs(c.delta)}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── KPI groups + attention ── */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: 1.4, minWidth: 400, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {KPI_GROUPS.map((g, gi) => (
            <div key={gi} style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '10px 18px', background: P.thead, borderBottom: `1px solid ${P.border}`, fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: P.text2 }}>{bi(g.title)}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 0 }}>
                {g.kpis.map((k, ki) => {
                  const bad = !!k.bad?.[scope];
                  return (
                    <div key={ki} style={{ padding: '11px 18px', borderBottom: `1px solid ${P.borderRow}` }}>
                      <div style={{ fontSize: 11, color: P.text3 }}>{bi(k.name)}</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                        <span dir="ltr" style={{ fontSize: 16, fontWeight: 700, color: bad ? P.redFg : P.text }}>{k.v[scope]}</span>
                        {k.target && <span dir="ltr" style={{ fontSize: 10.5, color: P.text4 }}>{k.target}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div style={{ flex: 1, minWidth: 320, background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: P.text2 }}>{t.needsAttention}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {issueRows.length === 0 && <div style={{ fontSize: 12.5, color: P.text4, padding: '14px 0', textAlign: 'center' }}>{t.noAttention}</div>}
            {issueRows.map((r) => {
              const [bg, border, dot] = SEV_STYLE[r.sev];
              return (
                <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: bg, border: `1px solid ${border}` }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot, flex: 'none' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{r.title}</div>
                    <div style={{ fontSize: 11.5, color: P.text3, marginTop: 1 }}>{r.sub}</div>
                  </div>
                  <button onClick={r.act} style={{ height: 28, padding: '0 11px', borderRadius: 7, border: 'none', background: P.ink, color: P.onInk, fontSize: 11.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', flex: 'none' }}>{t.act}</button>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 11.5, color: P.text4, marginTop: 10 }}>{t.calmNote}</div>
        </div>
      </div>
    </>
  );
}
