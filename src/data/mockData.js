const today = new Date();
const d = (daysAgo) => {
  const date = new Date(today);
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
};

export const companyInfo = {
  name: 'Liyanage Distributors',
  regNo: 'PV-2025-0042',
  address: 'Hakmana Road, Deiyandara',
  tel: '070-5237647 / 071-5944711',
  email: 'info@liyanagedistributors.lk',
  vatNo: 'VAT-1234-5678-9012',
  distributorVatNo: 'DVAT-9876-5432-1098',
};

/**
 * HARDWARE SHOP SCHEMA
 * id, name, route, contact (phone), address, active,
 * salesPerson, salesPersonPhone, totalOutstanding (computed), totalPayments
 */

// ── Centralized Source of Truth ─────────────────────────────────────────────
/** Unified initial reactive array for Stores/Hardware Shops */
export const initialStores = [
  { id: 1,  name: 'Shanthi Electricals',          route: 'Morawaka',      contact: '071-2345678', address: '23 Galle Rd, Morawaka',        active: true,  salesPerson: 'Kamal Perera',       salesPersonPhone: '077-1112233', totalPayments: 150000 },
  { id: 2,  name: 'Moon Light Hardware',           route: 'Akuressa',      contact: '072-3456789', address: '22 Main St, Akuressa',         active: true,  salesPerson: 'Nimal Fernando',     salesPersonPhone: '077-2223344', totalPayments: 205000 },
  { id: 3,  name: 'Samagi Electrical Center',      route: 'Deniyaya',      contact: '077-4567890', address: '22 Matara Rd, Deniyaya',       active: true,  salesPerson: 'Sunil Silva',        salesPersonPhone: '077-3334455', totalPayments: 100000 },
  { id: 4,  name: 'Lanka Lighting House',          route: 'Urubokka',      contact: '071-5678901', address: '45 Colombo Rd, Urubokka',      active: true,  salesPerson: 'Priya Jayawardena',  salesPersonPhone: '077-4445566', totalPayments: 150000 },
  { id: 5,  name: 'Star Engineering Supplies',     route: 'Morawaka',      contact: '075-6789012', address: '78 Temple Rd, Morawaka',       active: true,  salesPerson: 'Rohan Weerasinghe',  salesPersonPhone: '077-5556677', totalPayments:  45000 },
  { id: 6,  name: 'Royal Hardware Mart',           route: 'Akuressa',      contact: '076-7890123', address: '112 Galle Rd, Akuressa',       active: true,  salesPerson: 'Saman Kumara',       salesPersonPhone: '077-6667788', totalPayments:      0 },
  { id: 7,  name: 'Liyanage Electrical Traders',   route: 'Deniyaya',      contact: '071-8901234', address: '5 Lake Rd, Deniyaya',          active: false, salesPerson: 'Upul Rathnayake',    salesPersonPhone: '077-7778899', totalPayments:      0 },
  { id: 8,  name: 'City Light Electricals',        route: 'Urubokka',      contact: '072-9012345', address: '90 Station Rd, Urubokka',      active: true,  salesPerson: 'Lalith Dissanayake', salesPersonPhone: '077-8889900', totalPayments: 100000 },
  { id: 9,  name: 'Sathosa Hardware & Electricals',route: 'Kamburupitiya', contact: '077-0123456', address: '34 Main St, Kamburupitiya',     active: true,  salesPerson: 'Ajith Bandara',      salesPersonPhone: '077-9990011', totalPayments:  50000 },
  { id: 10, name: 'Nimal Electrical Center',       route: 'Kamburupitiya', contact: '075-1234567', address: '12 Church Rd, Kamburupitiya',  active: true,  salesPerson: 'Dinesh Kumara',      salesPersonPhone: '077-1002003', totalPayments:  72000 },
  { id: 11, name: 'Galle Hardware Depot',          route: 'Morawaka',      contact: '091-2345678', address: '56 Beach Rd, Morawaka',        active: false, salesPerson: 'Harsha De Silva',    salesPersonPhone: '077-3004005', totalPayments:      0 },
  { id: 12, name: 'Metro Electrical House',        route: 'Akuressa',      contact: '077-3456789', address: '89 Lake Rd, Akuressa',         active: true,  salesPerson: 'Mahesh Jayasuriya',  salesPersonPhone: '077-5006007', totalPayments: 100000 },
  // ── New stores to reach 20 ──────────────────────────────────────────────────
  { id: 13, name: 'Nilwala Hardware',              route: 'Morawaka',      contact: '077-6123456', address: '18 Nilwala Rd, Morawaka',       active: true,  salesPerson: 'Kamal Perera',       salesPersonPhone: '077-1112233', totalPayments:  32000 },
  { id: 14, name: 'Ruhunu Traders',                route: 'Akuressa',      contact: '071-7234567', address: '7 Matara Rd, Akuressa',        active: true,  salesPerson: 'Nimal Fernando',     salesPersonPhone: '077-2223344', totalPayments:  88000 },
  { id: 15, name: 'Galle Steel House',             route: 'Deniyaya',      contact: '076-8345678', address: '22 Galle Rd, Deniyaya',        active: true,  salesPerson: 'Sunil Silva',        salesPersonPhone: '077-3334455', totalPayments:  56000 },
  { id: 16, name: 'Uva Lighting Centre',           route: 'Urubokka',      contact: '077-9456789', address: '45 Uva Rd, Urubokka',          active: true,  salesPerson: 'Priya Jayawardena',  salesPersonPhone: '077-4445566', totalPayments:  41000 },
  { id: 17, name: 'Lanka Pipe & Steel',            route: 'Kamburupitiya', contact: '071-1567890', address: '90 Main St, Kamburupitiya',    active: true,  salesPerson: 'Ajith Bandara',      salesPersonPhone: '077-9990011', totalPayments:  23000 },
  { id: 18, name: 'Southern Hardware Mart',        route: 'Morawaka',      contact: '075-2678901', address: '33 Southern Hwy, Morawaka',    active: true,  salesPerson: 'Rohan Weerasinghe',  salesPersonPhone: '077-5556677', totalPayments:  77000 },
  { id: 19, name: 'Ceylon Electrical Traders',     route: 'Deniyaya',      contact: '072-3789012', address: '55 Lake Rd, Deniyaya',         active: false, salesPerson: 'Upul Rathnayake',    salesPersonPhone: '077-7778899', totalPayments:  15000 },
  { id: 21, name: 'Southern Steel House',           route: 'Kotapola',      contact: '077-5012345', address: '85 Main St, Kotapola',          active: true,  salesPerson: 'Nimal Fernando',     salesPersonPhone: '077-2223344', totalPayments:  28000 },
  { id: 22, name: 'Matara Brick Supply',           route: 'Hakmana',       contact: '071-6123456', address: '22 Hakmana Rd, Hakmana',        active: true,  salesPerson: 'Lalith Dissanayake', salesPersonPhone: '077-8889900', totalPayments:  45000 },
  { id: 23, name: 'Nilwala Paint Center',          route: 'Morawaka',      contact: '076-7234567', address: '15 Galle Rd, Morawaka',          active: true,  salesPerson: 'Kamal Perera',       salesPersonPhone: '077-1112233', totalPayments:  12000 },
  { id: 24, name: 'Deniyaya Hardware Emporium',    route: 'Deniyaya',      contact: '072-8345678', address: '44 Matara Rd, Deniyaya',         active: false, salesPerson: 'Sunil Silva',        salesPersonPhone: '077-3334455', totalPayments:   5000 },
  { id: 25, name: 'Urubokka Steel Traders',        route: 'Urubokka',      contact: '077-9456789', address: '30 Colombo Rd, Urubokka',        active: true,  salesPerson: 'Priya Jayawardena',  salesPersonPhone: '077-4445566', totalPayments:  63000 },
];

/** Backward-compatible alias */
export const shops = initialStores;

/**
 * INVOICE SCHEMA (pure invoices only — payments are now inline in payments[] array)
 * id, shopId, date, docNo, amount, received, paymentMode ('credit'),
 * chequeNo, bankName, description, salesPerson, salesPersonPhone,
 * route, payments[]
 *
 * Each payment in payments[]: { id, date, amount, paymentMode, chequeNo, bankName, description }
 *
 * Balance Due is ALWAYS computed dynamically as: amount - received
 *
 * NOTE: Some entries now include chequeNo at the invoice level for Cheque/Bank column display.
 */
export const initialInvoices = [
  // ── Shanthi Electricals (id:1) — 18 transactions to trigger pagination ──
  { id:  1, shopId: 1, date: d(2),  docNo: 'INV-2026-001', amount: 185000, received: 50000,  paymentMode: 'credit', chequeNo: 'CHQ-458201', bankName: 'BOC Morawaka', description: 'Wiring supplies & cables',    salesPerson: 'Kamal Perera', salesPersonPhone: '077-1112233', route: 'Morawaka',
    payments: [{ id: 1, date: d(8),  amount: 50000,  paymentMode: 'cheque', chequeNo: 'CHQ-458201', bankName: 'BOC Morawaka',         description: 'Partial payment' }] },
  { id:  2, shopId: 1, date: d(5),  docNo: 'INV-2026-004', amount:  42000, received: 12000,   paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Electrical fittings bundle',  salesPerson: 'Kamal Perera', salesPersonPhone: '077-1112233', route: 'Morawaka',
    payments: [{ id: 2, date: d(10), amount: 12000,  paymentMode: 'cash',  chequeNo: '',        bankName: '',                 description: 'Partial cash payment' }] },
  { id:  4, shopId: 1, date: d(15), docNo: 'INV-2026-008', amount:  95000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Switchgears & breakers',      salesPerson: 'Kamal Perera', salesPersonPhone: '077-1112233', route: 'Morawaka',
    payments: [] },
  { id:  5, shopId: 1, date: d(25), docNo: 'INV-2026-012', amount: 250000, received: 100000,   paymentMode: 'credit', chequeNo: 'CHQ-458305', bankName: 'Peoples Bank Morawaka', description: 'Industrial lighting order',   salesPerson: 'Kamal Perera', salesPersonPhone: '077-1112233', route: 'Morawaka',
    payments: [{ id: 3, date: d(40), amount: 100000, paymentMode: 'cheque', chequeNo: 'CHQ-458305', bankName: 'Peoples Bank Morawaka', description: 'Cheque payment' }] },
  { id:  7, shopId: 1, date: d(60), docNo: 'INV-2026-018', amount:  78000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Wires & conduits',            salesPerson: 'Kamal Perera', salesPersonPhone: '077-1112233', route: 'Morawaka',
    payments: [] },
  { id: 35, shopId: 1, date: d(3),  docNo: 'INV-2026-025', amount:  55000, received: 15000,   paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Copper wires bundle',       salesPerson: 'Kamal Perera', salesPersonPhone: '077-1112233', route: 'Morawaka',
    payments: [] },
  { id: 36, shopId: 1, date: d(8),  docNo: 'INV-2026-026', amount:  32000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'PVC conduits & fittings',   salesPerson: 'Kamal Perera', salesPersonPhone: '077-1112233', route: 'Morawaka',
    payments: [] },
  { id: 37, shopId: 1, date: d(12), docNo: 'INV-2026-027', amount:  87000, received: 30000,   paymentMode: 'credit', chequeNo: 'CHQ-458340', bankName: 'BOC Morawaka', description: 'Distribution boards',       salesPerson: 'Kamal Perera', salesPersonPhone: '077-1112233', route: 'Morawaka',
    payments: [{ id: 17, date: d(20), amount: 30000, paymentMode: 'cheque', chequeNo: 'CHQ-458340', bankName: 'BOC Morawaka', description: 'Partial' }] },
  { id: 38, shopId: 1, date: d(18), docNo: 'INV-2026-028', amount:  22000, received: 22000,   paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Switches & sockets pack',    salesPerson: 'Kamal Perera', salesPersonPhone: '077-1112233', route: 'Morawaka',
    payments: [{ id: 18, date: d(22), amount: 22000, paymentMode: 'cash', chequeNo: '', bankName: '', description: 'Full payment' }] },
  { id: 39, shopId: 1, date: d(22), docNo: 'INV-2026-029', amount:  63000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'LED flood lights',           salesPerson: 'Kamal Perera', salesPersonPhone: '077-1112233', route: 'Morawaka',
    payments: [] },
  { id: 40, shopId: 1, date: d(28), docNo: 'INV-2026-030', amount: 120000, received: 40000,   paymentMode: 'credit', chequeNo: 'CHQ-458350', bankName: 'Peoples Bank Morawaka', description: 'Solar panel kit',            salesPerson: 'Kamal Perera', salesPersonPhone: '077-1112233', route: 'Morawaka',
    payments: [{ id: 19, date: d(35), amount: 40000, paymentMode: 'cheque', chequeNo: 'CHQ-458350', bankName: 'Peoples Bank Morawaka', description: 'Deposit' }] },
  { id: 41, shopId: 1, date: d(35), docNo: 'INV-2026-031', amount:  45000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Electrical safety gear',     salesPerson: 'Kamal Perera', salesPersonPhone: '077-1112233', route: 'Morawaka',
    payments: [] },
  { id: 42, shopId: 1, date: d(42), docNo: 'INV-2026-032', amount:  78000, received: 25000,   paymentMode: 'credit', chequeNo: 'CHQ-458360', bankName: 'BOC Morawaka', description: 'Industrial fans',            salesPerson: 'Kamal Perera', salesPersonPhone: '077-1112233', route: 'Morawaka',
    payments: [{ id: 20, date: d(48), amount: 25000, paymentMode: 'cheque', chequeNo: 'CHQ-458360', bankName: 'BOC Morawaka', description: 'Partial' }] },
  { id: 43, shopId: 1, date: d(48), docNo: 'INV-2026-033', amount:  33000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Cable trays & clips',        salesPerson: 'Kamal Perera', salesPersonPhone: '077-1112233', route: 'Morawaka',
    payments: [] },
  { id: 44, shopId: 1, date: d(55), docNo: 'INV-2026-034', amount:  92000, received: 30000,   paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Voltage stabilizers',         salesPerson: 'Kamal Perera', salesPersonPhone: '077-1112233', route: 'Morawaka',
    payments: [{ id: 21, date: d(62), amount: 30000, paymentMode: 'cash', chequeNo: '', bankName: '', description: 'Partial' }] },
  { id: 45, shopId: 1, date: d(65), docNo: 'INV-2026-035', amount:  15000, received: 15000,   paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Extension cords bulk',        salesPerson: 'Kamal Perera', salesPersonPhone: '077-1112233', route: 'Morawaka',
    payments: [{ id: 22, date: d(68), amount: 15000, paymentMode: 'cash', chequeNo: '', bankName: '', description: 'Full' }] },
  { id: 46, shopId: 1, date: d(70), docNo: 'INV-2026-036', amount:  68000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Emergency lights',            salesPerson: 'Kamal Perera', salesPersonPhone: '077-1112233', route: 'Morawaka',
    payments: [] },
  { id: 47, shopId: 1, date: d(78), docNo: 'INV-2026-037', amount:  54000, received: 10000,   paymentMode: 'credit', chequeNo: '', bankName: '', description: 'MCB & RCCB units',            salesPerson: 'Kamal Perera', salesPersonPhone: '077-1112233', route: 'Morawaka',
    payments: [] },

  // ── Moon Light Hardware (id:2) — 16+ transactions to trigger pagination ──
  { id:  8, shopId: 2, date: d(1),  docNo: 'INV-2026-002', amount: 125000, received: 45000,   paymentMode: 'credit', chequeNo: 'CHQ-458202', bankName: 'Sampath Bank Akuressa', description: 'Tools & hardware',            salesPerson: 'Nimal Fernando', salesPersonPhone: '077-2223344', route: 'Akuressa',
    payments: [{ id: 4, date: d(4),  amount: 125000, paymentMode: 'cheque', chequeNo: 'CHQ-458202', bankName: 'Sampath Bank Akuressa', description: 'Full payment' }] },
  { id: 10, shopId: 2, date: d(10), docNo: 'INV-2026-007', amount:  88000, received: 18000,   paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Plumbing supplies',           salesPerson: 'Nimal Fernando', salesPersonPhone: '077-2223344', route: 'Akuressa',
    payments: [{ id: 5, date: d(35), amount: 80000,  paymentMode: 'cheque', chequeNo: 'CHQ-458310', bankName: 'BOC Akuressa',         description: 'Partial payment' }] },
  { id: 11, shopId: 2, date: d(20), docNo: 'INV-2026-010', amount: 165000, received: 100000,  paymentMode: 'credit', chequeNo: 'CHQ-458310', bankName: 'BOC Akuressa', description: 'Electrical appliances',       salesPerson: 'Nimal Fernando', salesPersonPhone: '077-2223344', route: 'Akuressa',
    payments: [{ id: 6, date: d(25), amount: 100000, paymentMode: 'cheque', chequeNo: 'CHQ-458310', bankName: 'BOC Akuressa',         description: 'Partial payment' }] },
  { id: 48, shopId: 2, date: d(3),  docNo: 'INV-2026-038', amount:  42000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Hardware tool set',          salesPerson: 'Nimal Fernando', salesPersonPhone: '077-2223344', route: 'Akuressa',
    payments: [] },
  { id: 49, shopId: 2, date: d(7),  docNo: 'INV-2026-039', amount:  78000, received: 25000,   paymentMode: 'credit', chequeNo: 'CHQ-458370', bankName: 'Sampath Bank Akuressa', description: 'Paint & brushes bulk',       salesPerson: 'Nimal Fernando', salesPersonPhone: '077-2223344', route: 'Akuressa',
    payments: [{ id: 23, date: d(14), amount: 25000, paymentMode: 'cheque', chequeNo: 'CHQ-458370', bankName: 'Sampath Bank Akuressa', description: 'Deposit' }] },
  { id: 50, shopId: 2, date: d(12), docNo: 'INV-2026-040', amount:  55000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Ladders & scaffolding',       salesPerson: 'Nimal Fernando', salesPersonPhone: '077-2223344', route: 'Akuressa',
    payments: [] },
  { id: 51, shopId: 2, date: d(16), docNo: 'INV-2026-041', amount:  23000, received: 23000,   paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Nails & fasteners pack',      salesPerson: 'Nimal Fernando', salesPersonPhone: '077-2223344', route: 'Akuressa',
    payments: [{ id: 24, date: d(19), amount: 23000, paymentMode: 'cash', chequeNo: '', bankName: '', description: 'Full' }] },
  { id: 52, shopId: 2, date: d(22), docNo: 'INV-2026-042', amount:  97000, received: 35000,   paymentMode: 'credit', chequeNo: 'CHQ-458380', bankName: 'BOC Akuressa', description: 'Power tools set',             salesPerson: 'Nimal Fernando', salesPersonPhone: '077-2223344', route: 'Akuressa',
    payments: [{ id: 25, date: d(30), amount: 35000, paymentMode: 'cheque', chequeNo: 'CHQ-458380', bankName: 'BOC Akuressa', description: 'Partial' }] },
  { id: 53, shopId: 2, date: d(28), docNo: 'INV-2026-043', amount:  62000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Garden tools assortment',     salesPerson: 'Nimal Fernando', salesPersonPhone: '077-2223344', route: 'Akuressa',
    payments: [] },
  { id: 54, shopId: 2, date: d(34), docNo: 'INV-2026-044', amount:  34000, received: 10000,   paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Measuring instruments',       salesPerson: 'Nimal Fernando', salesPersonPhone: '077-2223344', route: 'Akuressa',
    payments: [] },
  { id: 55, shopId: 2, date: d(40), docNo: 'INV-2026-045', amount: 140000, received: 50000,   paymentMode: 'credit', chequeNo: 'CHQ-458390', bankName: 'Sampath Bank Akuressa', description: 'Cement & steel order',         salesPerson: 'Nimal Fernando', salesPersonPhone: '077-2223344', route: 'Akuressa',
    payments: [{ id: 26, date: d(46), amount: 50000, paymentMode: 'cheque', chequeNo: 'CHQ-458390', bankName: 'Sampath Bank Akuressa', description: 'Advance' }] },
  { id: 56, shopId: 2, date: d(48), docNo: 'INV-2026-046', amount:  28000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Safety helmets & gloves',     salesPerson: 'Nimal Fernando', salesPersonPhone: '077-2223344', route: 'Akuressa',
    payments: [] },
  { id: 57, shopId: 2, date: d(54), docNo: 'INV-2026-047', amount:  85000, received: 20000,   paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Pipe fittings & valves',       salesPerson: 'Nimal Fernando', salesPersonPhone: '077-2223344', route: 'Akuressa',
    payments: [] },
  { id: 58, shopId: 2, date: d(62), docNo: 'INV-2026-048', amount:  48000, received: 48000,   paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Keys & locks bulk',            salesPerson: 'Nimal Fernando', salesPersonPhone: '077-2223344', route: 'Akuressa',
    payments: [{ id: 27, date: d(65), amount: 48000, paymentMode: 'cash', chequeNo: '', bankName: '', description: 'Full' }] },
  { id: 59, shopId: 2, date: d(70), docNo: 'INV-2026-049', amount:  73000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Generator spare parts',       salesPerson: 'Nimal Fernando', salesPersonPhone: '077-2223344', route: 'Akuressa',
    payments: [] },
  { id: 60, shopId: 2, date: d(80), docNo: 'INV-2026-050', amount:  19000, received: 5000,    paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Workshop consumables',        salesPerson: 'Nimal Fernando', salesPersonPhone: '077-2223344', route: 'Akuressa',
    payments: [] },

  // ── Samagi Electrical Center (id:3) ──
  { id: 13, shopId: 3, date: d(3),  docNo: 'INV-2026-003', amount: 210000, received: 60000,   paymentMode: 'credit', chequeNo: 'CHQ-458302', bankName: 'BOC Deniyaya', description: 'CCTV & security',             salesPerson: 'Sunil Silva', salesPersonPhone: '077-3334455', route: 'Deniyaya',
    payments: [{ id: 7, date: d(12), amount: 100000, paymentMode: 'cheque', chequeNo: 'CHQ-458302', bankName: 'BOC Deniyaya',         description: 'Advance payment' }] },
  { id: 14, shopId: 3, date: d(7),  docNo: 'INV-2026-005', amount:  55000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Lighting fixtures',           salesPerson: 'Sunil Silva', salesPersonPhone: '077-3334455', route: 'Deniyaya',
    payments: [] },
  { id: 16, shopId: 3, date: d(18), docNo: 'INV-2026-009', amount: 142000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Cables & switches',           salesPerson: 'Sunil Silva', salesPersonPhone: '077-3334455', route: 'Deniyaya',
    payments: [] },

  // ── Lanka Lighting House (id:4) ──
  { id: 17, shopId: 4, date: d(6),  docNo: 'INV-2026-006', amount: 320000, received: 150000,  paymentMode: 'credit', chequeNo: '', bankName: '', description: 'LED panels & bulbs',   salesPerson: 'Priya Jayawardena', salesPersonPhone: '077-4445566', route: 'Urubokka',
    payments: [{ id: 8, date: d(14), amount: 150000, paymentMode: 'cash',   chequeNo: '',        bankName: '',              description: 'Cash payment' },
               { id: 9, date: d(30), amount: 80000,  paymentMode: 'check',  chequeNo: 'CHK-221001', bankName: 'HNB Urubokka', description: 'Direct bank check' }] },
  { id: 19, shopId: 4, date: d(22), docNo: 'INV-2026-011', amount:  98000, received: 80000,    paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Decorative lights',    salesPerson: 'Priya Jayawardena', salesPersonPhone: '077-4445566', route: 'Urubokka',
    payments: [] },

  // ── Star Engineering Supplies (id:5) ──
  { id: 20, shopId: 5, date: d(9),  docNo: 'INV-2026-013', amount:  45000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Tools equipment',     salesPerson: 'Rohan Weerasinghe', salesPersonPhone: '077-5556677', route: 'Morawaka',
    payments: [] },
  { id: 21, shopId: 5, date: d(16), docNo: 'INV-2026-015', amount:  78000, received: 0,        paymentMode: 'credit', chequeNo: 'CHQ-458315', bankName: 'Peoples Bank Morawaka', description: 'Safety gear',         salesPerson: 'Rohan Weerasinghe', salesPersonPhone: '077-5556677', route: 'Morawaka',
    payments: [{ id: 10, date: d(28), amount: 45000, paymentMode: 'cheque', chequeNo: 'CHQ-458315', bankName: 'Peoples Bank Morawaka', description: 'Full settlement' }] },

  // ── Royal Hardware Mart (id:6) ──
  { id: 23, shopId: 6, date: d(11), docNo: 'INV-2026-014', amount: 195000, received: 60000,   paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Building materials',  salesPerson: 'Saman Kumara', salesPersonPhone: '077-6667788', route: 'Akuressa',
    payments: [{ id: 11, date: d(25), amount: 60000, paymentMode: 'cash',   chequeNo: '',        bankName: '',              description: 'Cash settlement' }] },
  { id: 24, shopId: 6, date: d(19), docNo: 'INV-2026-016', amount:  65000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Paint supplies',      salesPerson: 'Saman Kumara', salesPersonPhone: '077-6667788', route: 'Akuressa',
    payments: [] },

  // ── City Light Electricals (id:8) ──
  { id: 25, shopId: 8, date: d(13), docNo: 'INV-2026-017', amount: 280000, received: 100000,  paymentMode: 'credit', chequeNo: 'CHQ-458320', bankName: 'Seylan Urubokka', description: 'Solar equipment',     salesPerson: 'Lalith Dissanayake', salesPersonPhone: '077-8889900', route: 'Urubokka',
    payments: [{ id: 12, date: d(21), amount: 100000, paymentMode: 'cheque', chequeNo: 'CHQ-458320', bankName: 'Seylan Urubokka', description: 'Installment' }] },

  // ── Sathosa Hardware & Electricals (id:9) ──
  { id: 27, shopId: 9, date: d(17), docNo: 'INV-2026-019', amount: 125000, received: 50000,   paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Generator supplies',  salesPerson: 'Ajith Bandara', salesPersonPhone: '077-9990011', route: 'Kamburupitiya',
    payments: [{ id: 13, date: d(30), amount: 50000, paymentMode: 'cash',   chequeNo: '',        bankName: '',              description: 'Cash payment' }] },
  { id: 29, shopId: 9, date: d(45), docNo: 'INV-2026-020', amount:  88000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Water pumps',         salesPerson: 'Ajith Bandara', salesPersonPhone: '077-9990011', route: 'Kamburupitiya',
    payments: [] },

  // ── Nimal Electrical Center (id:10) ──
  { id: 30, shopId: 10, date: d(23), docNo: 'INV-2026-021', amount:  72000, received: 72000,  paymentMode: 'credit', chequeNo: 'CHQ-458325', bankName: 'Peoples Bank Kamburupitiya', description: 'Wiring accessories',  salesPerson: 'Dinesh Kumara', salesPersonPhone: '077-1002003', route: 'Kamburupitiya',
    payments: [{ id: 14, date: d(38), amount: 72000, paymentMode: 'cheque', chequeNo: 'CHQ-458325', bankName: 'Peoples Bank Kamburupitiya', description: 'Full settlement' }] },

  // ── Metro Electrical House (id:12) ──
  { id: 32, shopId: 12, date: d(26), docNo: 'INV-2026-022', amount: 350000, received: 100000,  paymentMode: 'credit', chequeNo: 'CHQ-458330', bankName: 'BOC Akuressa', description: 'Transformer & switchgear', salesPerson: 'Mahesh Jayasuriya', salesPersonPhone: '077-5006007', route: 'Akuressa',
    payments: [{ id: 15, date: d(33), amount: 100000, paymentMode: 'cheque', chequeNo: 'CHQ-458330', bankName: 'BOC Akuressa',  description: 'Advance' }] },
  { id: 34, shopId: 12, date: d(42), docNo: 'INV-2026-023', amount:  45000, received: 50000,   paymentMode: 'credit', chequeNo: 'CHK-331002', bankName: 'NSB Akuressa', description: 'Additional cables',   salesPerson: 'Mahesh Jayasuriya', salesPersonPhone: '077-5006007', route: 'Akuressa',
    payments: [{ id: 16, date: d(50), amount: 50000, paymentMode: 'check',  chequeNo: 'CHK-331002', bankName: 'NSB Akuressa',  description: 'Direct check' }] },

  // ── Nilwala Hardware (id:13) ──
  { id: 61, shopId: 13, date: d(5),  docNo: 'INV-2026-051', amount:  65000, received: 10000,   paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Hardware supplies',         salesPerson: 'Kamal Perera', salesPersonPhone: '077-1112233', route: 'Morawaka',
    payments: [] },
  { id: 62, shopId: 13, date: d(20), docNo: 'INV-2026-052', amount:  42000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Electrical wires',           salesPerson: 'Kamal Perera', salesPersonPhone: '077-1112233', route: 'Morawaka',
    payments: [] },

  // ── Ruhunu Traders (id:14) ──
  { id: 63, shopId: 14, date: d(8),  docNo: 'INV-2026-053', amount:  88000, received: 30000,   paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Building materials',         salesPerson: 'Nimal Fernando', salesPersonPhone: '077-2223344', route: 'Akuressa',
    payments: [{ id: 28, date: d(15), amount: 30000, paymentMode: 'cash', chequeNo: '', bankName: '', description: 'Deposit' }] },
  { id: 64, shopId: 14, date: d(25), docNo: 'INV-2026-054', amount:  35000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Paint & accessories',        salesPerson: 'Nimal Fernando', salesPersonPhone: '077-2223344', route: 'Akuressa',
    payments: [] },

  // ── Galle Steel House (id:15) ──
  { id: 65, shopId: 15, date: d(10), docNo: 'INV-2026-055', amount: 120000, received: 40000,   paymentMode: 'credit', chequeNo: 'CHQ-458400', bankName: 'BOC Deniyaya', description: 'Steel rods order',           salesPerson: 'Sunil Silva', salesPersonPhone: '077-3334455', route: 'Deniyaya',
    payments: [{ id: 29, date: d(18), amount: 40000, paymentMode: 'cheque', chequeNo: 'CHQ-458400', bankName: 'BOC Deniyaya', description: 'Advance' }] },
  { id: 66, shopId: 15, date: d(30), docNo: 'INV-2026-056', amount:  55000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Steel pipes & fittings',      salesPerson: 'Sunil Silva', salesPersonPhone: '077-3334455', route: 'Deniyaya',
    payments: [] },

  // ── Uva Lighting Centre (id:16) ──
  { id: 67, shopId: 16, date: d(12), docNo: 'INV-2026-057', amount:  48000, received: 18000,   paymentMode: 'credit', chequeNo: '', bankName: '', description: 'LED bulbs & tubes',           salesPerson: 'Priya Jayawardena', salesPersonPhone: '077-4445566', route: 'Urubokka',
    payments: [{ id: 30, date: d(22), amount: 18000, paymentMode: 'cash', chequeNo: '', bankName: '', description: 'Partial' }] },
  { id: 68, shopId: 16, date: d(28), docNo: 'INV-2026-058', amount:  72000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Decorative lighting',         salesPerson: 'Priya Jayawardena', salesPersonPhone: '077-4445566', route: 'Urubokka',
    payments: [] },

  // ── Lanka Pipe & Steel (id:17) ──
  { id: 69, shopId: 17, date: d(14), docNo: 'INV-2026-059', amount:  53000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'PVC pipes & fittings',        salesPerson: 'Ajith Bandara', salesPersonPhone: '077-9990011', route: 'Kamburupitiya',
    payments: [] },
  { id: 70, shopId: 17, date: d(32), docNo: 'INV-2026-060', amount:  25000, received: 25000,   paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Pipe connectors',             salesPerson: 'Ajith Bandara', salesPersonPhone: '077-9990011', route: 'Kamburupitiya',
    payments: [{ id: 31, date: d(36), amount: 25000, paymentMode: 'cash', chequeNo: '', bankName: '', description: 'Full' }] },

  // ── Southern Hardware Mart (id:18) ──
  { id: 71, shopId: 18, date: d(6),  docNo: 'INV-2026-061', amount:  77000, received: 20000,   paymentMode: 'credit', chequeNo: '', bankName: '', description: 'General hardware order',       salesPerson: 'Rohan Weerasinghe', salesPersonPhone: '077-5556677', route: 'Morawaka',
    payments: [{ id: 32, date: d(14), amount: 20000, paymentMode: 'cash', chequeNo: '', bankName: '', description: 'Deposit' }] },
  { id: 72, shopId: 18, date: d(22), docNo: 'INV-2026-062', amount:  34000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Toolbox sets',               salesPerson: 'Rohan Weerasinghe', salesPersonPhone: '077-5556677', route: 'Morawaka',
    payments: [] },

  // ── Ceylon Electrical Traders (id:19) ──
  { id: 73, shopId: 19, date: d(15), docNo: 'INV-2026-063', amount:  15000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Small electrical items',       salesPerson: 'Upul Rathnayake', salesPersonPhone: '077-7778899', route: 'Deniyaya',
    payments: [] },

  // ── Pabasara Engineering (id:20) ──
  { id: 74, shopId: 20, date: d(9),  docNo: 'INV-2026-064', amount:  64000, received: 15000,   paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Engineering supplies',         salesPerson: 'Saman Kumara', salesPersonPhone: '077-6667788', route: 'Akuressa',
    payments: [{ id: 33, date: d(18), amount: 15000, paymentMode: 'cash', chequeNo: '', bankName: '', description: 'Partial' }] },
  { id: 75, shopId: 20, date: d(26), docNo: 'INV-2026-065', amount:  28000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Measuring tools',              salesPerson: 'Saman Kumara', salesPersonPhone: '077-6667788', route: 'Akuressa',
    payments: [] },

  // ══════════════════════════════════════════════════════════════════
  //  ADDITIONAL TRANSACTIONS — ENSURE 20+ PER KEY DEBTOR
  // ══════════════════════════════════════════════════════════════════

  // ── Shanthi Electricals (id:1) — 4 more to reach 22 total ──
  { id: 76, shopId: 1, date: d(82), docNo: 'INV-2026-066', amount:  88000, received: 20000,   paymentMode: 'credit', chequeNo: 'CHQ-458410', bankName: 'BOC Morawaka', description: 'Electric motor rewinding',    salesPerson: 'Kamal Perera', salesPersonPhone: '077-1112233', route: 'Morawaka',
    payments: [{ id: 34, date: d(88), amount: 20000, paymentMode: 'cheque', chequeNo: 'CHQ-458410', bankName: 'BOC Morawaka', description: 'Partial' }] },
  { id: 77, shopId: 1, date: d(88), docNo: 'INV-2026-067', amount:  47000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Digital multimeters bulk',      salesPerson: 'Kamal Perera', salesPersonPhone: '077-1112233', route: 'Morawaka',
    payments: [] },
  { id: 78, shopId: 1, date: d(94), docNo: 'INV-2026-068', amount:  56000, received: 15000,   paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Panel meters & gauges',         salesPerson: 'Kamal Perera', salesPersonPhone: '077-1112233', route: 'Morawaka',
    payments: [{ id: 35, date: d(100), amount: 15000, paymentMode: 'cash', chequeNo: '', bankName: '', description: 'Partial' }] },
  { id: 79, shopId: 1, date: d(100), docNo: 'INV-2026-069', amount:  39000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Heat shrink tubing & connectors', salesPerson: 'Kamal Perera', salesPersonPhone: '077-1112233', route: 'Morawaka',
    payments: [] },

  // ── Samagi Electrical Center (id:3) — 18 more to reach 21 total ──
  { id: 80, shopId: 3, date: d(4),  docNo: 'INV-2026-070', amount:  62000, received: 15000,   paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Distribution fuse boards',    salesPerson: 'Sunil Silva', salesPersonPhone: '077-3334455', route: 'Deniyaya',
    payments: [{ id: 36, date: d(10), amount: 15000, paymentMode: 'cash', chequeNo: '', bankName: '', description: 'Deposit' }] },
  { id: 81, shopId: 3, date: d(8),  docNo: 'INV-2026-071', amount:  84000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Electrical conduit pipes',     salesPerson: 'Sunil Silva', salesPersonPhone: '077-3334455', route: 'Deniyaya',
    payments: [] },
  { id: 82, shopId: 3, date: d(14), docNo: 'INV-2026-072', amount:  45000, received: 45000,   paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Ceiling fans complete set',     salesPerson: 'Sunil Silva', salesPersonPhone: '077-3334455', route: 'Deniyaya',
    payments: [{ id: 37, date: d(18), amount: 45000, paymentMode: 'cash', chequeNo: '', bankName: '', description: 'Full settlement' }] },
  { id: 83, shopId: 3, date: d(20), docNo: 'INV-2026-073', amount:  93000, received: 30000,   paymentMode: 'credit', chequeNo: 'CHQ-458420', bankName: 'BOC Deniyaya', description: 'Battery bank installation',    salesPerson: 'Sunil Silva', salesPersonPhone: '077-3334455', route: 'Deniyaya',
    payments: [{ id: 38, date: d(26), amount: 30000, paymentMode: 'cheque', chequeNo: 'CHQ-458420', bankName: 'BOC Deniyaya', description: 'Advance' }] },
  { id: 84, shopId: 3, date: d(26), docNo: 'INV-2026-074', amount:  37000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Timer switches & sensors',     salesPerson: 'Sunil Silva', salesPersonPhone: '077-3334455', route: 'Deniyaya',
    payments: [] },
  { id: 85, shopId: 3, date: d(32), docNo: 'INV-2026-075', amount:  78000, received: 10000,   paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Earthing rods & cables',        salesPerson: 'Sunil Silva', salesPersonPhone: '077-3334455', route: 'Deniyaya',
    payments: [] },
  { id: 86, shopId: 3, date: d(38), docNo: 'INV-2026-076', amount:  55000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Weatherproof enclosures',       salesPerson: 'Sunil Silva', salesPersonPhone: '077-3334455', route: 'Deniyaya',
    payments: [] },
  { id: 87, shopId: 3, date: d(44), docNo: 'INV-2026-077', amount:  66000, received: 20000,   paymentMode: 'credit', chequeNo: 'CHQ-458430', bankName: 'Peoples Bank Deniyaya', description: 'Industrial plugs & sockets',   salesPerson: 'Sunil Silva', salesPersonPhone: '077-3334455', route: 'Deniyaya',
    payments: [{ id: 39, date: d(50), amount: 20000, paymentMode: 'cheque', chequeNo: 'CHQ-458430', bankName: 'Peoples Bank Deniyaya', description: 'Deposit' }] },
  { id: 88, shopId: 3, date: d(50), docNo: 'INV-2026-078', amount:  29000, received: 29000,   paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Bulk cable ties pack',          salesPerson: 'Sunil Silva', salesPersonPhone: '077-3334455', route: 'Deniyaya',
    payments: [{ id: 40, date: d(54), amount: 29000, paymentMode: 'cash', chequeNo: '', bankName: '', description: 'Full' }] },
  { id: 89, shopId: 3, date: d(56), docNo: 'INV-2026-079', amount: 115000, received: 40000,   paymentMode: 'credit', chequeNo: 'CHQ-458440', bankName: 'BOC Deniyaya', description: 'Solar inverter system',        salesPerson: 'Sunil Silva', salesPersonPhone: '077-3334455', route: 'Deniyaya',
    payments: [{ id: 41, date: d(62), amount: 40000, paymentMode: 'cheque', chequeNo: 'CHQ-458440', bankName: 'BOC Deniyaya', description: 'Advance' }] },
  { id: 90, shopId: 3, date: d(64), docNo: 'INV-2026-080', amount:  48000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Phase converter units',         salesPerson: 'Sunil Silva', salesPersonPhone: '077-3334455', route: 'Deniyaya',
    payments: [] },
  { id: 91, shopId: 3, date: d(72), docNo: 'INV-2026-081', amount:  34000, received: 10000,   paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Contactors & relays bulk',      salesPerson: 'Sunil Silva', salesPersonPhone: '077-3334455', route: 'Deniyaya',
    payments: [] },
  { id: 92, shopId: 3, date: d(80), docNo: 'INV-2026-082', amount:  71000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Electrical panel accessories',  salesPerson: 'Sunil Silva', salesPersonPhone: '077-3334455', route: 'Deniyaya',
    payments: [] },
  { id: 93, shopId: 3, date: d(86), docNo: 'INV-2026-083', amount:  52000, received: 18000,   paymentMode: 'credit', chequeNo: 'CHQ-458450', bankName: 'Peoples Bank Deniyaya', description: 'Submersible pump controller',  salesPerson: 'Sunil Silva', salesPersonPhone: '077-3334455', route: 'Deniyaya',
    payments: [{ id: 42, date: d(92), amount: 18000, paymentMode: 'cheque', chequeNo: 'CHQ-458450', bankName: 'Peoples Bank Deniyaya', description: 'Partial' }] },
  { id: 94, shopId: 3, date: d(94), docNo: 'INV-2026-084', amount:  27000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Miniature circuit breakers',    salesPerson: 'Sunil Silva', salesPersonPhone: '077-3334455', route: 'Deniyaya',
    payments: [] },
  { id: 95, shopId: 3, date: d(100), docNo: 'INV-2026-085', amount:  63000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'LED street lights',             salesPerson: 'Sunil Silva', salesPersonPhone: '077-3334455', route: 'Deniyaya',
    payments: [] },
  { id: 96, shopId: 3, date: d(108), docNo: 'INV-2026-086', amount:  39000, received: 39000,   paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Wire strippers tool set',        salesPerson: 'Sunil Silva', salesPersonPhone: '077-3334455', route: 'Deniyaya',
    payments: [{ id: 43, date: d(112), amount: 39000, paymentMode: 'cash', chequeNo: '', bankName: '', description: 'Full' }] },
  { id: 97, shopId: 3, date: d(118), docNo: 'INV-2026-087', amount:  46000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Power factor correction units',  salesPerson: 'Sunil Silva', salesPersonPhone: '077-3334455', route: 'Deniyaya',
    payments: [] },

  // ── Metro Electrical House (id:12) — 19 more to reach 21 total ──
  { id: 98, shopId: 12, date: d(2),  docNo: 'INV-2026-088', amount:  52000, received: 12000,   paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Electrical test equipment',     salesPerson: 'Mahesh Jayasuriya', salesPersonPhone: '077-5006007', route: 'Akuressa',
    payments: [{ id: 44, date: d(8), amount: 12000, paymentMode: 'cash', chequeNo: '', bankName: '', description: 'Deposit' }] },
  { id: 99, shopId: 12, date: d(6),  docNo: 'INV-2026-089', amount:  77000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Wire harness assembly bulk',    salesPerson: 'Mahesh Jayasuriya', salesPersonPhone: '077-5006007', route: 'Akuressa',
    payments: [] },
  { id: 100, shopId: 12, date: d(12), docNo: 'INV-2026-090', amount:  44000, received: 44000,   paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Terminal blocks & connectors',   salesPerson: 'Mahesh Jayasuriya', salesPersonPhone: '077-5006007', route: 'Akuressa',
    payments: [{ id: 45, date: d(16), amount: 44000, paymentMode: 'cash', chequeNo: '', bankName: '', description: 'Full settlement' }] },
  { id: 101, shopId: 12, date: d(18), docNo: 'INV-2026-091', amount:  92000, received: 25000,   paymentMode: 'credit', chequeNo: 'CHQ-458460', bankName: 'Sampath Bank Akuressa', description: 'HVAC control panels',          salesPerson: 'Mahesh Jayasuriya', salesPersonPhone: '077-5006007', route: 'Akuressa',
    payments: [{ id: 46, date: d(24), amount: 25000, paymentMode: 'cheque', chequeNo: 'CHQ-458460', bankName: 'Sampath Bank Akuressa', description: 'Advance' }] },
  { id: 102, shopId: 12, date: d(24), docNo: 'INV-2026-092', amount:  35000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Temperature controllers',       salesPerson: 'Mahesh Jayasuriya', salesPersonPhone: '077-5006007', route: 'Akuressa',
    payments: [] },
  { id: 103, shopId: 12, date: d(30), docNo: 'INV-2026-093', amount:  68000, received: 18000,   paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Variable frequency drives',      salesPerson: 'Mahesh Jayasuriya', salesPersonPhone: '077-5006007', route: 'Akuressa',
    payments: [] },
  { id: 104, shopId: 12, date: d(36), docNo: 'INV-2026-094', amount:  83000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Industrial heaters & elements',  salesPerson: 'Mahesh Jayasuriya', salesPersonPhone: '077-5006007', route: 'Akuressa',
    payments: [] },
  { id: 105, shopId: 12, date: d(44), docNo: 'INV-2026-095', amount:  56000, received: 15000,   paymentMode: 'credit', chequeNo: 'CHQ-458470', bankName: 'NSB Akuressa', description: 'Surge protection devices',      salesPerson: 'Mahesh Jayasuriya', salesPersonPhone: '077-5006007', route: 'Akuressa',
    payments: [{ id: 47, date: d(50), amount: 15000, paymentMode: 'cheque', chequeNo: 'CHQ-458470', bankName: 'NSB Akuressa', description: 'Partial' }] },
  { id: 106, shopId: 12, date: d(52), docNo: 'INV-2026-096', amount:  41000, received: 41000,   paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Crimping tools & dies set',       salesPerson: 'Mahesh Jayasuriya', salesPersonPhone: '077-5006007', route: 'Akuressa',
    payments: [{ id: 48, date: d(56), amount: 41000, paymentMode: 'cash', chequeNo: '', bankName: '', description: 'Full' }] },
  { id: 107, shopId: 12, date: d(60), docNo: 'INV-2026-097', amount: 125000, received: 50000,   paymentMode: 'credit', chequeNo: 'CHQ-458480', bankName: 'BOC Akuressa', description: 'Diesel generator set',          salesPerson: 'Mahesh Jayasuriya', salesPersonPhone: '077-5006007', route: 'Akuressa',
    payments: [{ id: 49, date: d(66), amount: 50000, paymentMode: 'cheque', chequeNo: 'CHQ-458480', bankName: 'BOC Akuressa', description: 'Advance' }] },
  { id: 108, shopId: 12, date: d(68), docNo: 'INV-2026-098', amount:  32000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Energy meters & loggers',       salesPerson: 'Mahesh Jayasuriya', salesPersonPhone: '077-5006007', route: 'Akuressa',
    payments: [] },
  { id: 109, shopId: 12, date: d(76), docNo: 'INV-2026-099', amount:  59000, received: 10000,   paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Capacitor bank units',            salesPerson: 'Mahesh Jayasuriya', salesPersonPhone: '077-5006007', route: 'Akuressa',
    payments: [] },
  { id: 110, shopId: 12, date: d(84), docNo: 'INV-2026-100', amount:  74000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Busbar trunking system',          salesPerson: 'Mahesh Jayasuriya', salesPersonPhone: '077-5006007', route: 'Akuressa',
    payments: [] },
  { id: 111, shopId: 12, date: d(90), docNo: 'INV-2026-101', amount:  38000, received: 12000,   paymentMode: 'credit', chequeNo: 'CHQ-458490', bankName: 'Commercial Bank Akuressa', description: 'Lighting contactors',            salesPerson: 'Mahesh Jayasuriya', salesPersonPhone: '077-5006007', route: 'Akuressa',
    payments: [{ id: 50, date: d(96), amount: 12000, paymentMode: 'cheque', chequeNo: 'CHQ-458490', bankName: 'Commercial Bank Akuressa', description: 'Deposit' }] },
  { id: 112, shopId: 12, date: d(98), docNo: 'INV-2026-102', amount:  26000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Signal towers & beacons',        salesPerson: 'Mahesh Jayasuriya', salesPersonPhone: '077-5006007', route: 'Akuressa',
    payments: [] },
  { id: 113, shopId: 12, date: d(104), docNo: 'INV-2026-103', amount:  51000, received: 20000,   paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Panel mount meters',              salesPerson: 'Mahesh Jayasuriya', salesPersonPhone: '077-5006007', route: 'Akuressa',
    payments: [{ id: 51, date: d(110), amount: 20000, paymentMode: 'cash', chequeNo: '', bankName: '', description: 'Partial' }] },
  { id: 114, shopId: 12, date: d(114), docNo: 'INV-2026-104', amount:  67000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Cable management system',         salesPerson: 'Mahesh Jayasuriya', salesPersonPhone: '077-5006007', route: 'Akuressa',
    payments: [] },
  { id: 115, shopId: 12, date: d(120), docNo: 'INV-2026-105', amount:  43000, received: 43000,   paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Safety lockout tagout kit',       salesPerson: 'Mahesh Jayasuriya', salesPersonPhone: '077-5006007', route: 'Akuressa',
    payments: [{ id: 52, date: d(124), amount: 43000, paymentMode: 'cash', chequeNo: '', bankName: '', description: 'Full' }] },
  { id: 116, shopId: 12, date: d(130), docNo: 'INV-2026-106', amount:  54000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Megger insulation testers',       salesPerson: 'Mahesh Jayasuriya', salesPersonPhone: '077-5006007', route: 'Akuressa',
    payments: [] },

  // ── Southern Steel House (id:21) — 3 transactions ──
  { id: 117, shopId: 21, date: d(5),  docNo: 'INV-2026-107', amount:  65000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Steel girder order',             salesPerson: 'Nimal Fernando', salesPersonPhone: '077-2223344', route: 'Kotapola',
    payments: [] },
  { id: 118, shopId: 21, date: d(15), docNo: 'INV-2026-108', amount:  32000, received: 12000,   paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Steel fasteners pack',            salesPerson: 'Nimal Fernando', salesPersonPhone: '077-2223344', route: 'Kotapola',
    payments: [{ id: 53, date: d(22), amount: 12000, paymentMode: 'cash', chequeNo: '', bankName: '', description: 'Partial' }] },
  { id: 119, shopId: 21, date: d(28), docNo: 'INV-2026-109', amount:  44000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Steel reinforcement bars',        salesPerson: 'Nimal Fernando', salesPersonPhone: '077-2223344', route: 'Kotapola',
    payments: [] },

  // ── Matara Brick Supply (id:22) — 3 transactions ──
  { id: 120, shopId: 22, date: d(4),  docNo: 'INV-2026-110', amount:  28000, received: 10000,   paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Red clay bricks 1000 pcs',        salesPerson: 'Lalith Dissanayake', salesPersonPhone: '077-8889900', route: 'Hakmana',
    payments: [{ id: 54, date: d(10), amount: 10000, paymentMode: 'cash', chequeNo: '', bankName: '', description: 'Deposit' }] },
  { id: 121, shopId: 22, date: d(12), docNo: 'INV-2026-111', amount:  52000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Cement blocks 500 pcs',           salesPerson: 'Lalith Dissanayake', salesPersonPhone: '077-8889900', route: 'Hakmana',
    payments: [] },
  { id: 122, shopId: 22, date: d(22), docNo: 'INV-2026-112', amount:  38000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Floor tiles supply',              salesPerson: 'Lalith Dissanayake', salesPersonPhone: '077-8889900', route: 'Hakmana',
    payments: [] },

  // ── Nilwala Paint Center (id:23) — 3 transactions ──
  { id: 123, shopId: 23, date: d(3),  docNo: 'INV-2026-113', amount:  22000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Interior emulsion paint',        salesPerson: 'Kamal Perera', salesPersonPhone: '077-1112233', route: 'Morawaka',
    payments: [] },
  { id: 124, shopId: 23, date: d(14), docNo: 'INV-2026-114', amount:  45000, received: 15000,   paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Exterior paint & primer',         salesPerson: 'Kamal Perera', salesPersonPhone: '077-1112233', route: 'Morawaka',
    payments: [{ id: 55, date: d(20), amount: 15000, paymentMode: 'cash', chequeNo: '', bankName: '', description: 'Partial' }] },
  { id: 125, shopId: 23, date: d(26), docNo: 'INV-2026-115', amount:  18000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Paint brushes & rollers',        salesPerson: 'Kamal Perera', salesPersonPhone: '077-1112233', route: 'Morawaka',
    payments: [] },

  // ── Deniyaya Hardware Emporium (id:24) — 2 transactions ──
  { id: 126, shopId: 24, date: d(10), docNo: 'INV-2026-116', amount:  15000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'General hardware assortment',    salesPerson: 'Sunil Silva', salesPersonPhone: '077-3334455', route: 'Deniyaya',
    payments: [] },
  { id: 127, shopId: 24, date: d(20), docNo: 'INV-2026-117', amount:  22000, received: 5000,    paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Nails & screws bulk pack',       salesPerson: 'Sunil Silva', salesPersonPhone: '077-3334455', route: 'Deniyaya',
    payments: [{ id: 56, date: d(26), amount: 5000, paymentMode: 'cash', chequeNo: '', bankName: '', description: 'Deposit' }] },

  // ── Urubokka Steel Traders (id:25) — 3 transactions ──
  { id: 128, shopId: 25, date: d(6),  docNo: 'INV-2026-118', amount:  48000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Steel angle bars order',          salesPerson: 'Priya Jayawardena', salesPersonPhone: '077-4445566', route: 'Urubokka',
    payments: [] },
  { id: 129, shopId: 25, date: d(16), docNo: 'INV-2026-119', amount:  56000, received: 20000,   paymentMode: 'credit', chequeNo: 'CHQ-458500', bankName: 'HNB Urubokka', description: 'Metal sheets & panels',         salesPerson: 'Priya Jayawardena', salesPersonPhone: '077-4445566', route: 'Urubokka',
    payments: [{ id: 57, date: d(22), amount: 20000, paymentMode: 'cheque', chequeNo: 'CHQ-458500', bankName: 'HNB Urubokka', description: 'Advance' }] },
  { id: 130, shopId: 25, date: d(30), docNo: 'INV-2026-120', amount:  35000, received: 0,        paymentMode: 'credit', chequeNo: '', bankName: '', description: 'Welding electrodes & rods',      salesPerson: 'Priya Jayawardena', salesPersonPhone: '077-4445566', route: 'Urubokka',
    payments: [] },
];

/** Backward-compatible alias */
export const transactions = initialInvoices;

/**
 * POST-DATED CHEQUES (held in hand, not yet deposited)
 * id, shopId, chequeNo, bankName, chequeDate, amount
 */
export const postDatedCheques = [
  { id: 1, shopId:  1, chequeNo: 'CHQ-458201', bankName: 'BOC Morawaka',              chequeDate: d(1), amount:  50000 },
  { id: 2, shopId:  1, chequeNo: 'CHQ-458305', bankName: 'Peoples Bank Morawaka',     chequeDate: d(3), amount: 100000 },
  { id: 3, shopId:  3, chequeNo: 'CHQ-458302', bankName: 'BOC Deniyaya',              chequeDate: d(5), amount: 100000 },
  { id: 4, shopId:  4, chequeNo: 'CHQ-459010', bankName: 'HNB Urubokka',             chequeDate: d(7), amount: 150000 },
  { id: 5, shopId: 12, chequeNo: 'CHQ-458330', bankName: 'BOC Akuressa',             chequeDate: d(2), amount: 100000 },
  { id: 6, shopId:  1, chequeNo: 'CHQ-458340', bankName: 'BOC Morawaka',              chequeDate: d(4), amount:  30000 },
  { id: 7, shopId:  1, chequeNo: 'CHQ-458350', bankName: 'Peoples Bank Morawaka',     chequeDate: d(6), amount:  40000 },
  { id: 8, shopId:  2, chequeNo: 'CHQ-458370', bankName: 'Sampath Bank Akuressa',     chequeDate: d(3), amount:  25000 },
  { id: 9, shopId:  2, chequeNo: 'CHQ-458380', bankName: 'BOC Akuressa',             chequeDate: d(5), amount:  35000 },
  { id:10, shopId:  2, chequeNo: 'CHQ-458390', bankName: 'Sampath Bank Akuressa',     chequeDate: d(7), amount:  50000 },
];

/** Monthly trend data for dashboard chart - DEPRECATED: Use live backend monthlyBreakdown */
export const monthlyTrend = [];

/**
 * ROUTE SCHEMA
 * id (auto-generated), name, description/area coverage, routeDates (delivery schedule)
 */

/** Unified initial reactive array for Routes */
export const initialRoutes = [
  { id: 1,  name: 'Morawaka',      description: 'Main town area, Galle Road junction shops',                                           routeDates: ['Monday', 'Thursday'] },
  { id: 2,  name: 'Akuressa',      description: 'Town center, Main Street, Hospital Road commercial area',                              routeDates: ['Tuesday', 'Friday'] },
  { id: 3,  name: 'Deniyaya',      description: 'Matara Road stretch, Lake Road shops, town hub',                                       routeDates: ['Wednesday', 'Saturday'] },
  { id: 4,  name: 'Urubokka',      description: 'Colombo Road, Station Road area, surrounding villages',                                 routeDates: ['Monday', 'Friday'] },
  { id: 5,  name: 'Kamburupitiya', description: 'Main Street, Church Road commercial zone, Matara Road corridor',                        routeDates: ['Tuesday', 'Thursday'] },
  { id: 6,  name: 'Kotapola',      description: 'Town area, Akuressa Road junction, rural shop network',                                 routeDates: ['Wednesday'] },
  { id: 7,  name: 'Hakmana',       description: 'Hakmana town center, main road shops, surrounding village outlets',                     routeDates: ['Saturday'] },
];

/** Backward-compatible alias */
export const routes = initialRoutes;

/** Backward-compatible array of route name strings */
export const routeNames = routes.map(r => r.name);

/** Utility to derive route name list from full route objects */
export const getRouteNames = (routeObjects) => routeObjects.map(r => r.name);

/**
 * SALES PERSON SCHEMA
 * id (auto-generated), name, phone, nic, email, address
 */

/** Unified initial reactive array for Sales Persons */
export const initialSalesPersons = [
  { id: 1, name: 'Kamal Perera',      phone: '077-1112233', nic: '851234567V', email: 'kamal.perera@example.com',   address: '23 Temple Road, Morawaka' },
  { id: 2, name: 'Nimal Fernando',    phone: '077-2223344', nic: '882345678V', email: 'nimal.fernando@example.com', address: '45 Lake Road, Akuressa' },
  { id: 3, name: 'Sunil Silva',       phone: '077-3334455', nic: '783456789V', email: 'sunil.silva@example.com',    address: '12 Main Street, Deniyaya' },
  { id: 4, name: 'Priya Jayawardena', phone: '077-4445566', nic: '914567890V', email: 'priya.j@example.com',       address: '78 Galle Road, Urubokka' },
  { id: 5, name: 'Rohan Weerasinghe', phone: '077-5556677', nic: '865678901V', email: 'rohan.w@example.com',       address: '56 Station Road, Morawaka' },
  { id: 6, name: 'Saman Kumara',      phone: '077-6667788', nic: '896789012V', email: 'saman.k@example.com',       address: '34 Colombo Road, Akuressa' },
  { id: 7, name: 'Upul Rathnayake',   phone: '077-7778899', nic: '807890123V', email: 'upul.r@example.com',        address: '15 Beach Road, Deniyaya' },
  { id: 8, name: 'Lalith Dissanayake',phone: '077-8889900', nic: '928901234V', email: 'lalith.d@example.com',      address: '90 Station Road, Urubokka' },
  { id: 9, name: 'Ajith Bandara',     phone: '077-9990011', nic: '839012345V', email: 'ajith.b@example.com',       address: '34 Main Street, Kamburupitiya' },
  { id: 10, name: 'Dinesh Kumara',     phone: '077-1002003', nic: '900123456V', email: 'dinesh.k@example.com',      address: '12 Church Road, Kamburupitiya' },
  { id: 11, name: 'Harsha De Silva',   phone: '077-3004005', nic: '860234567V', email: 'harsha.d@example.com',      address: '56 Beach Road, Morawaka' },
  { id: 12, name: 'Mahesh Jayasuriya', phone: '077-5006007', nic: '930345678V', email: 'mahesh.j@example.com',     address: '89 Lake Road, Akuressa' },
];

/** Available bank names for cheque/check entries */
export const bankNames = [
  'BOC Morawaka',
  'BOC Akuressa',
  'BOC Deniyaya',
  'BOC Kamburupitiya',
  'Peoples Bank Morawaka',
  'Peoples Bank Akuressa',
  'Peoples Bank Kamburupitiya',
  'HNB Urubokka',
  'HNB Akuressa',
  'Sampath Bank Akuressa',
  'Seylan Urubokka',
  'NSB Akuressa',
  'Commercial Bank Akuressa',
  'NTB Kamburupitiya',
];

export const getNextId = (items) => Math.max(...items.map(i => i.id), 0) + 1;

export const getNextDocNo = (type, items) => {
  const prefix = type === 'Invoice' ? 'INV' : 'PAY';
  const year = new Date().getFullYear();
  const existing = items.filter(t => t.docNo && t.docNo.startsWith(`${prefix}-${year}`));
  const maxNum = existing.reduce((max, t) => {
    const parts = t.docNo.split('-');
    const num = parseInt(parts[2], 10);
    return num > max ? num : max;
  }, 0);
  return `${prefix}-${year}-${String(maxNum + 1).padStart(3, '0')}`;
};

/** Generate receipt number in Orange Electric format: OR-YYYY-NNN */
export const getNextReceiptNo = (items) => {
  const year = new Date().getFullYear();
  const existing = items.filter(t => t.receiptNo && t.receiptNo.startsWith(`OR-${year}`));
  const maxNum = existing.reduce((max, t) => {
    const parts = t.receiptNo.split('-');
    const num = parseInt(parts[2], 10);
    return num > max ? num : max;
  }, 0);
  return `OR-${year}-${String(maxNum + 1).padStart(3, '0')}`;
};