import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FilePlus2, Package, Users, History as HistoryIcon } from 'lucide-react';
import type { Quotation } from '../types';
import { listQuotations } from '../data/quotations';
import { listProducts } from '../data/products';
import { listCustomers } from '../data/customers';
import { formatINR } from '../logic/calculations';

export default function Dashboard() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [productCount, setProductCount] = useState(0);
  const [customerCount, setCustomerCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [q, p, c] = await Promise.all([listQuotations(), listProducts(), listCustomers()]);
      setQuotations(q); setProductCount(p.length); setCustomerCount(c.length); setLoading(false);
    })();
  }, []);

  const totalValue = quotations.reduce((s, q) => s + q.totals.grandTotal, 0);
  const recent = quotations.slice(0, 5);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500">Welcome to ProLift Quotation Management.</p>
        </div>
        <Link to="/quotation/new" className="btn-primary self-start sm:self-auto"><FilePlus2 size={16} /> New Quotation</Link>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Quotations" value={loading ? '…' : String(quotations.length)} icon={<HistoryIcon size={20} />} />
        <Stat label="Total Quoted" value={loading ? '…' : formatINR(totalValue)} />
        <Stat label="Products" value={loading ? '…' : String(productCount)} icon={<Package size={20} />} />
        <Stat label="Customers" value={loading ? '…' : String(customerCount)} icon={<Users size={20} />} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="mb-3 font-bold text-slate-700">Recent Quotations</h2>
          {recent.length === 0 && <p className="text-sm text-slate-400">No quotations yet. Create your first one!</p>}
          <div className="divide-y">
            {recent.map((q) => (
              <Link to={`/quotation/${q.id}/edit`} key={q.id} className="flex items-center justify-between py-2 hover:bg-slate-50">
                <div>
                  <div className="font-semibold text-brand-700">{q.quotationNumber}</div>
                  <div className="text-xs text-slate-400">{q.customer.companyName} · {new Date(q.date).toLocaleDateString('en-IN')}</div>
                </div>
                <div className="font-medium">{formatINR(q.totals.grandTotal)}</div>
              </Link>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="mb-3 font-bold text-slate-700">Quick Actions</h2>
          <div className="space-y-2">
            <Link to="/quotation/new" className="btn-primary w-full"><FilePlus2 size={16} /> New Quotation</Link>
            <Link to="/products" className="btn-secondary w-full"><Package size={16} /> Manage Products</Link>
            <Link to="/customers" className="btn-secondary w-full"><Users size={16} /> Manage Customers</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="card min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
        <span className="shrink-0 text-brand-500">{icon}</span>
      </div>
      <div className="mt-2 break-words text-xl font-bold leading-tight text-slate-800 sm:text-2xl">{value}</div>
    </div>
  );
}
