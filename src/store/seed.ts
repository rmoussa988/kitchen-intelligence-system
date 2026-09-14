import type { CoreState, Item, Location, Supplier, User, Movement, Transfer, WasteRecord, ProductionPlan, Batch, Delivery, PurchaseOrder, SupplierInvoice, Expense, ShiftClosing, FxRate, Alert, AuditEntry } from './types';

export const STORE_VERSION = 1;

export const LOCATIONS: Location[] = [
  { id: 'mk', en: 'Main Kitchen', ar: 'المطبخ الرئيسي', type: 'production', sells: false, responsibilities: ['receiving', 'production', 'transfers-out'], storageAreas: ['Store room', 'Walk-in fridge', 'Freezer', 'Dry store'], active: true },
  { id: 'rock', en: 'Rock', ar: 'روك', type: 'restaurant', sells: true, responsibilities: ['service', 'production', 'transfers-in', 'receiving (bread)'], storageAreas: ['Line fridge', 'Back store'], active: true },
  { id: 'kad', en: 'Kaddoum', ar: 'قدّوم', type: 'juice', sells: true, responsibilities: ['service', 'production', 'transfers-in'], storageAreas: ['Juice bar fridge', 'Dry shelf'], active: true },
];

export const ITEMS: Item[] = [
  { id: 'RM-014', en: 'Sunflower oil', ar: 'زيت دوّار الشمس', type: 'raw', cat: 'Oils', catAr: 'زيوت', base: 'L', purch: 'CAN', purchFactor: 16, cost: 3.125, supplier: 'SUP-01', stocked: true, shelf: '12 mo', min: 32, max: 160, onHand: { mk: 96, rock: 18, kad: 6 } },
  { id: 'RM-001', en: 'Chicken breast', ar: 'صدر دجاج', type: 'raw', cat: 'Poultry', catAr: 'دواجن', base: 'KG', purch: 'BOX', purchFactor: 10, cost: 4.8, supplier: 'SUP-02', stocked: true, shelf: '3 d', min: 20, max: 80, onHand: { mk: 42.5, rock: 6 } },
  { id: 'RM-022', en: 'Akkawi cheese', ar: 'جبنة عكاوي', type: 'raw', cat: 'Dairy', catAr: 'ألبان وأجبان', base: 'KG', purch: 'KG', purchFactor: 1, cost: 7.2, supplier: 'SUP-03', stocked: true, shelf: '21 d', min: 4, max: 18, onHand: { mk: 9.5, rock: 5.2 } },
  { id: 'RM-035', en: 'Fresh oranges', ar: 'برتقال', type: 'raw', cat: 'Produce', catAr: 'خضار وفواكه', base: 'KG', purch: 'CRATE', purchFactor: 15, cost: 0.9, supplier: 'SUP-04', stocked: true, shelf: '7 d', min: 15, max: 60, onHand: { kad: 38 } },
  { id: 'RM-041', en: 'Sugar', ar: 'سكر', type: 'raw', cat: 'Dry goods', catAr: 'مواد جافة', base: 'KG', purch: 'BAG', purchFactor: 50, cost: 0.7, supplier: 'SUP-01', stocked: true, shelf: '24 mo', min: 10, max: 50, onHand: { mk: 31, kad: 12 } },
  { id: 'RM-050', en: 'Pickles (mixed)', ar: 'كبيس مشكّل', type: 'raw', cat: 'Preserves', catAr: 'مخللات', base: 'KG', purch: 'BUCKET', cost: 1.9, supplier: 'SUP-05', stocked: true, incomplete: true, shelf: '6 mo', min: 6, max: 24, onHand: { mk: 11, rock: 4 } },
  { id: 'RM-060', en: 'Pita bread', ar: 'خبز عربي', type: 'raw', cat: 'Bakery', catAr: 'مخبوزات', base: 'PACK', purch: 'PACK', purchFactor: 1, cost: 1.1, supplier: 'SUP-06', stocked: true, shelf: '2 d', min: 10, max: 60, onHand: { mk: 18, rock: 22 } },
  { id: 'RM-061', en: 'Fries 9 mm', ar: 'بطاطا ٩ مم', type: 'raw', cat: 'Frozen', catAr: 'مجمدات', base: 'KG', purch: 'BAG', purchFactor: 2.5, cost: 1.6, supplier: 'SUP-01', stocked: true, shelf: '12 mo', min: 20, max: 100, onHand: { mk: 55, rock: 24 } },
  { id: 'RM-062', en: 'Fresh tomatoes', ar: 'بندورة', type: 'raw', cat: 'Produce', catAr: 'خضار وفواكه', base: 'KG', purch: 'CRATE', purchFactor: 12, cost: 0.85, supplier: 'SUP-04', stocked: true, shelf: '5 d', min: 6, max: 30, onHand: { mk: 14, rock: 5 } },
  { id: 'RM-063', en: 'Lettuce', ar: 'خس', type: 'raw', cat: 'Produce', catAr: 'خضار وفواكه', base: 'KG', purch: 'CRATE', purchFactor: 8, cost: 1.2, supplier: 'SUP-04', stocked: true, shelf: '4 d', min: 3, max: 16, onHand: { mk: 6, rock: 3 } },
  { id: 'RM-064', en: 'Laban', ar: 'لبن', type: 'raw', cat: 'Dairy', catAr: 'ألبان وأجبان', base: 'L', purch: 'L', purchFactor: 1, cost: 1.35, supplier: 'SUP-03', stocked: true, shelf: '10 d', min: 5, max: 30, onHand: { mk: 12, rock: 6 } },
  { id: 'RM-065', en: 'Beef mince', ar: 'لحم مفروم', type: 'raw', cat: 'Meat', catAr: 'لحوم', base: 'KG', purch: 'KG', purchFactor: 1, cost: 6.2, supplier: 'SUP-02', stocked: true, shelf: '2 d', min: 8, max: 30, onHand: { mk: 14 } },
  { id: 'RM-066', en: 'Garlic (peeled)', ar: 'ثوم مقشّر', type: 'raw', cat: 'Produce', catAr: 'خضار وفواكه', base: 'KG', purch: 'KG', purchFactor: 1, cost: 2.4, supplier: 'SUP-04', stocked: true, shelf: '14 d', min: 2, max: 10, onHand: { mk: 4.5 } },
  { id: 'RM-067', en: 'Lemon juice', ar: 'عصير ليمون', type: 'raw', cat: 'Produce', catAr: 'خضار وفواكه', base: 'L', purch: 'L', purchFactor: 1, cost: 1.8, supplier: 'SUP-04', stocked: true, shelf: '7 d', min: 2, max: 12, onHand: { mk: 5 } },
  { id: 'RM-068', en: 'Mango pulp', ar: 'لب مانجو', type: 'raw', cat: 'Frozen', catAr: 'مجمدات', base: 'KG', purch: 'KG', purchFactor: 1, cost: 2.8, supplier: 'SUP-01', stocked: true, shelf: '6 mo', min: 5, max: 30, onHand: { mk: 9, kad: 7 } },
  { id: 'RM-069', en: 'Fresh milk', ar: 'حليب طازج', type: 'raw', cat: 'Dairy', catAr: 'ألبان وأجبان', base: 'L', purch: 'L', purchFactor: 1, cost: 0.85, supplier: 'SUP-03', stocked: true, shelf: '5 d', min: 10, max: 40, onHand: { mk: 20, kad: 14 } },
  { id: 'RM-070', en: 'Tobacco (shisha)', ar: 'معسّل', type: 'raw', cat: 'Tobacco', catAr: 'تبغ', base: 'KG', purch: 'BOX', purchFactor: 1, cost: 18, supplier: 'SUP-05', stocked: true, shelf: '12 mo', min: 2, max: 10, onHand: { rock: 3.4 } },
  { id: 'SR-003', en: 'Toum (garlic paste)', ar: 'ثوم مدقوق', type: 'sub', cat: 'Sauces', catAr: 'صلصات', base: 'KG', purch: '—', cost: 3.4, stocked: true, isRecipe: true, shelf: '5 d', min: 2, max: 8, onHand: { mk: 4.2, rock: 2.1 } },
  { id: 'SR-007', en: 'Taouk marinade', ar: 'تتبيلة طاووق', type: 'sub', cat: 'Sauces', catAr: 'صلصات', base: 'KG', purch: '—', cost: 2.1, stocked: true, isRecipe: true, shelf: '3 d', min: 3, max: 12, onHand: { mk: 6.5 } },
  { id: 'SR-009', en: 'Garlic sauce', ar: 'صوص الثوم', type: 'sub', cat: 'Sauces', catAr: 'صلصات', base: 'KG', purch: '—', cost: 2.9, stocked: true, isRecipe: true, shelf: '5 d', min: 3, max: 15, onHand: { mk: 8, rock: 3 } },
  { id: 'PR-002', en: 'Marinated taouk skewer', ar: 'سيخ طاووق متبّل', type: 'prep', cat: 'Proteins', catAr: 'بروتينات', base: 'PCS', purch: '—', cost: 1.15, stocked: true, isRecipe: true, shelf: '2 d', min: 60, max: 240, onHand: { mk: 120, rock: 84 } },
  { id: 'PR-005', en: 'Beef patty 150 g', ar: 'قرص لحم ١٥٠ غ', type: 'prep', cat: 'Proteins', catAr: 'بروتينات', base: 'PCS', purch: '—', cost: 0.95, stocked: true, isRecipe: true, shelf: '2 d', min: 40, max: 160, onHand: { mk: 70, rock: 46 } },
  { id: 'MI-101', en: 'Taouk sandwich', ar: 'ساندويش طاووق', type: 'menu', cat: 'Sandwiches', catAr: 'سندويشات', base: 'PCS', purch: '—', cost: 1.86, price: 6.5, stocked: false, isRecipe: true, pos: true, onHand: {} },
  { id: 'MI-102', en: 'Beef burger', ar: 'برغر لحم', type: 'menu', cat: 'Sandwiches', catAr: 'سندويشات', base: 'PCS', purch: '—', cost: 2.12, price: 7.5, stocked: false, isRecipe: true, pos: true, onHand: {} },
  { id: 'MI-103', en: 'Halloumi sandwich', ar: 'ساندويش حلّوم', type: 'menu', cat: 'Sandwiches', catAr: 'سندويشات', base: 'PCS', purch: '—', cost: 1.89, price: 6, stocked: false, isRecipe: true, pos: true, onHand: {} },
  { id: 'MI-108', en: 'Fresh orange juice', ar: 'عصير برتقال طازج', type: 'menu', cat: 'Juices', catAr: 'عصائر', base: 'PCS', purch: '—', cost: 0.74, price: 4, stocked: false, isRecipe: true, pos: true, onHand: {} },
  { id: 'MI-109', en: 'Mango smoothie', ar: 'سموذي مانجو', type: 'menu', cat: 'Juices', catAr: 'عصائر', base: 'PCS', purch: '—', cost: 1.05, price: 5, stocked: false, isRecipe: true, pos: true, onHand: {} },
  { id: 'PK-201', en: 'Sandwich wrap paper', ar: 'ورق تغليف سندويش', type: 'pack', cat: 'Packaging', catAr: 'تغليف', base: 'PCS', purch: 'CARTON', purchFactor: 1000, cost: 0.04, supplier: 'SUP-07', stocked: true, min: 500, max: 3000, onHand: { mk: 1400, rock: 600 } },
  { id: 'PK-205', en: 'Juice cup 12 oz', ar: 'كوب عصير ١٢ أونصة', type: 'pack', cat: 'Packaging', catAr: 'تغليف', base: 'PCS', purch: 'SLEEVE', cost: 0.07, supplier: 'SUP-07', stocked: true, incomplete: true, min: 200, max: 2000, onHand: { kad: 850 } },
  { id: 'PK-210', en: 'Paper bag', ar: 'كيس ورقي', type: 'pack', cat: 'Packaging', catAr: 'تغليف', base: 'PCS', purch: 'CARTON', purchFactor: 500, cost: 0.09, supplier: 'SUP-07', stocked: true, min: 300, max: 2000, onHand: { mk: 900, rock: 420 } },
];

export const SUPPLIERS: Supplier[] = [
  { id: 'SUP-01', name: 'Malak Trading', nameAr: 'ملاك للتجارة', contact: 'Fadi Malak', phone: '+961 3 412 887', terms: 'Net 15', products: ['RM-014', 'RM-041', 'RM-061', 'RM-068'], spendMonth: 2140, alert: true, active: true },
  { id: 'SUP-02', name: 'Hawa Chicken', nameAr: 'دجاج هوا', contact: 'Sales desk', phone: '+961 1 880 210', terms: 'Net 7', products: ['RM-001', 'RM-065'], spendMonth: 3860, active: true },
  { id: 'SUP-03', name: 'Dairy Khoury', nameAr: 'ألبان خوري', contact: 'Elie Khoury', phone: '+961 70 331 904', terms: 'COD', products: ['RM-022', 'RM-064', 'RM-069'], spendMonth: 940, active: true },
  { id: 'SUP-04', name: 'Bekaa Farms', nameAr: 'مزارع البقاع', contact: 'Abu Ali', phone: '+961 71 226 118', terms: 'COD', products: ['RM-035', 'RM-062', 'RM-063', 'RM-066', 'RM-067'], spendMonth: 720, active: true },
  { id: 'SUP-05', name: 'Adonis Foods', nameAr: 'أدونيس للأغذية', contact: 'Rita Sfeir', phone: '+961 3 908 771', terms: 'Net 30', products: ['RM-050', 'RM-070'], spendMonth: 610, active: true },
  { id: 'SUP-06', name: 'Furn Beaino', nameAr: 'فرن بعينو', contact: 'Counter', phone: '+961 1 442 030', terms: 'COD', products: ['RM-060'], spendMonth: 480, active: true },
  { id: 'SUP-07', name: 'PackPro', nameAr: 'باك برو', contact: 'Nour Haddad', phone: '+961 76 550 412', terms: 'Net 30', products: ['PK-201', 'PK-205', 'PK-210'], spendMonth: 330, active: true },
];

export const USERS: User[] = [
  { id: 'U-01', name: 'Rudy', nameAr: 'رودي', ini: 'R', role: 'owner', scope: 'all', credential: 'password', active: true },
  { id: 'U-02', name: 'Maya Haddad', nameAr: 'مايا حداد', ini: 'MH', role: 'manager', scope: 'all', credential: 'password', active: true },
  { id: 'U-03', name: 'Ziad', nameAr: 'زياد', ini: 'Z', role: 'storekeeper', scope: ['mk', 'rock'], credential: 'pin', active: true },
  { id: 'U-04', name: 'Karim', nameAr: 'كريم', ini: 'K', role: 'production', scope: ['mk'], credential: 'pin', active: true },
  { id: 'U-05', name: 'Hassan', nameAr: 'حسن', ini: 'H', role: 'prep', scope: ['mk'], credential: 'pin', active: true },
  { id: 'U-06', name: 'Lina', nameAr: 'لينا', ini: 'L', role: 'service', scope: ['rock'], credential: 'pin', active: true },
  { id: 'U-07', name: 'Omar', nameAr: 'عمر', ini: 'O', role: 'service', scope: ['kad'], credential: 'pin', active: true },
  { id: 'U-08', name: 'Georges Nassar', nameAr: 'جورج نصّار', ini: 'GN', role: 'accountant', scope: 'all', credential: 'password', active: true },
  { id: 'U-09', name: 'Rana', nameAr: 'رنا', ini: 'RN', role: 'invoice', scope: 'all', credential: 'password', active: true },
  { id: 'U-10', name: 'Sami', nameAr: 'سامي', ini: 'S', role: 'cost', scope: 'all', credential: 'password', active: true },
  { id: 'U-11', name: 'Nadia', nameAr: 'نادية', ini: 'N', role: 'prep', scope: ['mk'], credential: 'pin', active: false },
];

const T = (d: string, hm: string) => `2026-08-${d}T${hm}:00`;

export const MOVEMENTS: Movement[] = [
  { id: 'MV-0001', ts: T('11', '08:10'), itemId: 'RM-001', loc: 'mk', type: 'receiving', qty: 60, enteredQty: 6, enteredUnit: 'BOX', value: 288, source: 'INV-2211', sourceKind: 'delivery', user: 'U-03' },
  { id: 'MV-0002', ts: T('11', '09:40'), itemId: 'RM-001', loc: 'mk', type: 'production_out', qty: -15.5, enteredQty: 15.5, enteredUnit: 'KG', value: -74.4, source: 'SHW-20260811-001', sourceKind: 'batch', user: 'U-04' },
  { id: 'MV-0003', ts: T('11', '09:40'), itemId: 'SR-007', loc: 'mk', type: 'production_out', qty: -2.6, enteredQty: 2.6, enteredUnit: 'KG', value: -5.46, source: 'SHW-20260811-001', sourceKind: 'batch', user: 'U-04' },
  { id: 'MV-0004', ts: T('11', '12:05'), itemId: 'PR-002', loc: 'mk', type: 'production_in', qty: 140, enteredQty: 140, enteredUnit: 'PCS', value: 161, source: 'SHW-20260811-001', sourceKind: 'batch', user: 'U-04' },
  { id: 'MV-0005', ts: T('11', '17:20'), itemId: 'PR-002', loc: 'mk', type: 'transfer_out', qty: -110, enteredQty: 110, enteredUnit: 'PCS', value: -126.5, source: 'TRF-1039', sourceKind: 'transfer', user: 'U-04' },
  { id: 'MV-0006', ts: T('11', '17:20'), itemId: 'PR-005', loc: 'mk', type: 'transfer_out', qty: -80, enteredQty: 80, enteredUnit: 'PCS', value: -76, source: 'TRF-1039', sourceKind: 'transfer', user: 'U-04' },
  { id: 'MV-0007', ts: T('11', '17:20'), itemId: 'SR-003', loc: 'mk', type: 'transfer_out', qty: -4, enteredQty: 4, enteredUnit: 'KG', value: -13.6, source: 'TRF-1039', sourceKind: 'transfer', user: 'U-04' },
  { id: 'MV-0008', ts: T('11', '17:20'), itemId: 'RM-060', loc: 'mk', type: 'transfer_out', qty: -24, enteredQty: 24, enteredUnit: 'PACK', value: -26.4, source: 'TRF-1039', sourceKind: 'transfer', user: 'U-04' },
  { id: 'MV-0009', ts: T('11', '17:20'), itemId: 'RM-022', loc: 'mk', type: 'transfer_out', qty: -6, enteredQty: 6, enteredUnit: 'KG', value: -43.2, source: 'TRF-1039', sourceKind: 'transfer', user: 'U-04' },
  { id: 'MV-0010', ts: T('11', '21:30'), itemId: 'PR-002', loc: 'rock', type: 'sale', qty: -96, enteredQty: 96, enteredUnit: 'PCS', value: -110.4, source: 'POS 11 Aug', sourceKind: 'sale' },
  { id: 'MV-0011', ts: T('11', '21:30'), itemId: 'PR-005', loc: 'rock', type: 'sale', qty: -58, enteredQty: 58, enteredUnit: 'PCS', value: -55.1, source: 'POS 11 Aug', sourceKind: 'sale' },
  { id: 'MV-0012', ts: T('11', '22:05'), itemId: 'PR-002', loc: 'rock', type: 'waste', qty: -6, enteredQty: 6, enteredUnit: 'PCS', value: -6.9, source: 'WST-0214', sourceKind: 'waste', user: 'U-06' },
  { id: 'MV-0013', ts: T('11', '23:10'), itemId: 'RM-001', loc: 'rock', type: 'count', qty: -3.3, enteredQty: 3.3, enteredUnit: 'KG', value: -15.84, source: 'CNT-11Aug-Rock', sourceKind: 'count', beyondTolerance: true, user: 'U-06' },
  { id: 'MV-0014', ts: T('11', '23:10'), itemId: 'PR-002', loc: 'rock', type: 'count', qty: -6, enteredQty: 6, enteredUnit: 'PCS', value: -6.9, source: 'CNT-11Aug-Rock', sourceKind: 'count', beyondTolerance: true, user: 'U-06' },
  { id: 'MV-0015', ts: T('12', '07:45'), itemId: 'RM-014', loc: 'mk', type: 'receiving', qty: 160, enteredQty: 10, enteredUnit: 'CAN', value: 500, source: 'INV-2214', sourceKind: 'delivery', user: 'U-03' },
  { id: 'MV-0016', ts: T('12', '08:00'), itemId: 'RM-035', loc: 'kad', type: 'receiving', qty: 60, enteredQty: 4, enteredUnit: 'CRATE', value: 54, source: 'INV-2215', sourceKind: 'delivery', user: 'U-07' },
  { id: 'MV-0017', ts: T('12', '08:20'), itemId: 'RM-014', loc: 'mk', type: 'adjustment', qty: -2, enteredQty: 2, enteredUnit: 'L', value: -6.25, source: 'ADJ-0031', sourceKind: 'adjustment', note: 'Spill during decanting — approved by Maya', user: 'U-02' },
  { id: 'MV-0018', ts: T('12', '09:05'), itemId: 'RM-035', loc: 'kad', type: 'production_out', qty: -13, enteredQty: 13, enteredUnit: 'KG', value: -11.7, source: 'JUC-20260812-001', sourceKind: 'batch', user: 'U-07' },
];

export const TRANSFERS: Transfer[] = [
  { id: 'TRF-1036', from: 'mk', to: 'rock', status: 'confirmed', requestedAt: T('09', '06:30'), sentAt: T('09', '16:50'), confirmedAt: T('09', '17:40'), requestedBy: 'U-06', sentBy: 'U-04', confirmedBy: 'U-06',
    lines: [ { itemId: 'PR-002', unit: 'PCS', cost: 1.14, requested: 120, sent: 120, confirmed: 120 }, { itemId: 'PR-005', unit: 'PCS', cost: 0.95, requested: 60, sent: 60, confirmed: 60 }, { itemId: 'SR-003', unit: 'KG', cost: 3.4, requested: 3, sent: 3, confirmed: 3 } ] },
  { id: 'TRF-1037', from: 'mk', to: 'kad', status: 'confirmed', requestedAt: T('10', '07:00'), sentAt: T('10', '15:30'), confirmedAt: T('10', '16:10'), requestedBy: 'U-07', sentBy: 'U-04', confirmedBy: 'U-07',
    lines: [ { itemId: 'RM-035', unit: 'KG', cost: 0.9, requested: 30, sent: 30, confirmed: 30 }, { itemId: 'RM-069', unit: 'L', cost: 0.85, requested: 20, sent: 20, confirmed: 20 } ] },
  { id: 'TRF-1038', from: 'mk', to: 'rock', status: 'flagged', requestedAt: T('10', '06:40'), sentAt: T('10', '17:00'), confirmedAt: T('10', '17:55'), requestedBy: 'U-06', sentBy: 'U-04', confirmedBy: 'U-06',
    lines: [ { itemId: 'PR-002', unit: 'PCS', cost: 1.15, requested: 120, sent: 118, confirmed: 106, flag: 'short' }, { itemId: 'PR-005', unit: 'PCS', cost: 0.95, requested: 80, sent: 80, confirmed: 80 }, { itemId: 'RM-022', unit: 'KG', cost: 7.2, requested: 5, sent: 5, confirmed: 5 } ] },
  { id: 'TRF-1039', from: 'mk', to: 'rock', status: 'sent', requestedAt: T('11', '06:45'), sentAt: T('11', '17:20'), requestedBy: 'U-06', sentBy: 'U-04',
    lines: [ { itemId: 'PR-002', unit: 'PCS', cost: 1.15, requested: 120, sent: 110 }, { itemId: 'PR-005', unit: 'PCS', cost: 0.95, requested: 80, sent: 80 }, { itemId: 'SR-003', unit: 'KG', cost: 3.4, requested: 4, sent: 4 }, { itemId: 'RM-060', unit: 'PACK', cost: 1.1, requested: 25, sent: 24 }, { itemId: 'RM-022', unit: 'KG', cost: 7.2, requested: 6, sent: 6 } ] },
  { id: 'REQ-1042', from: 'mk', to: 'rock', status: 'requested', requestedAt: T('12', '06:40'), requestedBy: 'U-06',
    lines: [ { itemId: 'PR-002', unit: 'PCS', cost: 1.15, requested: 120 }, { itemId: 'PR-005', unit: 'PCS', cost: 0.95, requested: 80 }, { itemId: 'SR-003', unit: 'KG', cost: 3.4, requested: 4 }, { itemId: 'RM-060', unit: 'PACK', cost: 1.1, requested: 25 }, { itemId: 'RM-061', unit: 'KG', cost: 1.6, requested: 30 }, { itemId: 'RM-022', unit: 'KG', cost: 7.2, requested: 6 } ] },
  { id: 'REQ-1043', from: 'mk', to: 'kad', status: 'requested', requestedAt: T('12', '07:05'), requestedBy: 'U-07',
    lines: [ { itemId: 'RM-035', unit: 'KG', cost: 0.9, requested: 40 }, { itemId: 'RM-068', unit: 'KG', cost: 2.8, requested: 12 }, { itemId: 'RM-069', unit: 'L', cost: 0.85, requested: 30 }, { itemId: 'RM-041', unit: 'KG', cost: 0.7, requested: 10 } ] },
];

export const WASTE: WasteRecord[] = [
  { id: 'WST-0211', ts: T('10', '14:20'), itemId: 'RM-062', loc: 'mk', qty: 1.2, unit: 'KG', baseQty: 1.2, cost: 1.02, reason: 'quality', employee: 'U-05', status: 'auto' },
  { id: 'WST-0212', ts: T('10', '22:40'), itemId: 'PR-005', loc: 'rock', qty: 4, unit: 'PCS', baseQty: 4, cost: 3.8, reason: 'overproduction', employee: 'U-06', status: 'auto' },
  { id: 'WST-0213', ts: T('11', '11:05'), itemId: 'RM-001', loc: 'mk', qty: 2.4, unit: 'KG', baseQty: 2.4, cost: 11.52, reason: 'prep', employee: 'U-04', status: 'approved', note: 'Trimming waste — taouk batch' },
  { id: 'WST-0214', ts: T('11', '22:05'), itemId: 'PR-002', loc: 'rock', qty: 6, unit: 'PCS', baseQty: 6, cost: 6.9, reason: 'burnt', employee: 'U-06', status: 'auto' },
  { id: 'WST-0215', ts: T('12', '08:50'), itemId: 'RM-022', loc: 'rock', qty: 1.8, unit: 'KG', baseQty: 1.8, cost: 12.96, reason: 'expired', employee: 'U-06', status: 'pending', photo: true },
  { id: 'WST-0216', ts: T('12', '09:10'), itemId: 'RM-035', loc: 'kad', qty: 3, unit: 'KG', baseQty: 3, cost: 2.7, reason: 'damaged', employee: 'U-07', status: 'auto' },
  { id: 'WST-0217', ts: T('12', '09:25'), itemId: 'RM-001', loc: 'mk', qty: 3.5, unit: 'KG', baseQty: 3.5, cost: 16.8, reason: 'expired', employee: 'U-05', status: 'pending', photo: true },
];

export const PLANS: ProductionPlan[] = [
  { id: 'PLN-0812-01', date: '2026-08-12', loc: 'mk', itemId: 'PR-002', plannedQty: 150, unit: 'PCS', assignedTo: 'U-04', expectedDemand: 140, openingStock: 120, status: 'not_started', published: true },
  { id: 'PLN-0812-02', date: '2026-08-12', loc: 'mk', itemId: 'SR-009', plannedQty: 15, unit: 'KG', assignedTo: 'U-05', expectedDemand: 12, openingStock: 8, status: 'in_progress', published: true, progress: 0.4 },
  { id: 'PLN-0812-03', date: '2026-08-12', loc: 'mk', itemId: 'PR-005', plannedQty: 80, unit: 'PCS', assignedTo: 'U-04', expectedDemand: 75, openingStock: 70, status: 'not_started', published: true },
  { id: 'PLN-0812-04', date: '2026-08-12', loc: 'mk', itemId: 'SR-003', plannedQty: 5, unit: 'KG', assignedTo: 'U-05', expectedDemand: 4, openingStock: 4.2, status: 'done', published: true, progress: 1 },
  { id: 'PLN-0812-05', date: '2026-08-12', loc: 'kad', itemId: 'MI-108', plannedQty: 60, unit: 'PCS', assignedTo: 'U-07', expectedDemand: 55, openingStock: 0, status: 'in_progress', published: true, progress: 0.3 },
];

export const BATCHES: Batch[] = [
  { id: 'SHW-20260808-001', itemId: 'PR-002', loc: 'mk', employee: 'U-04', startedAt: T('08', '08:30'), completedAt: T('08', '11:40'), status: 'approved', plannedQty: 150, unit: 'PCS', inputMode: 'commit', rawItemId: 'RM-001', rawUsed: 15.2, trimWaste: 0.6, marinadeRecommended: 2.5, marinadeUsed: 2.6, outputQty: 146, standardPerUnit: 0.1, gapKg: 0.6, gapPct: 4.1, gapUsd: 2.88, gapStatus: 'accepted', cost: 167.9, yieldPct: 96 },
  { id: 'SHW-20260809-001', itemId: 'PR-002', loc: 'mk', employee: 'U-04', startedAt: T('09', '08:20'), completedAt: T('09', '11:30'), status: 'approved', plannedQty: 140, unit: 'PCS', inputMode: 'draw', rawItemId: 'RM-001', rawDrawn: 30, rawReturned: 15.1, rawUsed: 14.9, trimWaste: 0.5, marinadeRecommended: 2.4, marinadeUsed: 2.4, outputQty: 138, standardPerUnit: 0.1, gapKg: 1.1, gapPct: 8, gapUsd: 5.28, gapStatus: 'accepted', cost: 158.7, yieldPct: 93 },
  { id: 'SHW-20260810-001', itemId: 'PR-002', loc: 'mk', employee: 'U-05', startedAt: T('10', '08:40'), completedAt: T('10', '12:00'), status: 'approved', plannedQty: 150, unit: 'PCS', inputMode: 'commit', rawItemId: 'RM-001', rawUsed: 16.4, trimWaste: 0.8, marinadeRecommended: 2.7, marinadeUsed: 3.1, outputQty: 142, standardPerUnit: 0.1, gapKg: 2.2, gapPct: 15.5, gapUsd: 10.56, gapStatus: 'flagged', cost: 163.3, yieldPct: 87 },
  { id: 'SHW-20260811-001', itemId: 'PR-002', loc: 'mk', employee: 'U-04', startedAt: T('11', '09:40'), completedAt: T('11', '12:05'), status: 'complete', plannedQty: 150, unit: 'PCS', inputMode: 'draw', rawItemId: 'RM-001', rawDrawn: 50, rawReturned: 34.5, rawUsed: 15.5, trimWaste: 0.7, marinadeRecommended: 2.55, marinadeUsed: 2.6, outputQty: 140, standardPerUnit: 0.1, gapKg: 1.5, gapPct: 10.7, gapUsd: 7.2, gapStatus: 'open', cost: 161, yieldPct: 90 },
  { id: 'PAT-20260811-001', itemId: 'PR-005', loc: 'mk', employee: 'U-04', startedAt: T('11', '13:00'), completedAt: T('11', '14:10'), status: 'approved', plannedQty: 90, unit: 'PCS', inputMode: 'commit', rawItemId: 'RM-065', rawUsed: 13.8, trimWaste: 0.2, outputQty: 90, standardPerUnit: 0.15, gapKg: 0.3, gapPct: 2.2, gapUsd: 1.86, gapStatus: 'accepted', cost: 85.5, yieldPct: 98 },
  { id: 'TOM-20260812-001', itemId: 'SR-003', loc: 'mk', employee: 'U-05', startedAt: T('12', '07:10'), completedAt: T('12', '07:55'), status: 'complete', plannedQty: 5, unit: 'KG', inputMode: 'commit', rawItemId: 'RM-066', rawUsed: 1.6, outputQty: 4.9, gapStatus: 'accepted', cost: 16.66, yieldPct: 98 },
  { id: 'GAR-20260812-001', planId: 'PLN-0812-02', itemId: 'SR-009', loc: 'mk', employee: 'U-05', startedAt: T('12', '08:30'), status: 'stages', plannedQty: 15, unit: 'KG', inputMode: 'commit', rawItemId: 'RM-066', rawUsed: 3.2 },
];

export const DELIVERIES: Delivery[] = [
  { id: 'DLV-0418', ts: T('09', '07:50'), supplierId: 'SUP-02', invoiceNo: 'INV-2208', loc: 'mk', receivedBy: 'U-03', status: 'invoiced', total: 285, worstVariancePct: -1,
    lines: [ { itemId: 'RM-001', ordered: 6, received: 6, unit: 'BOX', baseQty: 60, unitPrice: 47.5, lastPrice: 48, variancePct: -1, expiry: '2026-08-12', batch: 'HC-0908', temp: '3.2°C', quality: 'ok', oldAvg: 4.78, newAvg: 4.76 } ] },
  { id: 'DLV-0419', ts: T('10', '08:05'), supplierId: 'SUP-04', invoiceNo: 'INV-2209', loc: 'mk', receivedBy: 'U-03', status: 'invoiced', total: 71.4, worstVariancePct: 4.2,
    lines: [ { itemId: 'RM-062', ordered: 3, received: 3, unit: 'CRATE', baseQty: 36, unitPrice: 10.6, lastPrice: 10.2, variancePct: 3.9, quality: 'ok', oldAvg: 0.84, newAvg: 0.85 }, { itemId: 'RM-063', ordered: 2, received: 2, unit: 'CRATE', baseQty: 16, unitPrice: 10, lastPrice: 9.6, variancePct: 4.2, quality: 'ok', oldAvg: 1.18, newAvg: 1.2 }, { itemId: 'RM-066', ordered: 4, received: 4, unit: 'KG', baseQty: 4, unitPrice: 2.4, lastPrice: 2.4, variancePct: 0, quality: 'ok', oldAvg: 2.4, newAvg: 2.4 } ] },
  { id: 'DLV-0420', ts: T('11', '08:10'), supplierId: 'SUP-02', invoiceNo: 'INV-2211', loc: 'mk', receivedBy: 'U-03', status: 'approved', total: 288, worstVariancePct: 1.1,
    lines: [ { itemId: 'RM-001', ordered: 6, received: 6, unit: 'BOX', baseQty: 60, unitPrice: 48, lastPrice: 47.5, variancePct: 1.1, expiry: '2026-08-14', batch: 'HC-1108', temp: '2.8°C', quality: 'ok', oldAvg: 4.76, newAvg: 4.8 } ] },
  { id: 'DLV-0421', ts: T('12', '07:45'), supplierId: 'SUP-01', invoiceNo: 'INV-2214', loc: 'mk', receivedBy: 'U-03', status: 'received', total: 617, worstVariancePct: 8.7,
    lines: [ { itemId: 'RM-014', ordered: 10, received: 10, unit: 'CAN', baseQty: 160, unitPrice: 50, lastPrice: 49.6, variancePct: 0.8, expiry: '2027-08-01', batch: 'MT-4471', quality: 'ok', oldAvg: 3.108, newAvg: 3.125 }, { itemId: 'RM-061', ordered: 30, received: 30, unit: 'BAG', baseQty: 75, unitPrice: 3.9, lastPrice: 3.59, variancePct: 8.7, quality: 'ok', oldAvg: 1.44, newAvg: 1.6 } ] },
  { id: 'DLV-0422', ts: T('12', '08:00'), supplierId: 'SUP-04', invoiceNo: 'INV-2215', loc: 'kad', receivedBy: 'U-07', status: 'received', total: 54, worstVariancePct: 0,
    lines: [ { itemId: 'RM-035', ordered: 4, received: 4, unit: 'CRATE', baseQty: 60, unitPrice: 13.5, lastPrice: 13.5, variancePct: 0, quality: 'ok', oldAvg: 0.9, newAvg: 0.9 } ] },
  { id: 'DLV-0423', ts: T('12', '08:35'), supplierId: 'SUP-06', invoiceNo: 'FB-0812', loc: 'rock', receivedBy: 'U-06', status: 'received', total: 27.5, worstVariancePct: 0,
    lines: [ { itemId: 'RM-060', ordered: 25, received: 25, unit: 'PACK', baseQty: 25, unitPrice: 1.1, lastPrice: 1.1, variancePct: 0, quality: 'ok', oldAvg: 1.1, newAvg: 1.1 } ] },
];

export const PURCHASE_ORDERS: PurchaseOrder[] = [
  { id: 'PO-2026-116', ts: T('10', '15:00'), supplierId: 'SUP-02', loc: 'mk', status: 'received', total: 288, expected: '2026-08-11', createdBy: 'U-02', lines: [ { itemId: 'RM-001', qty: 6, unit: 'BOX', price: 48, received: 6 } ] },
  { id: 'PO-2026-117', ts: T('11', '10:30'), supplierId: 'SUP-01', loc: 'mk', status: 'received', total: 617, expected: '2026-08-12', createdBy: 'U-02', lines: [ { itemId: 'RM-014', qty: 10, unit: 'CAN', price: 50, received: 10 }, { itemId: 'RM-061', qty: 30, unit: 'BAG', price: 3.9, received: 30 } ] },
  { id: 'PO-2026-118', ts: T('12', '09:00'), supplierId: 'SUP-02', loc: 'mk', status: 'sent', total: 336.4, expected: '2026-08-13', createdBy: 'U-02', lines: [ { itemId: 'RM-001', qty: 6, unit: 'BOX', price: 48 }, { itemId: 'RM-065', qty: 8, unit: 'KG', price: 6.05 } ] },
  { id: 'PO-2026-119', ts: T('12', '09:10'), supplierId: 'SUP-03', loc: 'mk', status: 'draft', total: 129.4, createdBy: 'U-02', lines: [ { itemId: 'RM-022', qty: 12, unit: 'KG', price: 7.2 }, { itemId: 'RM-064', qty: 20, unit: 'L', price: 1.35 }, { itemId: 'RM-069', qty: 20, unit: 'L', price: 0.85 } ] },
];

export const INVOICES: SupplierInvoice[] = [
  { id: 'SI-3016', supplierId: 'SUP-02', invoiceNo: 'INV-2208', date: '2026-08-09', due: '2026-08-16', amount: 285, currency: 'USD', stage: 'approved', deliveryId: 'DLV-0418', loc: 'mk', enteredBy: 'U-09', reviewedBy: 'U-08' },
  { id: 'SI-3017', supplierId: 'SUP-04', invoiceNo: 'INV-2209', date: '2026-08-10', due: '2026-08-10', amount: 71.4, currency: 'USD', stage: 'paid', deliveryId: 'DLV-0419', loc: 'mk', enteredBy: 'U-09', reviewedBy: 'U-08', paidAmount: 71.4, paymentMethod: 'cash' },
  { id: 'SI-3018', supplierId: 'SUP-02', invoiceNo: 'INV-2211', date: '2026-08-11', due: '2026-08-18', amount: 288, currency: 'USD', stage: 'review', deliveryId: 'DLV-0420', poId: 'PO-2026-116', loc: 'mk', enteredBy: 'U-09' },
  { id: 'SI-3019', supplierId: 'SUP-01', invoiceNo: 'INV-2214', date: '2026-08-12', due: '2026-08-27', amount: 626.3, currency: 'USD', stage: 'entered', deliveryId: 'DLV-0421', poId: 'PO-2026-117', loc: 'mk', enteredBy: 'U-09', matchIssues: ['Invoice total $626.30 ≠ received $617.00', 'Fries 9 mm unit price +8.7% vs last'] },
  { id: 'SI-3020', supplierId: 'SUP-04', invoiceNo: 'INV-2215', date: '2026-08-12', due: '2026-08-12', amount: 54, currency: 'USD', stage: 'received', deliveryId: 'DLV-0422', loc: 'kad' },
  { id: 'SI-3021', supplierId: 'SUP-06', invoiceNo: 'FB-0812', date: '2026-08-12', due: '2026-08-12', amount: 2475000, currency: 'LBP', stage: 'received', deliveryId: 'DLV-0423', loc: 'rock' },
  { id: 'SI-3010', supplierId: 'SUP-05', invoiceNo: 'AD-7781', date: '2026-07-28', due: '2026-08-27', amount: 412, currency: 'USD', stage: 'approved', loc: 'mk', enteredBy: 'U-09', reviewedBy: 'U-08' },
  { id: 'SI-3008', supplierId: 'SUP-07', invoiceNo: 'PP-1190', date: '2026-07-20', due: '2026-08-19', amount: 330, currency: 'USD', stage: 'disputed', loc: 'mk', enteredBy: 'U-09', matchIssues: ['2 cartons short vs delivery'] },
  { id: 'SI-3002', supplierId: 'SUP-01', invoiceNo: 'INV-2190', date: '2026-07-05', due: '2026-07-20', amount: 540, currency: 'USD', stage: 'approved', loc: 'mk', enteredBy: 'U-09', reviewedBy: 'U-08' },
];

export const EXPENSES: Expense[] = [
  { id: 'EXP-0801', date: '2026-08-01', accrualMonth: '2026-08', category: 'rent', amount: 3500, currency: 'USD', method: 'cash', allocation: 'rock', vendor: 'Landlord — Rock', recurring: true },
  { id: 'EXP-0802', date: '2026-08-01', accrualMonth: '2026-08', category: 'rent', amount: 1200, currency: 'USD', method: 'cash', allocation: 'kad', vendor: 'Landlord — Kaddoum', recurring: true },
  { id: 'EXP-0803', date: '2026-08-01', accrualMonth: '2026-08', category: 'rent', amount: 1800, currency: 'USD', method: 'cash', allocation: 'mk', vendor: 'Landlord — MK', recurring: true },
  { id: 'EXP-0804', date: '2026-08-05', accrualMonth: '2026-08', category: 'gas', amount: 640, currency: 'USD', method: 'cash', allocation: 'mk', vendor: 'Gaz Liban' },
  { id: 'EXP-0805', date: '2026-08-06', accrualMonth: '2026-08', category: 'marketing', amount: 450, currency: 'USD', method: 'card', allocation: 'split', vendor: 'Meta Ads', note: 'Split evenly ÷3' },
  { id: 'EXP-0806', date: '2026-08-08', accrualMonth: '2026-08', category: 'maintenance', amount: 27000000, currency: 'LBP', method: 'cash', allocation: 'rock', vendor: 'Fridge repair' },
  { id: 'EXP-0807', date: '2026-08-10', accrualMonth: '2026-07', category: 'electricity', amount: 920, currency: 'USD', method: 'cash', allocation: 'rock', vendor: 'EDL + generator', note: 'July bill paid in August' },
  { id: 'EXP-0808', date: '2026-08-10', accrualMonth: '2026-07', category: 'electricity', amount: 380, currency: 'USD', method: 'cash', allocation: 'kad', vendor: 'EDL + generator', note: 'July bill paid in August' },
  { id: 'EXP-0809', date: '2026-08-11', accrualMonth: '2026-08', category: 'uniforms', amount: 180, currency: 'USD', method: 'cash', allocation: 'split', vendor: 'Uniform Co.' },
];

export const CLOSINGS: ShiftClosing[] = [
  { id: 'CLS-0810-R', loc: 'rock', date: '2026-08-10', shift: 'Evening', expected: 1842, declared: { cashUsd: 610, cashLbp: 54000000, whish: 380, card: 260, expenses: 25 }, confirmed: { cashUsd: 610, cashLbp: 54000000, whish: 380, card: 260 }, rate: 89500, status: 'confirmed', overShort: -2.4, submittedBy: 'U-06' },
  { id: 'CLS-0810-K', loc: 'kad', date: '2026-08-10', shift: 'Evening', expected: 612, declared: { cashUsd: 240, cashLbp: 18000000, whish: 110, card: 60, expenses: 0 }, confirmed: { cashUsd: 240, cashLbp: 18000000, whish: 110, card: 60 }, rate: 89500, status: 'confirmed', overShort: -1.1, submittedBy: 'U-07' },
  { id: 'CLS-0811-R', loc: 'rock', date: '2026-08-11', shift: 'Evening', expected: 1910, declared: { cashUsd: 640, cashLbp: 58500000, whish: 420, card: 190, expenses: 30 }, rate: 90000, status: 'in_transit', overShort: 20, submittedBy: 'U-06' },
  { id: 'CLS-0811-K', loc: 'kad', date: '2026-08-11', shift: 'Evening', expected: 648, declared: { cashUsd: 260, cashLbp: 19800000, whish: 95, card: 70, expenses: 0 }, rate: 90000, status: 'in_transit', overShort: -3, submittedBy: 'U-07' },
];

export const FX_HISTORY: FxRate[] = [
  { date: '2026-08-12', rate: 90000, setBy: 'U-08', closings: 0 },
  { date: '2026-08-11', rate: 90000, setBy: 'U-08', closings: 2 },
  { date: '2026-08-10', rate: 89500, setBy: 'U-08', closings: 2 },
  { date: '2026-08-09', rate: 89500, setBy: 'U-08', closings: 2 },
  { date: '2026-08-08', rate: 89500, setBy: 'U-08', closings: 2 },
  { date: '2026-08-07', rate: 89000, setBy: 'U-08', closings: 2 },
];

export const ALERTS: Alert[] = [
  { id: 'AL-001', ts: T('12', '07:50'), severity: 'red', type: 'price_up', en: 'Fries 9 mm price +8.7% vs last receipt (Malak Trading)', ar: 'سعر البطاطا ٩ مم +٨٫٧٪ مقارنة بآخر استلام (ملاك)', loc: 'mk', moduleId: 'receiving' },
  { id: 'AL-002', ts: T('11', '23:15'), severity: 'red', type: 'inv_variance', en: 'Chicken breast count variance −3.3 KG (−$15.84) at Rock', ar: 'فرق جرد صدر الدجاج −٣٫٣ كغ (−١٥٫٨٤$) في روك', loc: 'rock', moduleId: 'variance' },
  { id: 'AL-003', ts: T('11', '23:15'), severity: 'amber', type: 'inv_variance', en: 'Taouk skewer count variance −6 PCS (−$6.90) at Rock', ar: 'فرق جرد سيخ الطاووق −٦ قطع (−٦٫٩٠$) في روك', loc: 'rock', moduleId: 'variance' },
  { id: 'AL-004', ts: T('11', '12:10'), severity: 'amber', type: 'production_gap', en: 'Batch SHW-20260811-001 gap +1.5 KG (+10.7%) vs recipe', ar: 'فجوة الدفعة SHW-20260811-001 +١٫٥ كغ (+١٠٫٧٪) عن الوصفة', loc: 'mk', moduleId: 'production-gaps' },
  { id: 'AL-005', ts: T('10', '18:00'), severity: 'red', type: 'transfer_variance', en: 'TRF-1038 confirmed 106 of 118 skewers sent — flagged short', ar: 'TRF-1038 تم تأكيد ١٠٦ من ١١٨ سيخاً — مُبلّغ نقص', loc: 'rock', moduleId: 'transfers' },
  { id: 'AL-006', ts: T('12', '06:00'), severity: 'amber', type: 'recipe_cost', en: 'Halloumi sandwich food cost 31.5% > 30% threshold', ar: 'كلفة ساندويش الحلّوم ٣١٫٥٪ > حد ٣٠٪', moduleId: 'recipes' },
  { id: 'AL-007', ts: T('12', '09:00'), severity: 'amber', type: 'waste_pending', en: '2 waste records awaiting approval ($29.76)', ar: 'سجلا هدر بانتظار الموافقة (٢٩٫٧٦$)', moduleId: 'waste' },
  { id: 'AL-008', ts: T('12', '08:30'), severity: 'amber', type: 'invoice_mismatch', en: 'INV-2214 total $626.30 ≠ received $617.00', ar: 'إجمالي INV-2214 ٦٢٦٫٣٠$ ≠ المستلم ٦١٧٫٠٠$', moduleId: 'invoice-review' },
  { id: 'AL-009', ts: T('12', '09:00'), severity: 'amber', type: 'transfer_unreceived', en: 'TRF-1039 sent 17:20 yesterday, not yet confirmed at Rock', ar: 'TRF-1039 أُرسل أمس ١٧:٢٠ ولم يُؤكد بعد في روك', loc: 'rock', moduleId: 'transfers' },
  { id: 'AL-010', ts: T('12', '00:30'), severity: 'amber', type: 'cash_gap', en: 'Rock closing 11 Aug over by $20.00 — in transit to accounting', ar: 'إقفال روك ١١ آب زائد ٢٠٫٠٠$ — في الطريق إلى المحاسبة', loc: 'rock', moduleId: 'accounting' },
  { id: 'AL-011', ts: T('11', '06:00'), severity: 'info', type: 'missing_count', en: 'Kaddoum daily count not submitted yesterday', ar: 'لم يُرسل جرد قدّوم اليومي أمس', loc: 'kad', moduleId: 'inventory' },
];

export const AUDIT: AuditEntry[] = [
  { id: 'AU-0001', ts: T('12', '08:20'), user: 'U-02', action: 'Approved adjustment', entity: 'RM-014 Sunflower oil · Main Kitchen', oldValue: '98 L', newValue: '96 L', moduleId: 'inventory' },
  { id: 'AU-0002', ts: T('11', '16:05'), user: 'U-02', action: 'Recipe version saved', entity: 'MI-101 Taouk sandwich · v4', oldValue: '$1.82', newValue: '$1.86', moduleId: 'recipes' },
  { id: 'AU-0003', ts: T('11', '11:10'), user: 'U-02', action: 'Waste approved', entity: 'WST-0213 · Chicken breast 2.4 KG', newValue: '−$11.52 at cost', moduleId: 'waste' },
  { id: 'AU-0004', ts: T('10', '18:10'), user: 'U-02', action: 'Gap accepted', entity: 'SHW-20260809-001 · +1.1 KG', moduleId: 'production-gaps' },
  { id: 'AU-0005', ts: T('08', '09:00'), user: 'U-08', action: 'FX rate set', entity: 'USD/LBP · 08 Aug', oldValue: '89,000', newValue: '89,500', moduleId: 'accounting' },
];

export function buildInitialState(): CoreState {
  return {
    version: STORE_VERSION,
    scope: 'all',
    settings: {
      fxRate: 90000, varianceTolerancePct: 5, wasteAutoApproveUsd: 10, ppvAmberPct: 3, ppvRedPct: 7,
      productionGapAlertPct: 8, cashTolerance: 5, currentUser: 'U-01', staffUser: 'U-03', period: '2026-08',
    },
    locations: LOCATIONS,
    items: ITEMS,
    suppliers: SUPPLIERS,
    users: USERS,
    movements: MOVEMENTS,
    transfers: TRANSFERS,
    waste: WASTE,
    plans: PLANS,
    batches: BATCHES,
    deliveries: DELIVERIES,
    purchaseOrders: PURCHASE_ORDERS,
    invoices: INVOICES,
    expenses: EXPENSES,
    closings: CLOSINGS,
    fxHistory: FX_HISTORY,
    alerts: ALERTS,
    audit: AUDIT,
    modules: {},
    seq: 1000,
  };
}
