import React from 'react';
import { useLang, LOC_NAMES } from '../../../i18n/LangContext';
import { useStore, type PurchaseOrder, type POStatus } from '../../../store';
import { P, money, fmt, shortDate } from '../../../ui';
import { TEXT } from '../text';
import { PO_NOTES_AR } from '../seed';
import { dateTime, supName } from '../../receiving/data';

interface Props {
  poId: string | null; setPoId: (id: string) => void;
  onCreate: () => void; onEdit: (po: PurchaseOrder) => void; onSend: (po: PurchaseOrder) => void; onCancel: (po: PurchaseOrder) => void;
  onReceive: (po: PurchaseOrder) => void; onInvoice: (po: PurchaseOrder) => void;
}

const btn = (primary?: boolean): React.CSSProperties => ({ height: 40, padding: '0 18px', borderRadius: 10, border: primary ? 'none' : `1px solid ${P.borderInput}`, background: primary ? P.ink : P.white, color: primary ? P.onInk : P.text2, fontSize: 13.5, fontWeight: primary ? 700 : 600, fontFamily: 'inherit', cursor: 'pointer' });

/** MGT-PUR-01 — purchase-order requests: list + detail with the requested → sent → received → invoiced chain. */
export default function OrdersView({ poId, setPoId, onCreate, onEdit, onSend, onCancel, onReceive, onInvoice }: Props) {
  const { lang, isAr, chevron } = useLang();
  const t = TEXT[lang];
  const store = useStore();
  const st = store.state;
  const names = LOC_NAMES[lang];

  const stChip = (s: POStatus) =>
    s === 'draft' ? { c: t.requested, bg: '#E4DFCE', fg: '#6E7266' }
    : s === 'sent' ? { c: t.sent, bg: '#DCE4EC', fg: '#37536B' }
    : s === 'partial' ? { c: t.partial, bg: '#DCE4EC', fg: '#37536B' }
    : s === 'received' ? { c: t.received, bg: '#E0E8DA', fg: '#48603A' }
    : s === 'closed' ? { c: t.invoiced, bg: '#F5E3B3', fg: '#8A6D1F' }
    : { c: t.cancelled, bg: '#F0CFC9', fg: '#96382E' };
  const stageOf = (s: POStatus) => (s === 'draft' ? 0 : s === 'sent' || s === 'partial' ? 1 : s === 'received' ? 2 : s === 'closed' ? 3 : -1);

  const orders = st.purchaseOrders.filter((po) => store.inScope(po.loc)).slice().sort((a, b) => b.ts.localeCompare(a.ts));
  const dPo = orders.find((p) => p.id === poId) ?? orders[0];
  const dSup = dPo ? st.suppliers.find((s) => s.id === dPo.supplierId) : undefined;
  const dChip = dPo ? stChip(dPo.status) : null;
  const curStage = dPo ? stageOf(dPo.status) : 0;
  const linkedInvoice = dPo ? (st.invoices.find((i) => i.poId === dPo.id) ?? st.invoices.find((i) => { const d = st.deliveries.find((x) => x.poId === dPo.id); return !!d && i.deliveryId === d.id; })) : undefined;
  const linkedDelivery = dPo ? st.deliveries.find((x) => x.poId === dPo.id) : undefined;
  const noteOf = (po: PurchaseOrder) => (po.note ? (isAr && PO_NOTES_AR[po.id] ? PO_NOTES_AR[po.id] : po.note) : '');
  const poTotal = (po: PurchaseOrder) => po.lines.reduce((a, l) => a + l.qty * l.price, 0);

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
      <div style={{ width: 300, flex: 'none', borderInlineEnd: `1px solid ${P.border}`, background: P.thead, overflow: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button onClick={onCreate} style={{ height: 40, borderRadius: 9, border: 'none', background: P.ink, color: P.onInk, fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', flex: 'none' }}>＋ {t.newOrder}</button>
        {orders.length === 0 && <div style={{ padding: '22px 8px', textAlign: 'center', color: P.text4, fontSize: 13 }}>{t.noOrders}</div>}
        {orders.map((po) => {
          const sup = st.suppliers.find((s) => s.id === po.supplierId);
          const sc = stChip(po.status), on = dPo?.id === po.id;
          return (
            <button key={po.id} onClick={() => setPoId(po.id)} style={{ textAlign: 'start', border: `1px solid ${on ? '#4A5348' : P.border}`, background: on ? P.card : P.surface, borderRadius: 12, padding: '12px 14px', cursor: 'pointer', fontFamily: 'inherit', color: P.text }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, flex: 1 }}>{supName(sup, isAr)}</span>
                <span style={{ fontSize: 10.5, padding: '2px 9px', borderRadius: 999, background: sc.bg, color: sc.fg, fontWeight: 600 }}>{sc.c}</span>
              </div>
              <div style={{ fontSize: 11.5, color: P.text3, marginTop: 3 }}><span dir="ltr">{po.id}</span> · <span dir="ltr">{shortDate(po.ts, isAr)}</span> · <span dir="ltr">{po.lines.length}</span> {t.items} · <span dir="ltr">{money(poTotal(po))}</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 7 }}>
                <span style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 999, background: P.chip, color: P.text3 }}>{names[po.loc]}</span>
                {po.note && <span style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 999, background: P.blueBg, color: P.blueFg }}>{t.noteTag}</span>}
              </div>
            </button>
          );
        })}
      </div>

      <div className="fade-in" style={{ flex: 1, minWidth: 0, overflow: 'auto', padding: '18px 22px' }}>
        {dPo && dChip && (
          <div style={{ maxWidth: 820 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{supName(dSup, isAr)}</div>
                <div style={{ fontSize: 13.5, color: P.text3, marginTop: 3 }}><span dir="ltr">{dPo.id}</span> · <span dir="ltr">{dateTime(dPo.ts, isAr)}</span> · {names[dPo.loc]}{dPo.expected ? <> · {t.expected} <span dir="ltr">{shortDate(dPo.expected, isAr)}</span></> : ''} · {t.createdBy} {store.userName(dPo.createdBy, isAr)}</div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, padding: '5px 13px', borderRadius: 999, background: dChip.bg, color: dChip.fg }}>{dChip.c}</span>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              {[t.requested, t.sent, t.received, t.invoiced].map((lab, i) => {
                const done = i <= curStage;
                const cur = i === curStage;
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, background: cur ? P.hover : 'transparent', border: `1px solid ${cur ? '#B7C0AE' : P.chip}` }}>
                    <span style={{ width: 22, height: 22, borderRadius: '50%', background: done ? P.ink : P.chip, color: done ? P.onInk : P.text4, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{i < curStage ? '✓' : i + 1}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: done ? P.text : P.text4 }}>{lab}</span>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 16, border: `1px solid ${P.border}`, borderRadius: 12, background: P.card, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 110px 110px', gap: 10, padding: '9px 16px', fontSize: 11, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: `1px solid ${P.border}`, background: P.thead }}>
                <div>{t.item}</div><div style={{ textAlign: 'end' }}>{t.qty}</div><div style={{ textAlign: 'end' }}>{t.estPrice}</div><div style={{ textAlign: 'end' }}>{t.estTotal}</div>
              </div>
              {dPo.lines.map((l, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 110px 110px', gap: 10, padding: '9px 16px', fontSize: 13, borderBottom: `1px solid ${P.borderRow}`, alignItems: 'center' }}>
                  <div><div style={{ fontWeight: 600 }}>{store.itemName(l.itemId, isAr)}</div><div style={{ fontSize: 11, color: P.text4 }} dir="ltr">{money(l.price)} / {l.unit}</div></div>
                  <div style={{ textAlign: 'end' }} dir="ltr">{fmt(l.qty)} {l.unit}{l.received != null ? <span style={{ fontSize: 11, color: l.received >= l.qty ? P.greenFg : P.amberFg, display: 'block' }}>{t.recv} {fmt(l.received)}</span> : null}</div>
                  <div style={{ textAlign: 'end' }} dir="ltr">{money(l.price)}</div>
                  <div style={{ textAlign: 'end', fontWeight: 700 }} dir="ltr">{money(l.qty * l.price)}</div>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 16px', background: P.hover }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{t.estTotal}</span>
                <span style={{ fontSize: 15, fontWeight: 700 }} dir="ltr">{money(poTotal(dPo))}</span>
              </div>
            </div>

            {dPo.note && (
              <div style={{ display: 'flex', gap: 10, padding: '13px 16px', borderRadius: 12, background: P.amberBg, border: `1px solid ${P.amberBorder}`, marginTop: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: P.amberDot, flex: 'none', marginTop: 5 }} />
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: P.amberFg }}>{t.receiverNoteLabel} · {t.seenOnTablet}</div>
                  <div style={{ fontSize: 13.5, color: P.amberFg, lineHeight: 1.5, marginTop: 2 }}>{noteOf(dPo)}</div>
                </div>
              </div>
            )}

            {linkedDelivery && (
              <div style={{ fontSize: 12.5, color: P.text3, marginTop: 12 }}>{t.delivery}: <span dir="ltr">{linkedDelivery.id}</span> · <span dir="ltr">{linkedDelivery.invoiceNo}</span> · <span dir="ltr">{money(linkedDelivery.total)}</span></div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
              {dPo.status === 'draft' && <button onClick={() => onSend(dPo)} style={btn(true)}>{t.sendOrder} {chevron}</button>}
              {dPo.status === 'draft' && <button onClick={() => onEdit(dPo)} style={btn()}>{t.editOrder}</button>}
              {(dPo.status === 'sent' || dPo.status === 'partial') && <button onClick={() => onReceive(dPo)} style={btn(true)}>{t.logOnTablet} {chevron}</button>}
              {(dPo.status === 'received' || dPo.status === 'closed') && linkedInvoice && <button onClick={() => onInvoice(dPo)} style={btn(true)}>{t.viewInvoice} {chevron}</button>}
              {(dPo.status === 'draft' || dPo.status === 'sent') && <button onClick={() => onCancel(dPo)} style={{ ...btn(), color: P.redFg }}>{t.cancelOrder}</button>}
            </div>
            <div style={{ fontSize: 12.5, color: '#5E665C', marginTop: 16, lineHeight: 1.6 }}>{t.ordersFoot}</div>
          </div>
        )}
      </div>
    </div>
  );
}
