import { D } from '../../../ui';
import { useStore } from '../../../store';
import type { Batch, ProductionPlan } from '../../../store';
import type { Text } from '../text';
import { specFor, unitLabel } from '../data';
import type { Flow } from '../logic';

/** STF-PRD-00 — card list of today's assigned plans, each with its own saved state. */
export default function Hub({ t, isAr, plans, flowOf, batchOf, onOpen }: {
  t: Text; isAr: boolean; plans: ProductionPlan[]; flowOf: (p: ProductionPlan) => Flow; batchOf: (p: ProductionPlan) => Batch | undefined; onOpen: (p: ProductionPlan) => void;
}) {
  const store = useStore();
  return (
    <div className="fade-in" style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '22px 26px' }}>
      <div style={{ fontSize: 15, color: D.muted, marginBottom: 16 }}>{t.hubHint}</div>
      {plans.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: D.muted, fontSize: 16, border: `1px solid ${D.border}`, borderRadius: 20, background: D.card }}>{t.noPlans}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 14 }}>
        {plans.map((p) => {
          const st = flowOf(p);
          const b = batchOf(p);
          const spec = specFor(p.itemId);
          const item = store.item(p.itemId);
          const name = store.itemName(p.itemId, isAr);
          const nameAlt = item ? (isAr ? item.en : item.ar) : p.itemId;
          const paused = !st.done && st.screen !== 'start' && p.status === 'paused';
          const sm = st.done ? [t.doneSt, D.greenBg, D.greenFg] : paused ? [t.paused, D.amberChip, D.gold] : st.screen === 'start' ? [t.notStarted, D.chip, D.text2] : [t.inProgress, '#233038', '#9FC2CE'];
          const prog = st.done ? 100 : st.screen === 'start' ? 0 : st.screen === 'stages' ? 40 : 75;
          const names = isAr ? spec.stepsAr : spec.stepsEn;
          const idx = Object.keys(st.steps).filter((k) => st.steps[k]).length;
          const stageLabel = st.done ? t.doneSt : st.screen === 'start' ? t.notStarted : `${t.stageAt} ${st.screen === 'output' ? t.outputStage : names[Math.min(idx, names.length - 1)]}`;
          const badge = (!st.done && st.screen === 'output' && st.out != null) || (st.done && b?.gapStatus === 'open') ? t.gapBadge : null;
          return (
            <button key={p.id} onClick={() => onOpen(p)} className="tile-hover" style={{ textAlign: 'start', border: `1px solid ${st.done ? D.greenBorder : st.screen !== 'start' ? D.border3 : D.border}`, background: D.card, borderRadius: 20, padding: '20px 22px', cursor: 'pointer', fontFamily: 'inherit', color: D.text, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontSize: 20, fontWeight: 700, flex: 1, minWidth: 0 }}>{name}</div>
                <span style={{ fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 999, background: sm[1], color: sm[2], whiteSpace: 'nowrap' }}>{sm[0]}</span>
              </div>
              <div style={{ fontSize: 14, color: D.muted }}>{nameAlt} · <span dir="ltr">{st.batchId ?? b?.id ?? p.id}</span></div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 26, fontWeight: 700 }} dir="ltr">{p.plannedQty} {unitLabel(p.unit, isAr)}</span>
                <span style={{ fontSize: 14, color: D.muted }}>{t.planned}</span>
                <div style={{ flex: 1 }} />
                {badge && <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 11px', borderRadius: 999, background: D.amberChip, color: D.gold }}>{badge}</span>}
              </div>
              <div>
                <div style={{ height: 7, borderRadius: 999, background: D.tileIcon, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 999, background: st.done ? D.greenFg : D.cream, width: `${prog}%`, transition: 'width .3s' }} />
                </div>
                <div style={{ fontSize: 12.5, color: D.muted, marginTop: 6 }}>{stageLabel}</div>
              </div>
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 13, color: D.dim, marginTop: 16 }}>{t.hubNote}</div>
    </div>
  );
}
