import type { Item, TransferLine } from '../../../store';
import { D, fmt, money } from '../../../ui';
import type { TabletText } from '../text';
import { unitAr as unitArOf } from '../data';

/* ── Queue lists (fulfillment queue / incoming transfers) ── */

export interface QueueRow { id: string; from: string; time: string; lines: number }

export function QueueList({ t, hint, pill, rows, empty, chevron, onOpen }: {
  t: TabletText; hint: string; pill: string; rows: QueueRow[]; empty: string; chevron: string; onOpen: (id: string) => void;
}) {
  return (
    <div className="fade-in" style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>
      <div style={{ fontSize: 16, color: D.muted, marginBottom: 14 }}>{hint}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rows.map((q) => (
          <button key={q.id} className="tile-hover" onClick={() => onOpen(q.id)} style={{ textAlign: 'start', display: 'flex', alignItems: 'center', gap: 18, padding: '20px 22px', border: `1px solid ${D.border}`, background: D.card, borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit', color: D.text }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 21, fontWeight: 700 }}>{q.from}</div>
              <div style={{ fontSize: 15, color: D.muted, marginTop: 3 }}><span dir="ltr">{q.id}</span> · <span dir="ltr">{q.time}</span> · {q.lines} {t.lines}</div>
            </div>
            <span style={{ fontSize: 14, padding: '7px 14px', borderRadius: 999, background: D.amberChip, color: D.gold }}>{pill}</span>
            <span style={{ fontSize: 22, color: D.muted }}>{chevron}</span>
          </button>
        ))}
        {rows.length === 0 && <div style={{ padding: 48, textAlign: 'center', color: D.muted, fontSize: 17 }}>{empty}</div>}
      </div>
    </div>
  );
}

/* ── Fulfill & send detail (STF-TRF-02) ── */

export interface FulfillRow { ln: TransferLine; item: Item | undefined; sent: number }

export function FulfillDetail({ t, isAr, rows, preview, onTap, onSubmit }: {
  t: TabletText; isAr: boolean; rows: FulfillRow[]; preview: string; onTap: (i: number) => void; onSubmit: () => void;
}) {
  const grid = '1fr 130px 150px 110px';
  return (
    <div className="fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 12, padding: '0 18px 10px', fontSize: 14, color: D.muted, letterSpacing: '.3px' }}>
          <div>{t.itemCol}</div><div style={{ textAlign: 'end' }}>{t.requested}</div><div style={{ textAlign: 'center' }}>{t.sending}</div><div style={{ textAlign: 'end' }}>{t.value}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((f, i) => {
            const un = isAr ? unitArOf(f.ln.unit) : f.ln.unit;
            const diff = f.sent - f.ln.requested;
            return (
              <div key={f.ln.itemId + i} style={{ display: 'grid', gridTemplateColumns: grid, gap: 12, alignItems: 'center', padding: '12px 18px', border: `1px solid ${D.border}`, background: D.card, borderRadius: 16 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 19, fontWeight: 600 }}>{f.item ? (isAr ? f.item.ar : f.item.en) : f.ln.itemId}</div>
                  <div style={{ fontSize: 14, color: D.muted, marginTop: 2 }}>{f.item ? (isAr ? f.item.en : f.item.ar) : ''} · <span dir="ltr">{money(f.ln.cost)} / {un}</span></div>
                </div>
                <div style={{ textAlign: 'end', fontSize: 19, color: D.text2 }} dir="ltr">{fmt(f.ln.requested)} {un}</div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button onClick={() => onTap(i)} dir="ltr" style={{ minWidth: 120, height: 54, borderRadius: 14, border: `1px solid ${diff !== 0 ? D.amberBorder : D.border3}`, background: D.card2, color: D.text, fontSize: 21, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', fontVariantNumeric: 'tabular-nums' }}>{fmt(f.sent)} {un}</button>
                </div>
                <div style={{ textAlign: 'end' }}>
                  <div style={{ fontSize: 18, fontWeight: 600 }} dir="ltr">{money(f.sent * f.ln.cost)}</div>
                  {diff !== 0 && <div style={{ fontSize: 13, color: D.gold2, marginTop: 2 }}><span dir="ltr">{(diff > 0 ? '+' : '−') + fmt(Math.abs(diff))}</span> {t.vsRequested}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 20, padding: '16px 32px', borderTop: `1px solid ${D.headerBorder}`, background: D.card2 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, color: D.muted }}>{t.resultPreview}</div>
          <div style={{ fontSize: 19, fontWeight: 600, marginTop: 2 }}>{preview}</div>
        </div>
        <button onClick={onSubmit} style={{ height: 64, padding: '0 36px', borderRadius: 16, border: 'none', background: D.cream, color: D.onCream, fontSize: 20, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>{t.submitSend}</button>
      </div>
    </div>
  );
}

/* ── Confirm receipt detail (STF-TRF-03) ── */

export interface ReceiveRow { ln: TransferLine; item: Item | undefined; sent: number; recv: number; beyond: boolean; flag: 0 | 1 | 2 }

export function ReceiveDetail({ t, isAr, rows, preview, onTap, onFlag, onSubmit }: {
  t: TabletText; isAr: boolean; rows: ReceiveRow[]; preview: string; onTap: (i: number) => void; onFlag: (i: number) => void; onSubmit: () => void;
}) {
  const grid = '1fr 120px 150px 170px';
  return (
    <div className="fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 12, padding: '0 18px 10px', fontSize: 14, color: D.muted, letterSpacing: '.3px' }}>
          <div>{t.itemCol}</div><div style={{ textAlign: 'end' }}>{t.sent}</div><div style={{ textAlign: 'center' }}>{t.received}</div><div style={{ textAlign: 'end' }}>{t.status}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((v, i) => {
            const un = isAr ? unitArOf(v.ln.unit) : v.ln.unit;
            const diff = v.recv - v.sent;
            const flagOn = v.flag !== 0;
            return (
              <div key={v.ln.itemId + i} style={{ display: 'grid', gridTemplateColumns: grid, gap: 12, alignItems: 'center', padding: '12px 18px', border: `1px solid ${D.border}`, background: D.card, borderRadius: 16 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 19, fontWeight: 600 }}>{v.item ? (isAr ? v.item.ar : v.item.en) : v.ln.itemId}</div>
                  <div style={{ fontSize: 14, color: D.muted, marginTop: 2 }}>{v.item ? (isAr ? v.item.en : v.item.ar) : ''}</div>
                </div>
                <div style={{ textAlign: 'end', fontSize: 19, color: D.text2 }} dir="ltr">{fmt(v.sent)} {un}</div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button onClick={() => onTap(i)} dir="ltr" style={{ minWidth: 120, height: 54, borderRadius: 14, border: `1px solid ${diff !== 0 ? (v.beyond ? D.redBorder : D.amberBorder) : D.border3}`, background: D.card2, color: D.text, fontSize: 21, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', fontVariantNumeric: 'tabular-nums' }}>{fmt(v.recv)} {un}</button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
                  {diff !== 0 && <span style={{ fontSize: 14, padding: '6px 12px', borderRadius: 999, background: v.beyond ? D.redChip : D.amberChip, color: v.beyond ? D.redFg : D.gold, fontWeight: 600 }} dir="ltr">{(diff > 0 ? '+' : '−') + fmt(Math.abs(diff))} {un}</span>}
                  <button onClick={() => onFlag(i)} style={{ height: 44, padding: '0 14px', borderRadius: 12, border: `1px solid ${flagOn ? D.redBorder : D.border3}`, background: flagOn ? D.redChip : 'transparent', color: flagOn ? D.redFg : D.muted, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap' }}>{v.flag === 1 ? t.short : v.flag === 2 ? t.damaged : t.flagIssue}</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 20, padding: '16px 32px', borderTop: `1px solid ${D.headerBorder}`, background: D.card2 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, color: D.muted }}>{t.receiptNote}</div>
          <div style={{ fontSize: 19, fontWeight: 600, marginTop: 2 }}>{preview}</div>
        </div>
        <button onClick={onSubmit} style={{ height: 64, padding: '0 36px', borderRadius: 16, border: 'none', background: D.cream, color: D.onCream, fontSize: 20, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>{t.confirmReceipt}</button>
      </div>
    </div>
  );
}
