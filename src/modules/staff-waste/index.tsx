import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLang, LOC_NAMES } from '../../i18n/LangContext';
import { useStore } from '../../store';
import type { WasteStatus } from '../../store';
import { D, KEYS, appendKey, money, fmt } from '../../ui';
import { uploadAttachment, canUpload } from '../../data/storage';
import { TEXT, ROLE_LABELS } from './text';
import { buildProducts, stationLoc } from './data';

type Step = 'product' | 'qty' | 'reason' | 'done';

interface DoneInfo { status: WasteStatus; qty: number; unit: string; cost: number; id: string }

export default function StaffWasteModule() {
  const { lang, isAr, backGlyph } = useLang();
  const t = TEXT[lang];
  const store = useStore();

  const staffId = store.state.settings.staffUser;
  const staff = store.state.users.find((u) => u.id === staffId);
  const loc = stationLoc(staff);
  const userLabel = staff ? `${isAr ? staff.nameAr : staff.name} · ${(ROLE_LABELS[staff.role] ?? [staff.role, staff.role])[isAr ? 1 : 0]}` : t.user;

  const products = useMemo(() => buildProducts(store.state.items, loc), [store.state.items, loc]);

  const [step, setStep] = useState<Step>('product');
  const [prodIdx, setProdIdx] = useState<number | null>(null);
  const [qtyBuf, setQtyBuf] = useState('');
  const [reason, setReason] = useState<string | null>(null);
  const [photo, setPhoto] = useState(false);
  // Real uploads (cloud mode only): the captured file, its local preview URL, and async state.
  const cloud = canUpload();
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [startTs, setStartTs] = useState<number | null>(null);
  const [doneSecs, setDoneSecs] = useState<number | null>(null);
  const [done, setDone] = useState<DoneInfo | null>(null);
  // batch/plan id carried in the deep link from the production tablet (?ref=…)
  const [batchRef, setBatchRef] = useState<string | null>(null);

  // live ⏱ timer while entering
  const [, tick] = useState(0);
  useEffect(() => {
    if (step !== 'qty' && step !== 'reason') return;
    const id = window.setInterval(() => tick((x) => x + 1), 1000);
    return () => window.clearInterval(id);
  }, [step]);

  const prod = prodIdx !== null ? products[prodIdx] : products[0];
  const un = prod ? (isAr ? prod.unitAr : prod.unit) : '';
  const qty = parseFloat(qtyBuf) || 0;
  const cost = prod ? qty * prod.cost : 0;
  const threshold = store.state.settings.wasteAutoApproveUsd;
  const elapsed = startTs ? Math.round((Date.now() - startTs) / 1000) : 0;
  const timerLabel = step !== 'product' && step !== 'done' && startTs ? `⏱ ${elapsed}s` : '';

  // Release the preview object URL and reset all photo state.
  const clearPhoto = () => {
    setPhotoPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    setPhotoFile(null); setUploadErr(null); setUploading(false);
  };

  const onPickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setUploadErr(null);
    setPhotoPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return f ? URL.createObjectURL(f) : null; });
    setPhotoFile(f);
  };

  const pickProduct = (i: number) => {
    setProdIdx(i); setQtyBuf(''); setReason(null); setPhoto(false); clearPhoto();
    setStartTs((s) => s || Date.now());
    setStep('qty');
  };

  // deep link from the production tablet (stage waste): ?item=RM-001 pre-selects the product,
  // ?ref=BATCH-… (batch/plan id) is carried through as the waste record's batch linkage
  const [sp] = useSearchParams();
  const spItem = sp.get('item');
  const spRef = sp.get('ref');
  useEffect(() => {
    if (!spItem) return;
    const i = products.findIndex((p) => p.item.id === spItem);
    if (i >= 0 && step === 'product') { pickProduct(i); setBatchRef(spRef); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spItem, spRef, products.length]);

  const submit = async () => {
    if (!reason || !prod || !qty || uploading) return;
    // Cloud mode: upload the captured photo first so its URL is saved on the record.
    let photoUrl: string | undefined;
    let photoFlag = photo;
    if (cloud && photoFile) {
      setUploading(true); setUploadErr(null);
      try {
        const url = await uploadAttachment('waste-photos', photoFile);
        photoUrl = url ?? undefined;
        photoFlag = true;
      } catch {
        setUploadErr(t.uploadError);
        setUploading(false);
        return;
      }
      setUploading(false);
    }
    const c = Math.round(cost * 100) / 100;
    const status: WasteStatus = c <= threshold ? 'auto' : 'pending';
    const id = store.nextId('WST');
    const ts = store.now();
    const baseQty = Math.round(qty * prod.factor * 1000) / 1000;
    const itemId = prod.item.id;
    store.update((d) => { d.waste.push({ id, ts, itemId, loc, qty, unit: prod.unit, baseQty, cost: c, reason, employee: staffId, status, photo: photoFlag, photoUrl, note: batchRef ?? undefined }); });
    if (status === 'auto') {
      store.postMovement({ ts, type: 'waste', itemId, loc, qty: -baseQty, enteredQty: qty, enteredUnit: prod.unit, value: -c, source: id, sourceKind: 'waste', user: staffId, note: batchRef ?? undefined });
    } else {
      store.addAlert({ ts, severity: 'amber', type: 'waste_pending', loc, moduleId: 'waste',
        en: `Waste ${id} awaiting approval (${money(c)}) — ${prod.item.en} ${fmt(qty)} ${prod.unit}`,
        ar: `هدر ${id} بانتظار الموافقة (${money(c)}) — ${prod.item.ar} ${fmt(qty)} ${prod.unitAr}` });
    }
    store.logAudit({ user: staffId, action: status === 'auto' ? 'Waste auto-approved' : 'Waste submitted for approval', entity: `${id} · ${prod.item.en} ${fmt(qty)} ${prod.unit}`, newValue: `${status === 'auto' ? '−' : ''}${money(c)} at cost`, moduleId: 'staff-waste' });
    setDone({ status, qty, unit: un, cost: c, id });
    setDoneSecs(elapsed);
    setStep('done');
  };

  const resetAll = () => { setStep('product'); setProdIdx(null); setQtyBuf(''); setReason(null); setPhoto(false); clearPhoto(); setStartTs(null); setDoneSecs(null); setDone(null); setBatchRef(null); };

  const highValue = done ? done.status === 'pending' : false;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, color: D.text }}>
      {/* sub-header: screen id · timer · station · user */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 24px', borderBottom: `1px solid ${D.headerBorder}`, flex: 'none' }}>
        <span style={{ fontSize: 12, padding: '3px 9px', borderRadius: 999, background: D.headerBorder, color: D.muted }}>STF-WST-01</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 14, color: D.dim, minWidth: 54 }} dir="ltr">{timerLabel}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 999, border: `1px solid ${D.border3}`, background: D.card, fontSize: 15, color: D.text2 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: D.greenDot, display: 'inline-block' }} />{LOC_NAMES[lang][loc]}
        </div>
        <div style={{ fontSize: 15, color: D.muted }}>{userLabel}</div>
      </div>

      {step === 'product' && (
        <div className="fade-in" style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 16, color: D.muted }}>{t.pickProduct}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 10 }}>
            {products.map((p, i) => (
              <button key={p.item.id} className="tile-hover" onClick={() => pickProduct(i)} style={{ textAlign: 'start', border: `1px solid ${D.border}`, background: D.card, borderRadius: 16, padding: '16px 18px', cursor: 'pointer', fontFamily: 'inherit', color: D.text, minHeight: 88 }}>
                <div style={{ fontSize: 17, fontWeight: 700 }}>{isAr ? p.item.ar : p.item.en}</div>
                <div style={{ fontSize: 13.5, color: D.muted, marginTop: 3 }}>{isAr ? p.item.en : p.item.ar} · {isAr ? p.unitAr : p.unit}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'qty' && prod && (
        <div className="fade-in" style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '28px 32px', gap: 16, minWidth: 0 }}>
            <div>
              <div style={{ fontSize: 16, color: D.muted }}>{t.wasting}</div>
              <div style={{ fontSize: 30, fontWeight: 700, marginTop: 4 }}>{isAr ? prod.item.ar : prod.item.en}</div>
              <div style={{ fontSize: 16, color: D.muted, marginTop: 4 }}>{isAr ? prod.item.en : prod.item.ar}</div>
            </div>
            <div style={{ border: `1px solid ${D.border2}`, background: D.card3, borderRadius: 20, padding: '20px 24px' }}>
              <div style={{ fontSize: 15, color: D.muted }}>{t.qty}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 4 }}>
                <div style={{ fontSize: 56, fontWeight: 700, color: qtyBuf ? D.text : D.dim }} dir="ltr">{qtyBuf || '0'}</div>
                <div style={{ fontSize: 22, color: D.muted }}>{un}</div>
              </div>
              <div style={{ fontSize: 14, color: D.dim, marginTop: 4 }} dir="ltr">{prod.base}</div>
            </div>
            <div style={{ fontSize: 15, color: D.dim, minHeight: 20 }} dir="ltr">{qty ? `≈ ${money(cost)} ${t.atCost}` : ''}</div>
            <button onClick={() => setStep('product')} style={{ alignSelf: 'flex-start', height: 48, padding: '0 18px', borderRadius: 12, border: `1px solid ${D.border3}`, background: 'transparent', color: D.muted, fontSize: 16, fontFamily: 'inherit', cursor: 'pointer' }}>{backGlyph} {t.changeProduct}</button>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '28px 32px', gap: 14, borderInlineStart: `1px solid ${D.headerBorder}`, background: '#141714' }}>
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, minHeight: 0 }} dir="ltr">
              {KEYS.map((k) => (
                <button key={k} onClick={() => setQtyBuf((b) => appendKey(b, k, 6))} style={{ borderRadius: 16, border: `1px solid ${D.border2}`, background: D.key, color: D.text, fontSize: 30, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', minHeight: 64 }}>{k}</button>
              ))}
            </div>
            <button onClick={() => { if (qtyBuf && qty > 0) setStep('reason'); }} style={{ height: 72, borderRadius: 18, border: 'none', background: qtyBuf && qty > 0 ? D.cream : D.disabled, color: D.onCream, fontSize: 22, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', flex: 'none' }}>{t.next}</button>
          </div>
        </div>
      )}

      {step === 'reason' && prod && (
        <div className="fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '20px 24px', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{t.whyWasted}</div>
            <div style={{ fontSize: 16, color: D.muted }} dir="ltr">{fmt(qty)} {un} · ≈ {money(cost)}</div>
            <div style={{ flex: 1 }} />
            <button onClick={() => setStep('qty')} style={{ height: 44, padding: '0 16px', borderRadius: 12, border: `1px solid ${D.border3}`, background: 'transparent', color: D.muted, fontSize: 15, fontFamily: 'inherit', cursor: 'pointer' }}>{backGlyph} {t.back}</button>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 10, alignContent: 'start' }}>
            {t.reasons.map(([key, label, glyph]) => {
              const on = reason === key;
              return (
                <button key={key} onClick={() => setReason(key)} style={{ border: `1px solid ${on ? D.cream : D.border}`, background: on ? D.chip : D.card, borderRadius: 16, padding: '18px 16px', cursor: 'pointer', fontFamily: 'inherit', color: D.text, textAlign: 'start', minHeight: 92 }}>
                  <div style={{ fontSize: 26, lineHeight: 1 }}>{glyph}</div>
                  <div style={{ fontSize: 16.5, fontWeight: 700, marginTop: 8 }}>{label}</div>
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 'none', flexWrap: 'wrap' }}>
            {cloud ? (
              <>
                {photoPreview && (
                  <img src={photoPreview} alt="" style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover', border: `1px solid ${D.border3}`, flex: 'none' }} />
                )}
                <label style={{ height: 56, padding: '0 20px', borderRadius: 14, border: `1px solid ${photoFile ? D.greenBorder : D.border3}`, background: photoFile ? D.greenBg : 'transparent', color: photoFile ? D.greenFg : D.muted, fontSize: 16, fontWeight: 600, fontFamily: 'inherit', cursor: uploading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 10, opacity: uploading ? 0.6 : 1 }}>
                  <input type="file" accept="image/*" capture="environment" onChange={onPickPhoto} disabled={uploading} style={{ display: 'none' }} />
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="7" width="18" height="13" rx="2" /><circle cx="12" cy="13" r="4" /><path d="M8 7l1.5-3h5L16 7" /></svg>
                  {photoFile ? t.photoAdded : t.addPhoto}
                </label>
                {uploading && <span style={{ fontSize: 15, color: D.muted }}>{t.uploading}</span>}
                {uploadErr && <span style={{ fontSize: 15, color: D.redFg }}>{uploadErr}</span>}
              </>
            ) : (
              <button onClick={() => setPhoto((p) => !p)} style={{ height: 56, padding: '0 20px', borderRadius: 14, border: `1px solid ${photo ? D.greenBorder : D.border3}`, background: photo ? D.greenBg : 'transparent', color: photo ? D.greenFg : D.muted, fontSize: 16, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="7" width="18" height="13" rx="2" /><circle cx="12" cy="13" r="4" /><path d="M8 7l1.5-3h5L16 7" /></svg>
                {photo ? t.photoAdded : t.addPhoto}
              </button>
            )}
            <div style={{ flex: 1 }} />
            <button onClick={submit} disabled={uploading} style={{ height: 64, padding: '0 40px', borderRadius: 16, border: 'none', background: reason && !uploading ? D.cream : D.disabled, color: D.onCream, fontSize: 20, fontWeight: 700, fontFamily: 'inherit', cursor: uploading ? 'default' : 'pointer' }}>{uploading ? t.uploading : t.submit}</button>
          </div>
        </div>
      )}

      {step === 'done' && done && (
        <div className="fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: 40 }}>
          <div style={{ width: 96, height: 96, borderRadius: '50%', background: highValue ? D.amberChip : D.greenBg, border: `1px solid ${highValue ? D.amberBorder : D.greenBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {!highValue && <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={D.greenFg} strokeWidth="2.4"><path d="M4 12.5l5 5L20 6.5" /></svg>}
            {highValue && <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={D.gold} strokeWidth="2.2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></svg>}
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, textAlign: 'center' }}>{highValue ? t.donePending : t.doneAuto}</div>
          <div style={{ fontSize: 18, color: D.muted, textAlign: 'center', maxWidth: 520, lineHeight: 1.5 }}>
            <span dir="ltr">{fmt(done.qty)} {done.unit} · {money(done.cost)}</span> — {highValue ? t.pendingBody : t.autoBody}
          </div>
          <div style={{ fontSize: 15, color: D.dim }} dir="ltr">{doneSecs !== null ? `⏱ ${doneSecs}s` : ''} · {done.id}</div>
          <button onClick={resetAll} style={{ marginTop: 10, height: 60, padding: '0 32px', borderRadius: 16, border: `1px solid ${D.border3}`, background: D.card, color: D.text, fontSize: 19, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{t.another}</button>
        </div>
      )}
    </div>
  );
}
