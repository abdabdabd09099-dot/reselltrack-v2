// ─── exportExcel.js ───────────────────────────────────────────────────────────
// Exports all business data to a formatted Excel workbook (.xlsx)
// with separate sheets for Sales, Products, Expenses, Lending, Borrowing,
// and a Summary sheet.
// Auto-triggers file download and saves to device.
// ─────────────────────────────────────────────────────────────────────────────
import * as XLSX from 'xlsx'

// ── Format helpers ────────────────────────────────────────────────────────────
const fmtDate  = iso => iso ? new Date(iso).toLocaleDateString('en-GB') : ''
const fmtTime  = iso => iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''
const fmtMoney = (n, sym = '₱') => sym + Number(n || 0).toFixed(2)

// ── Apply column widths ───────────────────────────────────────────────────────
const setColWidths = (ws, widths) => {
  ws['!cols'] = widths.map(w => ({ wch: w }))
}

// ── Style a header row (bold, background) ─────────────────────────────────────
// Note: xlsx free tier doesn't support cell styles — we use a workaround
// by freezing the top row and auto-filtering
const freezeHeader = (ws) => {
  ws['!freeze'] = { xSplit: 0, ySplit: 1 }
  ws['!autofilter'] = { ref: ws['!ref'] }
}

// ── Build Sales sheet ─────────────────────────────────────────────────────────
const buildSalesSheet = (sales, currencySymbol) => {
  const rows = [
    ['Sale ID', 'Date', 'Time', 'Customer', 'Contact', 'Items', 'Qty', 'Total Amount', 'Amount Paid', 'Balance', 'Payment Method', 'Status', 'Notes'],
  ]
  sales.forEach(s => {
    const itemsText = s.items.map(i => `${i.productName} x${i.qty} @ ${fmtMoney(i.unitPrice, currencySymbol)}`).join('\n')
    const totalQty  = s.items.reduce((a, i) => a + i.qty, 0)
    rows.push([
      s.id,
      fmtDate(s.date),
      fmtTime(s.date),
      s.customerName,
      s.contact || '',
      itemsText,
      totalQty,
      Number(s.totalAmount),
      Number(s.amountPaid),
      Number(s.balance),
      s.paymentMethod,
      s.status,
      s.notes || '',
    ])
  })

  // Summary row
  rows.push([])
  rows.push([
    'TOTALS', '', '', '', '', '',
    sales.flatMap(s => s.items).reduce((a, i) => a + i.qty, 0),
    sales.reduce((a, s) => a + s.totalAmount, 0),
    sales.reduce((a, s) => a + s.amountPaid,  0),
    sales.reduce((a, s) => a + s.balance,     0),
    '', '', '',
  ])

  const ws = XLSX.utils.aoa_to_sheet(rows)
  setColWidths(ws, [14, 12, 8, 20, 16, 40, 6, 14, 14, 12, 14, 10, 24])
  freezeHeader(ws)
  return ws
}

// ── Build Products sheet ──────────────────────────────────────────────────────
const buildProductsSheet = (products, currencySymbol) => {
  const rows = [
    ['SKU', 'Product Name', 'Category', 'Description', 'Buy Price', 'Sell Price', 'Stock', 'Stock Value', 'Potential Revenue', 'Margin %'],
  ]
  products.forEach(p => {
    const margin  = p.sellPrice > 0 ? (((p.sellPrice - p.buyPrice) / p.sellPrice) * 100).toFixed(1) : 0
    rows.push([
      p.sku,
      p.name,
      p.category || '',
      p.description || '',
      Number(p.buyPrice),
      Number(p.sellPrice),
      p.stock,
      Number(p.buyPrice) * p.stock,
      Number(p.sellPrice) * p.stock,
      Number(margin),
    ])
  })

  rows.push([])
  rows.push([
    'TOTALS', '', '', '', '', '',
    products.reduce((a, p) => a + p.stock, 0),
    products.reduce((a, p) => a + p.buyPrice * p.stock, 0),
    products.reduce((a, p) => a + p.sellPrice * p.stock, 0),
    '',
  ])

  const ws = XLSX.utils.aoa_to_sheet(rows)
  setColWidths(ws, [10, 24, 16, 28, 12, 12, 8, 14, 18, 10])
  freezeHeader(ws)
  return ws
}

// ── Build Expenses sheet ──────────────────────────────────────────────────────
const buildExpensesSheet = (expenses) => {
  const rows = [
    ['Date', 'Description', 'Category', 'Amount', 'Notes'],
  ]
  expenses.forEach(e => {
    rows.push([
      fmtDate(e.date),
      e.description,
      e.category || '',
      Number(e.amount),
      e.notes || '',
    ])
  })

  rows.push([])
  rows.push(['TOTAL', '', '', expenses.reduce((a, e) => a + e.amount, 0), ''])

  const ws = XLSX.utils.aoa_to_sheet(rows)
  setColWidths(ws, [12, 30, 18, 12, 28])
  freezeHeader(ws)
  return ws
}

// ── Build Lending sheet ───────────────────────────────────────────────────────
const buildLendingSheet = (lending) => {
  const rows = [
    ['Person', 'Contact', 'Amount', 'Date', 'Due Date', 'Source', 'Status', 'Notes'],
  ]
  lending.forEach(l => {
    rows.push([
      l.personName,
      l.contact || '',
      Number(l.amount),
      fmtDate(l.date),
      fmtDate(l.dueDate) || '',
      l.source,
      l.status,
      l.notes || '',
    ])
  })

  const pending = lending.filter(l => l.status === 'Pending').reduce((a, l) => a + l.amount, 0)
  rows.push([])
  rows.push(['PENDING TOTAL', '', pending, '', '', '', '', ''])

  const ws = XLSX.utils.aoa_to_sheet(rows)
  setColWidths(ws, [22, 16, 12, 12, 12, 10, 10, 28])
  freezeHeader(ws)
  return ws
}

// ── Build Borrowing sheet ─────────────────────────────────────────────────────
const buildBorrowingSheet = (borrowing) => {
  const rows = [
    ['Person', 'Contact', 'Amount', 'Date', 'Due Date', 'Status', 'Notes'],
  ]
  borrowing.forEach(b => {
    rows.push([
      b.personName,
      b.contact || '',
      Number(b.amount),
      fmtDate(b.date),
      fmtDate(b.dueDate) || '',
      b.status,
      b.notes || '',
    ])
  })

  const pending = borrowing.filter(b => b.status === 'Pending').reduce((a, b) => a + b.amount, 0)
  rows.push([])
  rows.push(['PENDING TOTAL', '', pending, '', '', '', ''])

  const ws = XLSX.utils.aoa_to_sheet(rows)
  setColWidths(ws, [22, 16, 12, 12, 12, 10, 28])
  freezeHeader(ws)
  return ws
}

// ── Build Summary sheet ───────────────────────────────────────────────────────
const buildSummarySheet = (data, currencySymbol) => {
  const { sales, products, expenses, lending, borrowing, settings } = data
  const sym      = currencySymbol
  const totalRev = sales.reduce((a, s) => a + s.amountPaid, 0)
  const totalExp = expenses.reduce((a, e) => a + e.amount, 0)
  const netProfit = totalRev - totalExp
  const totalUncol = sales.reduce((a, s) => a + s.balance, 0)
  const pendingLend = lending.filter(l => l.status === 'Pending').reduce((a, l) => a + l.amount, 0)
  const pendingBorr = borrowing.filter(b => b.status === 'Pending').reduce((a, b) => a + b.amount, 0)
  const stockVal   = products.reduce((a, p) => a + p.buyPrice * p.stock, 0)

  const now = new Date()
  const rows = [
    ['RESELLTRACK — BUSINESS SUMMARY'],
    [`Generated: ${now.toLocaleDateString('en-GB')} at ${now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`],
    [`Business: ${settings?.businessName || 'My Resell Store'}`],
    [`Owner: ${settings?.ownerName || ''}`],
    [],
    ['── FINANCIAL OVERVIEW ───────────────────'],
    ['Total Revenue (Collected)',    totalRev],
    ['Total Expenses',              totalExp],
    ['Net Profit',                  netProfit],
    ['Uncollected Balance',         totalUncol],
    [],
    ['── LENDING & BORROWING ─────────────────'],
    ['Pending Collections (They owe you)',   pendingLend],
    ['Pending Payments (You owe)',           pendingBorr],
    ['Net Lending Position',                pendingLend - pendingBorr],
    [],
    ['── INVENTORY ───────────────────────────'],
    ['Total Products',              products.length],
    ['Total Stock Units',           products.reduce((a, p) => a + p.stock, 0)],
    ['Stock Value (Buy Price)',     stockVal],
    ['Stock Value (Sell Price)',    products.reduce((a, p) => a + p.sellPrice * p.stock, 0)],
    ['Low Stock Items',             products.filter(p => p.stock <= 3 && p.stock > 0).length],
    ['Out of Stock Items',          products.filter(p => p.stock === 0).length],
    [],
    ['── ACTIVITY ────────────────────────────'],
    ['Total Sales Transactions',   sales.length],
    ['Paid Sales',                 sales.filter(s => s.status === 'Paid').length],
    ['Partial Sales',              sales.filter(s => s.status === 'Partial').length],
    ['Unpaid Sales',               sales.filter(s => s.status === 'Unpaid').length],
    ['Total Expenses Recorded',    expenses.length],
    ['Total Lending Entries',      lending.length],
    ['Total Borrowing Entries',    borrowing.length],
  ]

  const ws = XLSX.utils.aoa_to_sheet(rows)
  setColWidths(ws, [38, 18])
  return ws
}

// ── Main export function ──────────────────────────────────────────────────────
export const exportToExcel = ({ sales, products, expenses, lending, borrowing, settings, currencySymbol = '₱' }) => {
  const wb = XLSX.utils.book_new()

  // Sheet order
  XLSX.utils.book_append_sheet(wb, buildSummarySheet({ sales, products, expenses, lending, borrowing, settings }, currencySymbol),  'Summary')
  XLSX.utils.book_append_sheet(wb, buildSalesSheet(sales, currencySymbol),         'Sales')
  XLSX.utils.book_append_sheet(wb, buildProductsSheet(products, currencySymbol),   'Products')
  XLSX.utils.book_append_sheet(wb, buildExpensesSheet(expenses),                   'Expenses')
  XLSX.utils.book_append_sheet(wb, buildLendingSheet(lending),                     'Lending')
  XLSX.utils.book_append_sheet(wb, buildBorrowingSheet(borrowing),                 'Borrowing')

  // Generate filename with date
  const date     = new Date().toISOString().slice(0, 10)
  const bizName  = (settings?.businessName || 'ResellTrack').replace(/\s+/g, '_')
  const filename = `${bizName}_Export_${date}.xlsx`

  // Write and trigger download (auto-saves to device Downloads folder)
  XLSX.writeFile(wb, filename)

  return filename
}

// ── Export single sheet ───────────────────────────────────────────────────────
export const exportSalesLog = ({ sales, currencySymbol = '₱', period = 'all' }) => {
  const wb       = XLSX.utils.book_new()
  const ws       = buildSalesSheet(sales, currencySymbol)
  const date     = new Date().toISOString().slice(0, 10)
  XLSX.utils.book_append_sheet(wb, ws, 'Sales Log')
  XLSX.writeFile(wb, `ResellTrack_SalesLog_${period}_${date}.xlsx`)
}
