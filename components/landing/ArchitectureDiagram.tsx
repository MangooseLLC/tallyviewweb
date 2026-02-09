export default function ArchitectureDiagram() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-700">
          Accounting Systems
          <p className="mt-2 text-xs text-slate-500">
            QuickBooks, Xero, Sage Intacct, NetSuite, and 20+ others
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <div className="h-px flex-1 bg-slate-200" />
          Data Ingestion
          <div className="h-px flex-1 bg-slate-200" />
        </div>
        <div className="rounded-2xl border border-brand-gold/40 bg-brand-gold/10 p-4 text-sm font-semibold text-brand-navy">
          Tallyview Intelligence Layer (Off-Chain)
          <p className="mt-2 text-xs font-normal text-slate-600">
            AI transaction classification, anomaly detection engine, cross-org benchmarking
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <div className="h-px flex-1 bg-slate-200" />
          Cryptographic Commitments
          <div className="h-px flex-1 bg-slate-200" />
        </div>
        <div className="rounded-2xl border border-brand-avalanche/40 bg-brand-avalanche/10 p-4 text-sm font-semibold text-brand-navy">
          Tallyview Accountability Chain (On-Chain)
          <p className="mt-2 text-xs font-normal text-slate-600">
            Tamper-proof audit trail, compliance enforcement, evidence chain-of-custody, entity relationship graph
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <div className="h-px flex-1 bg-slate-200" />
          Verified Oversight
          <div className="h-px flex-1 bg-slate-200" />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-700">
          Stakeholder Dashboards
          <p className="mt-2 text-xs text-slate-500">
            Foundations: portfolio verification. Regulators: jurisdiction oversight. Investigators: evidence chain-of-custody. Nonprofits: Tallyview Verified credential.
          </p>
        </div>
      </div>
    </div>
  );
}
