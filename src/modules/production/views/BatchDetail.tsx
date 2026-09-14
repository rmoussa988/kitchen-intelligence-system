import { P, Modal, Btn, Pill, Field, fmt, money, shortDate, timeHM } from '../../../ui';
import { useLang, LOC_NAMES } from '../../../i18n/LangContext';
import { useStore } from '../../../store';
import type { Batch } from '../../../store';
import type { Text } from '../text';
import { LOW_YIELD_PT, stdFor } from '../data';

/** In-module batch drill-down (paper modal): inputs, marinade, output, gap three ways, cost, posted movements. */
export default function BatchDetail({ t, batch, onClose, onApprove, onInvestigate, onTrace }: {
  t: Text; batch?: Batch; onClose: () => void; onApprove: (b: Batch) => void; onInvestigate: (b: Batch) => void; onTrace: (b: Batch) => void;
}) {
  const { isAr, lang } = useLang();
  const store = useStore();
  if (!batch) return null;
  const b = batch;
  const d = t.d;
  const std = stdFor(b.itemId);
  const low = b.yieldPct != null && b.yieldPct < std - LOW_YIELD_PT;
  const stKey = b.status === 'complete' ? 'pending' : b.status === 'approved' ? 'done' : 'progress';
  const stTone = stKey === 'pending' ? 'amber' : stKey === 'done' ? 'green' : 'blue';
  const stdWeight = b.outputQty != null && b.standardPerUnit != null ? b.outputQty * b.standardPerUnit : null;
  const raw = b.rawItemId ? store.itemName(b.rawItemId, isAr) : '';
  const mvs = store.state.movements.filter((m) => m.source === b.id);
  const when = (s?: string) => s ? `${shortDate(s, isAr)} ${timeHM(s)}` : '—';
  const sign = (n: number) => (n >= 0 ? '+' : '−') + fmt(Math.abs(n));
  const gapTone = b.gapStatus === 'accepted' ? 'green' : b.gapStatus === 'flagged' ? 'rust' : 'amber';

  return (
    <Modal open onClose={onClose} width={640}
      title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>{store.itemName(b.itemId, isAr)} <span style={{ fontSize: 12, color: P.blueFg, fontWeight: 500 }} dir="ltr">{b.id}</span> <Pill tone={stTone}>{t.st[stKey]}</Pill></span>}
      sub={`${d.batchDetail} · ${LOC_NAMES[lang][b.loc]} · ${d.employee}: ${store.userName(b.employee, isAr)}`}
      footer={<>
        <Btn size="lg" variant="ghost" onClick={onClose}>{d.close}</Btn>
        <div style={{ flex: 1 }} />
        <Btn size="lg" onClick={() => onTrace(b)}>{t.fullTrace}</Btn>
        {(low || b.gapStatus === 'open' || b.gapStatus === 'flagged') && <Btn size="lg" variant="amber" onClick={() => onInvestigate(b)}>{t.investigateYield}</Btn>}
        {b.status === 'complete' && <Btn size="lg" variant="primary" onClick={() => { onApprove(b); onClose(); }}>{t.approve}</Btn>}
        {b.status === 'approved' && <span style={{ fontSize: 12, fontWeight: 700, color: P.greenFg, alignSelf: 'center' }}>{t.approvedLbl}</span>}
      </>}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        <Field label={d.started} value={when(b.startedAt)} ltr />
        <Field label={d.completed} value={when(b.completedAt)} ltr />
        <Field label={d.inputMode} value={b.inputMode === 'draw' ? d.draw : b.inputMode === 'commit' ? d.commit : '—'} />
        <Field label={d.planned} value={`${fmt(b.plannedQty)} ${b.unit}`} ltr />
        <Field label={d.outputQty} value={b.outputQty != null ? `${fmt(b.outputQty)} ${b.unit}` : '—'} ltr />
        <Field label={d.yield} value={b.yieldPct != null ? <span style={{ color: low ? P.amberFg : P.greenFg }}>{b.yieldPct.toFixed(1)}% / {std}%</span> : '—'} ltr />
        {b.inputMode === 'draw' && <Field label={`${d.rawDrawn} · ${raw}`} value={b.rawDrawn != null ? `${fmt(b.rawDrawn)} KG` : '—'} ltr />}
        {b.inputMode === 'draw' && <Field label={d.rawReturned} value={b.rawReturned != null ? `${fmt(b.rawReturned)} KG` : '—'} ltr />}
        <Field label={`${d.rawUsed}${b.inputMode !== 'draw' && raw ? ' · ' + raw : ''}`} value={b.rawUsed != null ? `${fmt(b.rawUsed)} KG` : '—'} ltr />
        <Field label={d.trimWaste} value={b.trimWaste != null ? `${fmt(b.trimWaste)} KG` : '—'} ltr />
        {b.marinadeRecommended != null && <Field label={d.marRec} value={`${fmt(b.marinadeRecommended)} KG`} ltr />}
        {b.marinadeUsed != null && <Field label={d.marUsed} value={`${fmt(b.marinadeUsed)} KG`} ltr />}
        <Field label={d.stdWeight} value={stdWeight != null ? `${fmt(stdWeight)} KG` : '—'} ltr />
        <Field label={d.gap} value={b.gapKg != null ? <span style={{ color: (b.gapPct ?? 0) >= store.state.settings.productionGapAlertPct ? P.redFg : P.amberFg }}>{sign(b.gapKg)} KG · {sign(b.gapPct ?? 0)}% · {money(-(b.gapUsd ?? 0))}</span> : '—'} ltr />
        <Field label={d.gapStatus} value={b.gapStatus ? <Pill tone={gapTone}>{b.gapStatus === 'open' ? d.gapOpen : b.gapStatus === 'accepted' ? d.gapAccepted : d.gapFlagged}</Pill> : '—'} />
        <Field label={d.cost} value={b.cost != null ? money(b.cost) : '—'} ltr />
      </div>
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 11.5, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 6 }}>{d.movements}</div>
        {mvs.length === 0
          ? <div style={{ fontSize: 12.5, color: P.text4 }}>{d.noMovements}</div>
          : (
            <div style={{ border: `1px solid ${P.border}`, borderRadius: 10, background: P.card, overflow: 'hidden' }}>
              {mvs.map((m) => (
                <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.4fr 90px 90px', gap: 10, padding: '8px 12px', fontSize: 12.5, borderBottom: `1px solid ${P.borderRow}`, alignItems: 'center' }}>
                  <span style={{ color: P.text3 }}>{d.mv[m.type] ?? m.type}</span>
                  <span className="ellipsis" style={{ fontWeight: 600 }}>{store.itemName(m.itemId, isAr)}</span>
                  <span dir="ltr" style={{ textAlign: 'end' }}>{m.qty > 0 ? '+' : '−'}{fmt(Math.abs(m.qty))} {m.enteredUnit ?? ''}</span>
                  <span dir="ltr" style={{ textAlign: 'end', color: m.value < 0 ? P.redFg : P.greenFg, fontWeight: 600 }}>{money(m.value, { sign: true })}</span>
                </div>
              ))}
            </div>
          )}
      </div>
    </Modal>
  );
}
