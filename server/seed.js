// Real test data captured from the live DataInMeta budgeting system (budget.mockupcentre.com).
// All 43 budget line items plus vendors, contracts, users, departments and expenditure types.
import bcrypt from 'bcryptjs'

// Default password for every seeded account (override per-user in production).
export const DEFAULT_PASSWORD = process.env.SEED_PASSWORD || 'flc1234'

const DEPT_DEFAULT = 'Technology Services'

// description, type, fy, vendor, budget, invoiced, gasb, status, [classification]
const B = (description, type, fy, vendor, budget, invoiced, gasb, status, classification = 'Critical', department = DEPT_DEFAULT) =>
  ({ description, type, fy, vendor, budget, invoiced, gasb, status, classification, department })

const budgets = [
  B('Enterprise Datacenter', 'Hardware Maintenance', 'FY 2023/2024', 'Eaton', 10000, 41985, false, 'Review', 'Critical', 'Enterprise Infrastructure'),
  B('New User Laptops', 'Small Equipment', 'FY 2024/2025', 'Dell', 40000, 50598, false, 'Draft', 'Mandatory'),
  B('Training', 'Travel or Training', 'FY 2024/2025', 'Eaton', 10000, 14986, false, 'Inactive', 'Enhancement'),
  B('Data services', 'Capital', 'FY 2024/2025', 'DataInMeta', 10000, 188546, false, 'Active'),
  B('budgeting system', 'Software Licenses/Hosting Fees', 'FY 2024/2025', 'DataInMeta', 10000, 9620, false, 'Active', 'Enhancement'),
  B('Microsoft EA', 'Software Licenses/Hosting Fees', 'FY 2024/2025', 'SHI', 180000, 29200, false, 'Active', 'Mandatory'),
  B('Battery Maintenance', 'Hardware Maintenance', 'FY 2024/2025', 'Eaton', 8000, 21850, false, 'Active', 'Critical', 'Enterprise Infrastructure'),
  B('Software', 'Software Licenses/Hosting Fees', 'FY 2024/2025', 'HP', 2000, 12500, false, 'Active', 'Mandatory'),
  B('Training', 'Consulting', 'FY 2024/2025', 'Eaton', 1000, 1207, false, 'Active', 'Enhancement'),
  B('Data services', 'Software Licenses/Hosting Fees', 'FY 2024/2025', 'DataHeaven', 2000, 0, false, 'Active'),
  B('Data services', 'Software Licenses/Hosting Fees', 'FY 2024/2025', 'DataInMeta', 4000, 0, false, 'Active'),
  B('Data services', 'Capital', 'FY 2024/2025', 'Knowbe4', 2000, 0, false, 'Active'),
  B('Line Item C', 'Capital', 'FY 2024/2025', 'Vendor C', 10000, 8000, false, 'Approved'),
  B('Line Item D', 'Consulting', 'FY 2024/2025', 'Vendor D', 15000, 15100, false, 'Active', 'Enhancement'),
  B('New User Laptops', 'Capital', 'FY 2024/2025', 'Dell', 40000, 0, false, 'Active', 'Mandatory'),
  B('Rubrik Hardware Maintenance', 'Hardware Maintenance', 'FY 2024/2025', 'Rubrik', 17000, 0, false, 'Active', 'Critical', 'Enterprise Infrastructure'),
  B('Application Bundling', 'Software Licenses/Hosting Fees', 'FY 2024/2025', 'Robopack', 1000, 1575, false, 'Active'),
  B('Threatlocker Security', 'Capital', 'FY 2025/2026', 'SHI', 10000, 0, false, 'Draft', 'Critical'),
  B('afasdfasdf', 'Travel or Training', 'FY 2022/2023', 'Microsoft', 10000, 0, false, 'Active'),
  B('west', 'Hardware Maintenance', 'FY 2022/2023', 'Sam', 5000, 3000, false, 'Active'),
  B('Test', 'Capital', 'FY 2025/2026', 'Eaton', 120000, 100000, false, 'Active'),
  B('Test', 'Capital', 'FY 2025/2026', 'Eaton', 1000, 9500, false, 'Active'),
  B('Data services', 'Software Licenses/Hosting Fees', 'FY 2025/2026', 'Dell', 2000, 0, false, 'Active'),
  B('Test', 'Telecommunications', 'FY 2025/2026', 'Sam', 10000, 4000, false, 'Active'),
  B('Data services', 'Capital', 'FY 2025/2026', 'VENDOR', 0, 1000, false, 'Active'),
  B('Test', 'Travel or Training', 'FY 2025/2026', 'DataCrunch', 100000, 70000, false, 'Active', 'Enhancement'),
  B('Domain', 'Hardware Maintenance', 'FY 2025/2026', 'Sam', 70000, 65000, false, 'Active'),
  B('Equipment', 'Small Equipment', 'FY 2025/2026', 'Small', 100000, 103952.43, false, 'Active', 'Mandatory'),
  B('Test', 'Capital', 'FY 2025/2026', 'Capital', 120000, 90000, false, 'Active'),
  B('Hosting Services', 'Software Licenses/Hosting Fees', 'FY 2025/2026', 'SGS', 500, 200, false, 'Active'),
  B('Hosting Services', 'Software Licenses/Hosting Fees', 'FY 2025/2026', 'GoDaddy', 2000, 100, false, 'Active'),
  B('Transportation year', 'Travel or Training', 'FY 2026/2027', 'Volvo Transport', 300000, 900000, true, 'Active'),
  B('Transportation for year', 'Travel or Training', 'FY 2026/2027', 'Volvo Transport', 300000, 0, false, 'Active'),
  B('Test', 'Capital', 'FY 2026/2027', 'DataCrunch', 80000, 3570, true, 'Active'),
  B('Data services', 'Capital', 'FY 2025/2026', 'Capital', 400000, 0, true, 'Active'),
  B('Test', 'Consulting', 'FY 2024/2025', 'DataInMeta', 56789, 0, false, 'Active', 'Enhancement'),
  B('Test', 'Capital', 'FY 2025/2026', 'dell', 5000, 0, true, 'Active'),
  B('test unbudget', 'Capital', 'FY 2025/2026', 'dell', 0, 8976, true, 'Active'),
  B('ewfrew', 'Capital', 'FY 2024/2025', 'Eaton', 10000, 0, false, 'Active'),
  B('test 123', 'Capital', 'FY 2024/2025', 'Capital', 200000, 210, false, 'Active'),
  B('test budget', 'Capital', 'FY 2025/2026', 'max', 5003, 6000, false, 'Active'),
  B('test max items', 'Software Licenses/Hosting Fees', 'FY 2025/2026', 'max', 6003, 15725, true, 'Active'),
  B('TestABC', 'Hardware Maintenance', 'FY 2023/2024', 'GoDaddy', 200000, 15002, false, 'Active'),
]

const V = (name, contact = '', email = '', phone = '') => ({ name, contact, email, phone, status: 'Active' })
const vendors = [
  V('Capital'), V('DataCrunch'), V('DataHeaven'), V('DataInMeta', 'Srilatha R', 'accounts@datainmeta.com', '01234567890'),
  V('dell', 'test person1'), V('Eaton'), V('GoDaddy'), V('HP'), V('Knowbe4'), V('max'), V('Microsoft'),
  V('Robopack'), V('Rubrik'), V('Sam'), V('SGS'), V('SHI'), V('Small'), V('sony', 'test person2'),
  V('testvendor dec'), V('VENDOR'), V('Vendor C'), V('Vendor D'), V('Volvo Transport', 'Allison'),
]

const C = (vendor, contact, amount, start, end, gasb, autoRenew, multiYear, status) =>
  ({ vendor, contact, amount, start, end, gasb, autoRenew, multiYear, status })
const contracts = [
  C('Volvo Transport', 'Allison', 50000, '2026-02-11', '2027-07-10', false, false, true, 'Active'),
  C('Volvo Transport', 'Allison', 90000, '2026-01-01', '2027-02-05', false, false, true, 'Active'),
  C('Volvo Transport', 'Allison', 900000, '2026-01-06', '2027-01-06', false, false, true, 'Active'),
  C('sumsung', '', 799999, '2025-10-02', '2026-11-19', false, false, true, 'Draft'),
  C('sumsung', '', 456778, '2026-02-12', '2026-01-31', false, false, false, 'Draft'),
  C('sony', 'test person2', 499990, '2026-10-03', '2026-12-30', false, false, true, 'Active'),
  C('dell', 'test person1', 80000, '2026-01-03', '2026-07-08', true, true, false, 'Active'),
  C('sumsung', '', 900000, '2025-12-01', '2026-01-10', false, false, false, 'Active'),
  C('max', '', 7000000, '2025-12-26', '2025-12-31', false, false, false, 'Active'),
  C('max', '', 10000, '2025-12-18', '2025-12-26', false, true, true, 'Active'),
]

const users = [
  { name: 'Admin', email: 'srilatha@datainmeta.com', username: 'Admin', phone: '01234567890', role: 'Admin', status: 'Active' },
  { name: 'Demo Viewer', email: 'viewer@datainmeta.com', username: 'viewer', phone: '669989968', role: 'Viewer', status: 'Inactive' },
  { name: 'User', email: 'user@datainmeta.com', username: 'user', phone: '8220622141', role: 'Viewer', status: 'Active' },
  { name: 'Siva S', email: 'siva@datainmeta.com', username: 'admin', phone: '23423423432', role: 'Admin', status: 'Active' },
  { name: 'test1', email: 'test@gmail.com', username: 'test', phone: '232423434', role: 'Viewer', status: 'Active' },
]

const expenditures = [
  { name: 'Capital', status: 'Active' }, { name: 'Computer Training', status: 'Inactive' },
  { name: 'Consulting', status: 'Active' }, { name: 'Hardware Maintenance', status: 'Active' },
  { name: 'Small Equipment', status: 'Active' }, { name: 'Software Licenses/Hosting Fees', status: 'Active' },
  { name: 'Telecommunications', status: 'Active' }, { name: 'Travel or Training', status: 'Active' },
  { name: 'Training', status: 'Inactive' },
]

const departments = [
  'Accounting', 'Administration and Human Resources', 'Board Relations', 'Communications & Education',
  'Enterprise Infrastructure', 'Enterprise Insurance Services', 'Enterprise League', 'Executive Director',
  'Financial Services', 'Health', 'Insurance & Financial Services', 'Insurance General Administration',
  'Legal', 'Legislative Affairs', 'Managed Care', 'Marketing', 'Membership Relations', 'Property & Liability',
  'Safety & Risk Control', 'Technology Services', 'Underwriting', 'Workers Compensation',
].map((name) => ({ name, status: 'Active' }))

const unbudgeted = [
  { description: 'Data services', type: 'Capital', amount: 1000, vendor: 'VENDOR' },
  { description: 'test unbudget', type: 'Capital', amount: 8976, vendor: 'dell' },
]

export function seedData() {
  const hash = bcrypt.hashSync(DEFAULT_PASSWORD, 10)
  const usersWithPw = users.map((u) => ({ ...u, password: hash }))
  return { budgets, vendors, contracts, users: usersWithPw, expenditures, departments, unbudgeted }
}

// Allow `npm run seed` (node seed.js --force) to wipe & reseed.
if (process.argv.includes('--force')) {
  ;(async () => {
    const { seedIfEmpty } = await import('./db.js')
    const did = seedIfEmpty({ force: true })
    console.log(did ? 'Database reseeded.' : 'Nothing to do.')
    process.exit(0)
  })()
}
