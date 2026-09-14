import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLang } from '../../i18n/LangContext';
import { useStore, type Delivery } from '../../store';
import { Page, PageHeader, LocationSelector, Modal, ConfirmModal, Notice, Btn, Input, P, fmt, money, useToast } from '../../ui';
import { TEXT } from './text';
import { ensureSeed } from './seed';
import DeliveriesView from './views/DeliveriesView';
import PpvView from './views/PpvView';

interface Adjust { deliveryId: string; lineIdx: number; qty: string; reason: string }

/** Receiving Oversight — MGT-RCV-02 (deliveries) + MGT-RCV-03 (purchase price variance). */
export default function Receiving() {
  const { lang, isAr } = useLang();
  const t = TEXT[lang];
  const store = useStore();
  const toast = useToast();
  const [sp] = useSearchParams();
  const [tab, setTab] = useState<string>(sp.get('tab') === 'ppv' ? 'ppv' : 'del');
  const [openId, setOpenId] = useState<string | null>(sp.get('id') ?? 'DLV-0421');
  const [chartItem, setChartItem] = useState<string>(sp.get('item') ?? 'RM-014');
  const [adj, setAdj] = useState<Adjust | null>(null);
  const [approve, setApprove] = useState(false);

  useEffect(() => { ensureSeed(store); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const adjDelivery = adj ? store.state.deliveries.find((d) => d.id === adj.deliveryId) : undefined;
  const adjLine = adjDelivery && adj ? adjDelivery.lines[adj.lineIdx] : undefined;
  const adjQty = adj ? parseFloat(adj.qty) : NaN;
  const adjReady = !!adj && !!adjLine && adj.reason.trim().length > 0 && !Number.isNaN(adjQty) && adjQty >= 0 && adjQty !== adjLine.received;

  const requestApproval = () => {
    if (!adjReady) { toast(t.needAdjust); return; }
    toast(t.adjustToast);
    setApprove(true);
  };

  const applyAdjust = () => {
    if (!adj || !adjDelivery || !adjLine) return;
    const d = adjDelivery, line = adjLine;
    const newQty = adjQty;
    const delta = Math.round((newQty - line.received) * 1000) / 1000;
    const factor = line.received ? line.baseQty / line.received : (store.item(line.itemId)?.purchFactor ?? 1);
    const baseDelta = Math.round(delta * factor * 1000) / 1000;
    const valueDelta = Math.round(delta * line.unitPrice * 100) / 100;
    store.postMovement({
      itemId: line.itemId, loc: d.loc, type: 'adjustment', qty: baseDelta,
      enteredQty: Math.abs(delta), enteredUnit: line.unit,
      value: valueDelta,
      source: d.invoiceNo, sourceKind: 'adjustment', note: adj.reason.trim(),
    });
    // The posted delivery is immutable (t.immutableNote / t.adjustWarn): leave the line qty/base and
    // the delivery total at what was actually received. Only flag it 'adjusted' and surface the
    // correction as a matchIssue on the linked supplier invoice so the pipeline shows the credit/charge.
    store.update((dr) => {
      const dd = dr.deliveries.find((x) => x.id === d.id);
      if (dd) dd.status = 'adjusted';
      const inv = dr.invoices.find((i) => i.deliveryId === d.id);
      if (inv) {
        const issue = `${store.itemName(line.itemId, false)} received ${fmt(line.received)} → ${fmt(newQty)} ${line.unit} adjusted — ${money(Math.abs(valueDelta))} ${valueDelta < 0 ? 'credit note pending' : 'additional charge pending'}`;
        inv.matchIssues = [...(inv.matchIssues ?? []), issue];
      }
    });
    store.logAudit({
      action: 'Delivery line adjusted', entity: `${d.id} · ${store.itemName(line.itemId, false)} · ${d.invoiceNo}`,
      oldValue: `${fmt(line.received)} ${line.unit}`, newValue: `${fmt(newQty)} ${line.unit} — ${adj.reason.trim()}`, moduleId: 'receiving',
    });
    setApprove(false); setAdj(null);
    setOpenId(d.id);
    toast(t.adjustedToast);
  };

  const openAdjust = (d: Delivery) => setAdj({ deliveryId: d.id, lineIdx: 0, qty: '', reason: '' });

  return (
    <Page>
      <PageHeader title={t.title} screenId={tab === 'del' ? 'MGT-RCV-02' : 'MGT-RCV-03'} right={<LocationSelector />}
        tabs={Object.assign([{ value: 'del', label: t.deliveries }, { value: 'ppv', label: t.ppv }], { active: tab, onChange: setTab })} />
      {tab === 'del'
        ? <DeliveriesView openId={openId} setOpenId={setOpenId} onAdjust={openAdjust} />
        : <PpvView chartItem={chartItem} setChartItem={setChartItem} />}

      <Modal open={!!adj && !approve} onClose={() => setAdj(null)} title={t.adjustLine} sub={t.adjustBody}
        footer={<><Btn size="lg" variant="ghost" style={{ flex: 1 }} onClick={() => setAdj(null)}>{t.cancel}</Btn><Btn size="lg" variant="primary" style={{ flex: 1.4, fontWeight: 700 }} onClick={requestApproval}>{t.requestApproval}</Btn></>}>
        {adj && adjDelivery && (
          <div>
            <div style={{ fontSize: 11.5, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px' }}>{t.adjLine}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {adjDelivery.lines.map((l, i) => {
                const on = i === adj.lineIdx;
                return <button key={i} onClick={() => setAdj({ ...adj, lineIdx: i, qty: '' })} style={{ height: 32, padding: '0 12px', borderRadius: 8, border: `1px solid ${on ? P.ink : P.borderInput}`, background: on ? P.ink : P.white, color: on ? P.onInk : P.text2, fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{i + 1}. {store.itemName(l.itemId, isAr)} <span dir="ltr" style={{ opacity: .75 }}>· {fmt(l.received)} {l.unit}</span></button>;
              })}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <div>
                <div style={{ fontSize: 11.5, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px' }}>{t.adjNewQty}</div>
                <Input ltr width={150} type="number" value={adj.qty} onChange={(v) => setAdj({ ...adj, qty: v })} placeholder={adjLine ? `${fmt(adjLine.received)} ${adjLine.unit}` : ''} style={{ height: 44, marginTop: 6, fontSize: 14 }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11.5, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px' }}>{t.adjReason}</div>
                <Input width="100%" value={adj.reason} onChange={(v) => setAdj({ ...adj, reason: v })} placeholder={t.adjustPh} style={{ height: 44, marginTop: 6, fontSize: 14 }} />
              </div>
            </div>
            <Notice tone="amber" style={{ marginTop: 14 }}>{t.adjustWarn}</Notice>
          </div>
        )}
      </Modal>

      <ConfirmModal open={approve} onCancel={() => setApprove(false)} onConfirm={applyAdjust} title={t.approveTitle} cta={t.approveCta}
        body={adjLine ? <span dir="ltr">{adjDelivery?.invoiceNo} · {store.itemName(adjLine.itemId, isAr)} · {fmt(adjLine.received)} → {fmt(adjQty)} {adjLine.unit}</span> : undefined}>
        <div style={{ fontSize: 13, color: P.text2, lineHeight: 1.55 }}>{t.approveBody}</div>
      </ConfirmModal>
    </Page>
  );
}
