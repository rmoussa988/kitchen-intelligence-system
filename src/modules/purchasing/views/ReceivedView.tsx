import React from 'react';
import { useLang, LOC_NAMES } from '../../../i18n/LangContext';
import { useStore, type Delivery } from '../../../store';
import { P, money } from '../../../ui';
import { TEXT } from '../text';
import { dateTime, supName } from '../../receiving/data';
import { readRcvMeta } from '../../staff-receiving/meta';

interface Props { recId: string | null; setRecId: (id: string) => void; onCreate: () => void; onReview: (d: Delivery) => void }

/** "Received suppliers" — receiver submissions (store deliveries) with scan + note, handing off to the review pipeline. */
export default function ReceivedView({ recId, setRecId, onCreate, onReview }: Props) {
  const { lang, isAr, chevron } = useLang();
  const t = TEXT[lang];
  const store = useStore();
  const st = store.state;
  const meta = readRcvMeta(st);
  const names = LOC_NAMES[lang];

  const rows = st.deliveries.filter((d) => store.inScope(d.loc)).slice().sort((a, b) => b.ts.localeCompare(a.ts));
  const invOf = (d: Delivery) => st.invoices.find((i) => i.deliveryId === d.id);
  const recStatus = (d: Delivery) => { const inv = invOf(d); return !inv || inv.stage === 'received' ? { c: t.pendingReview, bg: P.amberBg, fg: P.amberFg } : { c: t.reviewed, bg: P.greenBg, fg: P.greenFg }; };
  const scanOf = (d: Delivery) => meta[d.id]?.scan ?? true;
  const noteOf = (d: Delivery) => meta[d.id]?.note ?? '';
  const dRec = rows.find((d) => d.id === recId) ?? rows[0];
  const dSup = dRec ? st.suppliers.find((s) => s.id === dRec.supplierId) : undefined;
  const dSc = dRec ? recStatus(dRec) : null;

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
      <div style={{ width: 300, flex: 'none', borderInlineEnd: `1px solid ${P.border}`, background: P.thead, overflow: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button onClick={onCreate} style={{ height: 40, borderRadius: 9, border: 'none', background: P.ink, color: P.onInk, fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', flex: 'none' }}>＋ {t.newOrder}</button>
        {rows.length === 0 && <div style={{ padding: '22px 8px', textAlign: 'center', color: P.text4, fontSize: 13 }}>{t.noReceived}</div>}
        {rows.map((d) => {
          const sup = st.suppliers.find((s) => s.id === d.supplierId);
          const sc = recStatus(d), on = dRec?.id === d.id, scan = scanOf(d);
          return (
            <button key={d.id} onClick={() => setRecId(d.id)} style={{ textAlign: 'start', border: `1px solid ${on ? '#4A5348' : P.border}`, background: on ? P.card : P.surface, borderRadius: 12, padding: '12px 14px', cursor: 'pointer', fontFamily: 'inherit', color: P.text }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, flex: 1 }}>{supName(sup, isAr)}</span>
                <span style={{ fontSize: 10.5, padding: '2px 9px', borderRadius: 999, background: sc.bg, color: sc.fg, fontWeight: 600 }}>{sc.c}</span>
              </div>
              <div style={{ fontSize: 11.5, color: P.text3, marginTop: 3 }}><span dir="ltr">{d.invoiceNo}</span> · <span dir="ltr">{dateTime(d.ts, isAr)}</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 7 }}>
                <span style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 999, background: scan ? P.blueBg : P.amberPill, color: scan ? P.blueFg : P.amberFg }}>{scan ? t.scannedTag : t.manualTag}</span>
                {noteOf(d) && <span style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 999, background: P.blueBg, color: P.blueFg }}>{t.noteTag}</span>}
                <span style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 999, background: P.chip, color: P.text3 }}>{names[d.loc]}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="fade-in" style={{ flex: 1, minWidth: 0, overflow: 'auto', padding: '18px 22px' }}>
        {dRec && dSc && (
          <div style={{ maxWidth: 820 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{supName(dSup, isAr)}</div>
                <div style={{ fontSize: 13.5, color: P.text3, marginTop: 3 }}><span dir="ltr">{dRec.invoiceNo}</span> · <span dir="ltr">{dateTime(dRec.ts, isAr)}</span> · <span dir="ltr">{dRec.id}</span> · <span dir="ltr">{dRec.lines.length}</span> {t.items} · <span dir="ltr">{money(dRec.total)}</span></div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, padding: '5px 13px', borderRadius: 999, background: dSc.bg, color: dSc.fg }}>{dSc.c}</span>
            </div>

            <div style={{ marginTop: 16, display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div style={{ width: 300, flex: 'none', background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '11px 15px', borderBottom: `1px solid ${P.border}`, background: P.thead, fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: P.text2 }}>{t.scannedInvoice}</div>
                {scanOf(dRec) ? (
                  <div style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 46, height: 58, borderRadius: 8, background: '#EAF0E4', border: '1px solid #B9CDB9', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#48603A" strokeWidth="1.7"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></svg>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600 }} dir="ltr">Invoice_{dRec.invoiceNo !== '—' ? dRec.invoiceNo : 'photo'}.jpg</div>
                      <div style={{ fontSize: 12, color: P.greenFg, marginTop: 2 }}>{t.attachedByReceiver}</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '18px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{t.noScanTitle}</div>
                    <div style={{ fontSize: 12, color: P.text3, marginTop: 4, lineHeight: 1.5 }}>{t.noScanBody}</div>
                  </div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {noteOf(dRec) && (
                  <div style={{ display: 'flex', gap: 10, padding: '13px 16px', borderRadius: 12, background: P.amberBg, border: `1px solid ${P.amberBorder}` }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: P.amberDot, flex: 'none', marginTop: 5 }} />
                    <div>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: P.amberFg }}>{t.receiverNoteFlag}</div>
                      <div style={{ fontSize: 13.5, color: P.amberFg, lineHeight: 1.5, marginTop: 2 }}>{noteOf(dRec)}</div>
                    </div>
                  </div>
                )}
                <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: '14px 16px', fontSize: 13, color: P.text2, lineHeight: 1.6 }}>{t.recDetail}</div>
                <button onClick={() => onReview(dRec)} style={{ alignSelf: 'flex-start', height: 46, padding: '0 22px', borderRadius: 11, border: 'none', background: P.ink, color: P.onInk, fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>{t.reviewInPipeline} {chevron}</button>
              </div>
            </div>
            <div style={{ fontSize: 12.5, color: '#5E665C', marginTop: 16, lineHeight: 1.6 }}>{t.ordersFoot}</div>
          </div>
        )}
      </div>
    </div>
  );
}
