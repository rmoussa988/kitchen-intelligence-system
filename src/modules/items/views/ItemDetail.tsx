import { useLang, LOC_NAMES } from '../../../i18n/LangContext';
import type { Item } from '../../../store';
import { useStore } from '../../../store';
import { Btn, Field, Page, ScreenId, Tabs, TYPE_STYLE, P, money } from '../../../ui';
import { TEXT } from '../text';
import type { ConvRow, ItemDetail as Detail } from '../data';

export type TabKey = 'general' | 'units' | 'costing' | 'inv' | 'recipe' | 'pos';
export const TAB_KEYS: TabKey[] = ['general', 'units', 'costing', 'inv', 'recipe', 'pos'];
export function tabsFor(item: Item): TabKey[] {
  return (['general', 'units', 'costing'] as TabKey[]).concat(item.type === 'menu' ? ['recipe', 'pos'] : item.isRecipe ? ['inv', 'recipe'] : ['inv']);
}

export interface ConvView extends ConvRow { idx: number; overridden: boolean; liveFactor: number; liveRule: string; liveEff: string }

const CONV_COLS = 'minmax(170px,1.6fr) 78px minmax(110px,1fr) 96px 60px';
const FREQ_STYLE = { daily: [P.greenBg, P.greenFg], weekly: ['#DDE3EC', P.blueFg], monthly: [P.greyBg, P.greyFg] } as const;

export function ItemDetailView({ item, detail, convRows, tab, setTab, onBack, onEdit, onAddConv, onOpenRecipe }: {
  item: Item; detail: Detail; convRows: ConvView[]; tab: TabKey; setTab: (t: TabKey) => void;
  onBack: () => void; onEdit: (cv: ConvView) => void; onAddConv: () => void; onOpenRecipe: () => void;
}) {
  const { lang, isAr, fwdGlyph, backGlyph } = useLang();
  const t = TEXT[lang];
  const store = useStore();
  const nm = (o: Item) => (isAr ? o.ar : o.en);
  const nmAlt = (o: Item) => (isAr ? o.en : o.ar);
  const cat = (o: Item) => (isAr ? (o.catAr || o.cat) : o.cat);
  const dts = TYPE_STYLE[item.type];
  const tabKeys = tabsFor(item);
  const dCost = `${money(item.cost, { max: 3 })} / ${item.base}`;
  const screenId = tab === 'units' ? 'MGT-ITM-03' : 'MGT-ITM-02';
  const supplier = item.supplier ? store.supplierName(item.supplier) : '—';

  const missingUnit = detail.roles.find((r) => r[2] === 'warn');
  const convWarning = missingUnit ? `${missingUnit[1]}${t.convWarnA}${item.base}${t.convWarnB}` : '';

  const generalFields = [
    { label: t.general.codeL, value: item.id, ltr: true },
    { label: t.general.typeL, value: t.types[item.type] },
    { label: t.general.nameEn, value: item.en },
    { label: t.general.nameAr, value: item.ar },
    { label: t.general.catL, value: cat(item) },
    { label: t.general.supL, value: supplier },
    { label: t.general.active, value: t.yes },
    { label: t.general.barcode, value: 'QR-' + item.id, ltr: true },
  ];
  const minMax = item.min != null && item.max != null ? `${item.min} ${item.base} / ${item.max} ${item.base}` : '— / —';

  return (
    <Page>
      <div style={{ flex: 'none', padding: '16px 22px 0', background: P.surface, borderBottom: `1px solid ${P.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Btn size="sm" onClick={onBack}>{backGlyph} {t.items}</Btn>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 21, fontWeight: 700 }}>{nm(item)}</div>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999, background: dts.bg, color: dts.fg }}>{t.types[item.type]}</span>
              {item.incomplete && <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 999, background: P.amberPill, color: P.amberFg, fontWeight: 600 }}>{t.incomplete}</span>}
              <ScreenId id={screenId} />
            </div>
            <div style={{ fontSize: 13, color: P.text3, marginTop: 2 }}>{nmAlt(item)} · <span dir="ltr">{item.id}</span></div>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ textAlign: 'end' }}>
            <div style={{ fontSize: 11.5, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px' }}>{t.movingAvg}</div>
            <div style={{ fontSize: 19, fontWeight: 700 }} dir="ltr">{dCost}</div>
          </div>
        </div>
        <Tabs style={{ marginTop: 14 }} active={tab} onChange={(v) => setTab(v as TabKey)} tabs={tabKeys.map((k) => ({ value: k, label: t.tabs[k] }))} />
      </div>

      <div key={tab} className="fade-in" style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '20px 22px' }}>
        {tab === 'general' && (
          <>
            <div style={{ maxWidth: 720, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {generalFields.map((gf) => <Field key={gf.label} label={gf.label} value={gf.value} ltr={gf.ltr} />)}
            </div>
            <div style={{ marginTop: 14, fontSize: 12.5, color: P.text4 }}>{t.auditNote}</div>
          </>
        )}

        {tab === 'units' && (
          <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: 1.4, minWidth: 560, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: P.text2, marginBottom: 8 }}>{t.unitRoles}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                  {detail.roles.map((r) => {
                    const warn = r[2] === 'warn';
                    const border = warn ? P.amberBorder : r[0] === 'base' ? P.inkMuted : P.border;
                    return (
                      <div key={r[0]} style={{ background: P.card, border: `1px solid ${border}`, borderRadius: 10, padding: '10px 12px' }}>
                        <div style={{ fontSize: 11, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px' }}>{t.roles[r[0]]}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                          <span style={{ fontSize: 16, fontWeight: 700 }} dir="ltr">{r[1]}</span>
                          {r[2] === 'auto' && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: P.chip, color: P.text3 }}>{t.auto}</span>}
                        </div>
                        {warn && <div style={{ fontSize: 11, color: P.amberFg, marginTop: 4 }}>{t.noPath}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: P.text2 }}>{t.conversions}</div>
                  <div style={{ flex: 1 }} />
                  <button onClick={onAddConv} style={{ height: 32, padding: '0 12px', borderRadius: 8, border: `1px solid ${P.borderInput}`, background: P.white, color: P.text2, fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>＋ {t.addConversion}</button>
                </div>
                <div style={{ border: `1px solid ${P.border}`, borderRadius: 12, background: P.card, overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: CONV_COLS, gap: 10, padding: '9px 14px', fontSize: 11, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: `1px solid ${P.border}`, background: P.thead }}>
                    <div>{t.convRule}</div><div>{t.type}</div><div>{t.resolved}</div><div>{t.effective}</div><div />
                  </div>
                  {convRows.map((cv) => {
                    const density = cv.kind === 'density';
                    return (
                      <div key={cv.idx} style={{ display: 'grid', gridTemplateColumns: CONV_COLS, gap: 10, padding: '11px 14px', fontSize: 13, borderBottom: `1px solid ${P.borderRow}`, alignItems: 'center', background: density ? '#F6F7F4' : 'transparent' }}>
                        <div>
                          <div style={{ fontWeight: 600, whiteSpace: 'nowrap' }} dir="ltr">{cv.liveRule}</div>
                          {cv.sub && <div style={{ fontSize: 11.5, color: P.text4, marginTop: 2 }} dir="ltr">{cv.sub}</div>}
                        </div>
                        <div><span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: density ? '#DDE3EC' : P.greenBg, color: density ? P.blueFg : P.greenFg }}>{density ? t.density : t.fixed}</span></div>
                        <div style={{ color: P.text2 }} dir="ltr">{cv.resolved}</div>
                        <div style={{ color: P.text3, fontSize: 12 }} dir="ltr">{cv.liveEff}</div>
                        <div style={{ textAlign: 'end' }}>
                          <button onClick={() => onEdit(cv)} style={{ height: 28, padding: '0 10px', borderRadius: 7, border: `1px solid ${P.borderInput}`, background: P.white, color: P.text2, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer' }}>{t.edit}</button>
                        </div>
                      </div>
                    );
                  })}
                  {convRows.length === 0 && (convWarning ? (
                    <div style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 10, background: P.amberBg }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: P.amberDot, flex: 'none' }} />
                      <span style={{ fontSize: 13, color: P.amberFg, fontWeight: 600 }}>{convWarning}</span>
                    </div>
                  ) : (
                    // complete item with nothing to convert (base resolves 1 : 1) — neutral empty row, not a warning
                    <div style={{ padding: 24, textAlign: 'center', color: P.text4, fontSize: 13 }}>—</div>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: P.text4, marginTop: 8 }}>{t.versionNote}</div>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 320, position: 'sticky', top: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ background: P.ink, color: P.page, borderRadius: 14, padding: '16px 18px' }}>
                <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.5px', color: P.inkMuted }}>{t.liveResolution}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                  {detail.resolution.map((rr, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13.5, borderBottom: `1px solid ${P.inkBorder}`, paddingBottom: 8 }}>
                      <span style={{ color: P.inkText }} dir="ltr">{rr[0]}</span>
                      <span style={{ fontWeight: 700 }} dir="ltr">{rr[1]}</span>
                    </div>
                  ))}
                </div>
                {detail.stockEx && (
                  <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: P.ink2 }}>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.5px', color: P.inkMuted }}>{t.stockExample}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginTop: 6, lineHeight: 1.5 }} dir="ltr">{detail.stockEx}</div>
                  </div>
                )}
              </div>
              {detail.costEx && (
                <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: '16px 18px' }}>
                  <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.5px', color: P.text3 }}>{t.costIllustration}</div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.7, marginTop: 8, color: P.text, whiteSpace: 'pre-line' }} dir="ltr">{detail.costEx}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'costing' && (
          <div style={{ maxWidth: 680 }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1, background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: 11.5, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px' }}>{t.movingAvg}</div>
                <div style={{ fontSize: 24, fontWeight: 700, marginTop: 2 }} dir="ltr">{dCost}</div>
              </div>
              <div style={{ flex: 1, background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: 11.5, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px' }}>{t.lastReceipt}</div>
                <div style={{ fontSize: 16, fontWeight: 600, marginTop: 6 }} dir="ltr">{detail.lastReceipt}</div>
              </div>
            </div>
            <div style={{ border: `1px solid ${P.border}`, borderRadius: 12, background: P.card, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 110px 110px', gap: 10, padding: '9px 14px', fontSize: 11, color: P.text3, textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: `1px solid ${P.border}`, background: P.thead }}>
                <div>{t.date}</div><div>{t.event}</div><div style={{ textAlign: 'end' }}>{t.receiptCost}</div><div style={{ textAlign: 'end' }}>{t.newAvg}</div>
              </div>
              {detail.hist.map((h, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 110px 110px', gap: 10, padding: '10px 14px', fontSize: 13, borderBottom: `1px solid ${P.borderRow}` }}>
                  <div style={{ color: P.text3 }} dir="ltr">{h[0]}</div>
                  <div dir="ltr" style={{ textAlign: 'start' }}>{h[1]}</div>
                  <div style={{ textAlign: 'end' }} dir="ltr">{h[2]}</div>
                  <div style={{ textAlign: 'end', fontWeight: 600 }} dir="ltr">{h[3]}</div>
                </div>
              ))}
              {detail.hist.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: P.text4, fontSize: 13 }}>—</div>}
            </div>
            <div style={{ fontSize: 12.5, color: P.text4, marginTop: 10 }}>{t.costingNote}</div>
          </div>
        )}

        {tab === 'inv' && (
          <div style={{ maxWidth: 760 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
              <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: '12px 14px' }}><div style={{ fontSize: 11.5, color: P.text3, textTransform: 'uppercase' }}>{t.stocked}</div><div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>{item.stocked ? t.yes : t.no}</div></div>
              <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: '12px 14px' }}><div style={{ fontSize: 11.5, color: P.text3, textTransform: 'uppercase' }}>{t.minMax}</div><div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }} dir="ltr">{minMax}</div></div>
              <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: '12px 14px' }}><div style={{ fontSize: 11.5, color: P.text3, textTransform: 'uppercase' }}>{t.shelfLife}</div><div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }} dir="ltr">{item.shelf ?? '—'}</div></div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: P.text2, marginBottom: 8 }}>{t.countFreq}</div>
            <div style={{ border: `1px solid ${P.border}`, borderRadius: 12, background: P.card, overflow: 'hidden' }}>
              {detail.freq.map((f, i) => {
                const fs = FREQ_STYLE[f[1]];
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 16px', borderBottom: `1px solid ${P.borderRow}` }}>
                    <div style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>{LOC_NAMES[lang][f[0]]}</div>
                    <span style={{ fontSize: 12, padding: '4px 12px', borderRadius: 999, background: fs[0], color: fs[1], fontWeight: 600 }}>{t.freqs[f[1]]}</span>
                    <span style={{ fontSize: 12, color: P.text3 }}>{t.countUnitLbl}: <span dir="ltr">{f[2]}</span></span>
                    {f[3] && <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 999, background: P.rustBg, color: P.rustFg, fontWeight: 600 }}>{t.critical}</span>}
                  </div>
                );
              })}
              {detail.freq.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: P.text4, fontSize: 13 }}>—</div>}
            </div>
          </div>
        )}

        {tab === 'recipe' && (
          <div style={{ maxWidth: 560, background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: 22 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{t.recipeLink}</div>
            <div style={{ fontSize: 13.5, color: P.text3, marginTop: 8, lineHeight: 1.6 }}>{t.recipeLinkBody}</div>
            <button onClick={onOpenRecipe} style={{ marginTop: 16, height: 38, padding: '0 18px', borderRadius: 9, border: `1px solid ${P.borderInput}`, background: P.white, color: P.ink, fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{t.openBuilder} {fwdGlyph}</button>
          </div>
        )}

        {tab === 'pos' && (
          <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 12, color: P.text3, textTransform: 'uppercase' }}>{t.sellingPrice}</div>
              <div style={{ fontSize: 22, fontWeight: 700 }} dir="ltr">{item.price ? money(item.price, { max: 3 }) : '—'}</div>
            </div>
            <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 12, color: P.text3, textTransform: 'uppercase' }}>{t.posMapping}</div>
              <span style={{ fontSize: 12.5, padding: '4px 12px', borderRadius: 999, background: P.tealBg, color: P.tealFg, fontWeight: 600 }} dir="ltr">{detail.posMap || '—'}</span>
            </div>
          </div>
        )}
      </div>
    </Page>
  );
}
