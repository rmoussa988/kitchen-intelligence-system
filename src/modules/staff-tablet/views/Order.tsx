import type { Item } from '../../../store';
import { D, fmt } from '../../../ui';
import type { OrderDef } from '../data';
import type { TabletText } from '../text';

export interface OrderRow { def: OrderDef; item: Item | undefined }

export function OrderView({ t, isAr, rows, qty, onInc, onDec, onTap, onSubmit }: {
  t: TabletText; isAr: boolean; rows: OrderRow[]; qty: Record<number, number>;
  onInc: (i: number) => void; onDec: (i: number) => void; onTap: (i: number) => void; onSubmit: () => void;
}) {
  const lines = rows.filter((_r, i) => (qty[i] || 0) > 0).length;
  const total = rows.reduce((a, _r, i) => a + (qty[i] || 0), 0);
  return (
    <div className="fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 32px' }}>
        <div style={{ fontSize: 16, color: D.muted, marginBottom: 14 }}>{t.orderHint}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map((r, i) => {
            const q = qty[i] || 0;
            return (
              <div key={r.def.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px', border: `1px solid ${q > 0 ? '#4A5348' : D.border}`, background: D.card, borderRadius: 18 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 20, fontWeight: 600 }}>{r.item ? (isAr ? r.item.ar : r.item.en) : r.def.id}</div>
                  <div style={{ fontSize: 15, color: D.muted, marginTop: 2 }}>{r.item ? (isAr ? r.item.en : r.item.ar) : ''} · {isAr ? r.def.unitAr : r.def.unit}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} dir="ltr">
                  <button onClick={() => onDec(i)} style={{ width: 56, height: 56, borderRadius: 14, border: `1px solid ${D.border3}`, background: D.key, color: D.text, fontSize: 26, fontFamily: 'inherit', cursor: 'pointer' }}>−</button>
                  <button onClick={() => onTap(i)} style={{ minWidth: 96, height: 56, borderRadius: 14, border: `1px solid ${D.border3}`, background: D.card2, color: q > 0 ? D.text : D.dim, fontSize: 24, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', fontVariantNumeric: 'tabular-nums' }}>{fmt(q)}</button>
                  <button onClick={() => onInc(i)} style={{ width: 56, height: 56, borderRadius: 14, border: `1px solid ${D.border3}`, background: D.key, color: D.text, fontSize: 26, fontFamily: 'inherit', cursor: 'pointer' }}>＋</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 20, padding: '16px 32px', borderTop: `1px solid ${D.headerBorder}`, background: D.card2 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, color: D.muted }}>{t.summary}</div>
          <div style={{ fontSize: 20, fontWeight: 600, marginTop: 2 }}>{lines} {t.items} · <span dir="ltr">{fmt(total)}</span> {t.units}</div>
        </div>
        <button onClick={onSubmit} style={{ height: 64, padding: '0 36px', borderRadius: 16, border: 'none', background: lines ? D.cream : D.disabled, color: D.onCream, fontSize: 20, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>{t.submitReq}</button>
      </div>
    </div>
  );
}
