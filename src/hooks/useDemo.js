// ─── useDemo.js ───────────────────────────────────────────────────────────────
// Demo mode — stores data in memory (no Supabase).
// Max 2 products and 2 sales. Prompts to sign up after limit is hit.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'

export const DEMO_LIMIT = 2   // max records per type in demo mode

export function useDemo() {
  const [demoProducts,  setDemoProducts]  = useState([
    { id: 'demo-p1', sku: 'RSL-0001', name: 'Sample Shoes', category: 'Footwear', description: 'Nike Air Max demo', buyPrice: 800, sellPrice: 1200, stock: 5, createdAt: new Date().toISOString() },
    { id: 'demo-p2', sku: 'RSL-0002', name: 'Sample Bag',   category: 'Bags',     description: 'LV demo bag',       buyPrice: 500, sellPrice: 900,  stock: 3, createdAt: new Date().toISOString() },
  ])
  const [demoSales,     setDemoSales]     = useState([])
  const [demoExpenses,  setDemoExpenses]  = useState([])
  const [demoLending,   setDemoLending]   = useState([])
  const [demoBorrowing, setDemoBorrowing] = useState([])
  const [demoLimitHit,  setDemoLimitHit]  = useState(false)

  // Check if user has hit the limit
  const checkLimit = (arr, type) => {
    const userAdded = arr.filter(i => !i.id?.startsWith('demo-p'))
    if (userAdded.length >= DEMO_LIMIT) {
      setDemoLimitHit(true)
      return false
    }
    return true
  }

  // API-compatible functions for demo mode
  const demoApi = {
    products: {
      create: (p) => {
        if (!checkLimit(demoProducts, 'products')) return null
        const item = { ...p, id: 'up-' + Date.now(), sku: 'RSL-' + String(demoProducts.length + 1).padStart(4,'0'), createdAt: new Date().toISOString() }
        setDemoProducts(ps => [item, ...ps])
        return item
      },
      update: (id, p) => setDemoProducts(ps => ps.map(x => x.id === id ? { ...x, ...p } : x)),
      delete: (id)    => setDemoProducts(ps => ps.filter(x => x.id !== id)),
    },
    sales: {
      create: (sale) => {
        if (!checkLimit(demoSales, 'sales')) return null
        const item = { ...sale, id: 'us-' + Date.now() }
        setDemoSales(ss => [item, ...ss])
        return item
      },
      markPaid: (id) => setDemoSales(ss => ss.map(s => s.id === id ? { ...s, status: 'Paid', balance: 0, amountPaid: s.totalAmount } : s)),
    },
    expenses: {
      create: (e) => {
        const item = { ...e, id: 'ue-' + Date.now() }
        setDemoExpenses(es => [item, ...es])
        return item
      },
      delete: (id) => setDemoExpenses(es => es.filter(x => x.id !== id)),
    },
    lending: {
      create: (l) => {
        const item = { ...l, id: 'ul-' + Date.now() }
        setDemoLending(ls => [item, ...ls])
        return item
      },
      settle:       (id) => setDemoLending(ls => ls.map(l => l.id === id ? { ...l, status: 'Settled' } : l)),
      settleBySale: (sid) => setDemoLending(ls => ls.map(l => l.saleId === sid ? { ...l, status: 'Settled' } : l)),
      delete:       (id) => setDemoLending(ls => ls.filter(l => l.id !== id)),
    },
    borrowing: {
      create: (b) => {
        const item = { ...b, id: 'ub-' + Date.now() }
        setDemoBorrowing(bs => [item, ...bs])
        return item
      },
      settle: (id) => setDemoBorrowing(bs => bs.map(b => b.id === id ? { ...b, status: 'Settled' } : b)),
      delete: (id) => setDemoBorrowing(bs => bs.filter(b => b.id !== id)),
    },
  }

  return {
    demoProducts, setDemoProducts,
    demoSales,    setDemoSales,
    demoExpenses, setDemoExpenses,
    demoLending,  setDemoLending,
    demoBorrowing,setDemoBorrowing,
    demoLimitHit, setDemoLimitHit,
    demoApi,
  }
}
