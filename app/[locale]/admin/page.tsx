"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL || "https://backend-mtr.onrender.com").replace(/\/$/, "");

/* -------------------- helpers -------------------- */
function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}
function fmt(n: any) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat().format(n);
}

/* -------------------- Page root -------------------- */
export default function AdminDashboardPage() {
  const t = useTranslations("auth.admin.dashboardPage");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const [authLoading, setAuthLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${BACKEND}/api/auth/whoami`, { credentials: "include" });
        if (!r.ok) {
          if (r.status === 401) {
            router.replace(`/${locale}/login?next=${encodeURIComponent(pathname)}`);
            return;
          }
          setAllowed(false);
          setAuthLoading(false);
          return;
        }
        const j = await r.json();
        if (cancelled) return;
        const rle = j.role || "";
        setRole(rle);
        setAllowed(rle === "admin");
      } catch {
        router.replace(`/${locale}/login?next=${encodeURIComponent(pathname)}`);
        return;
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locale, pathname, router]);

  if (authLoading) return <PageLoader label={t("loader.dashboard")} />;

  if (!allowed) {
    return (
      <div className="p-3 sm:p-6">
        <Callout type="warn" title={t("accessDenied.title")}>
          {t("accessDenied.body", { role: role || "?" })}
        </Callout>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="space-y-1 px-1 sm:px-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#002147] text-center tracking-tight">
            {t("header.title")}
          </h1>
          <p className="text-xs sm:text-base text-[#002147]/80 text-center">
            {t("header.subtitle")}
          </p>
        </div>
        <DashboardBody />
      </div>
    </div>
  );
}

/* -------------------- Dashboard body -------------------- */
function DashboardBody() {
  const t = useTranslations("auth.admin.dashboardPage");

  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return iso(d);
  });
  const [to, setTo] = useState(() => iso(new Date()));
  const [minOrders, setMinOrders] = useState(3);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [httpCode, setHttpCode] = useState<number | null>(null);

  const qs = useMemo(() => {
    const p = new URLSearchParams({ from, to, minOrders: String(minOrders), limit: "10" });
    return p.toString();
  }, [from, to, minOrders]);

  async function load() {
    setLoading(true);
    setError("");
    setHttpCode(null);
    try {
      const r = await fetch(`${BACKEND}/api/dashboard/overview?${qs}`, { credentials: "include" });
      setHttpCode(r.status);
      if (!r.ok) throw new Error((await r.text()) || `HTTP ${r.status}`);
      setData(await r.json());
    } catch (e: any) {
      setError(e?.message || "Network error");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs]);

  function quick(days: number) {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));
    setFrom(iso(start));
    setTo(iso(end));
  }

  // Palette
  const C = {
    navy: "#002147",
    teal: "#00A6A6",
    amber: "#F59E0B",
    red: "#EF4444",
    sky: "#0EA5E9",
    slate: "#64748B",
    mint: "#34D399",
  } as const;

  const donutData = useMemo(() => {
    const k = data?.kpis || {};
    return [
      { name: t("labels.orders"), value: k.ordersInRange || 0, color: C.sky },
      { name: t("labels.clients"), value: k.clientsInRange || 0, color: C.mint },
      { name: t("labels.claims"), value: k.claimsInRange || 0, color: C.red },
    ];
  }, [data, t]);
  const totalDonut = donutData.reduce((s, x) => s + (x.value || 0), 0);

  // === Ticks entiers pour Y (Nouveaux clients / Réclamations) ===
  const maxNewClients = useMemo(
    () => Math.max(0, ...((data?.series?.newClientsByDay || []).map((d: any) => d.count || 0))),
    [data]
  );
  const maxClaims = useMemo(
    () => Math.max(0, ...((data?.series?.claimsByDay || []).map((d: any) => d.count || 0))),
    [data]
  );
  const upperNew = Math.max(3, Math.ceil(maxNewClients));
  const upperClaims = Math.max(3, Math.ceil(maxClaims));
  const ticksNew = useMemo(() => Array.from({ length: upperNew + 1 }, (_, i) => i), [upperNew]);
  const ticksClaims = useMemo(() => Array.from({ length: upperClaims + 1 }, (_, i) => i), [upperClaims]);

  function exportLoyalCSV() {
    const rows = data?.loyalClients || [];
    const header = [
      t("loyal.csv.header.clientId"),
      t("loyal.csv.header.name"),
      t("loyal.csv.header.accountType"),
      t("loyal.csv.header.orders"),
      t("loyal.csv.header.lastOrder"),
    ];
    const lines = [header.join(",")];
    rows.forEach((r: any) => {
      const typeLabel = r.accountType
        ? r.accountType === "company"
          ? t("loyal.accountTypes.company")
          : r.accountType === "person"
          ? t("loyal.accountTypes.person")
          : r.accountType
        : "-";
      lines.push(
        [
          r.clientId,
          (r.name || "").replace(/,/g, " "),
          String(typeLabel).replace(/,/g, " "),
          r.orders,
          r.lastOrder,
        ].join(",")
      );
    });
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `loyal-clients_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Bandeau filtres */}
      <div className="rounded-2xl bg-gradient-to-r from-[#002147] to-[#0b3e8b] text-white shadow-xl">
        <div className="p-3 sm:p-4">
          <div className="flex flex-col md:flex-row md:items-end gap-3">
            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-3 flex-1">
              <Field label={t("filters.from")}>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full rounded-xl px-3 py-2 bg-white text-[#002147] text-sm sm:text-base border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/40"
                />
              </Field>

              <Field label={t("filters.to")}>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full rounded-xl px-3 py-2 bg-white text-[#002147] text-sm sm:text-base border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/40"
                />
              </Field>

              <Field label={t("filters.minOrders")}>
                <input
                  type="number"
                  min={1}
                  value={minOrders}
                  onChange={(e) => setMinOrders(+e.target.value || 1)}
                  className="w-full rounded-xl px-3 py-2 bg-white text-[#002147] text-sm sm:text-base border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/40"
                />
              </Field>

              <div className="flex gap-2">
                <button
                  onClick={load}
                  disabled={loading}
                  className="mt-auto w-full rounded-xl px-4 py-2 bg-white text-[#002147] font-semibold border border-white/30 hover:bg-white/90 active:scale-[.99] transition text-sm sm:text-base"
                >
                  {loading ? t("common.loading") : t("filters.refresh")}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 md:ml-auto pt-1">
              <QuickBtn onClick={() => quick(7)}>{t("filters.quick.7d")}</QuickBtn>
              <QuickBtn onClick={() => quick(30)}>{t("filters.quick.30d")}</QuickBtn>
              <QuickBtn onClick={() => quick(90)}>{t("filters.quick.90d")}</QuickBtn>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {httpCode === 401 && (
        <Callout type="error" title={t("errors.unauth.title")}>
          {t("errors.unauth.body")}
        </Callout>
      )}
      {httpCode === 403 && (
        <Callout type="warn" title={t("errors.forbidden.title")}>
          {t("errors.forbidden.body")}
        </Callout>
      )}
      {error && httpCode !== 401 && httpCode !== 403 && (
        <Callout type="error" title={t("errors.generic.title")}>
          {String(error)}
        </Callout>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          title={t("kpi.totalClients")}
          value={fmt(data?.kpis?.totalClients)}
          sub={t("kpi.plusDuringPeriod", { count: fmt(data?.kpis?.clientsInRange || 0) })}
          accent="from-sky-500 to-blue-600"
        />
        <KpiCard
          title={t("kpi.totalOrders")}
          value={fmt(data?.kpis?.totalOrders)}
          sub={t("kpi.plusDuringPeriod", { count: fmt(data?.kpis?.ordersInRange || 0) })}
          accent="from-emerald-500 to-teal-600"
        />
        <KpiCard
          title={t("kpi.claims")}
          value={fmt(data?.kpis?.totalClaims)}
          sub={t("kpi.plusDuringPeriod", { count: fmt(data?.kpis?.claimsInRange || 0) })}
          accent="from-rose-500 to-red-600"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <Card title={t("charts.ordersPerDay")} className="xl:col-span-2">
          {loading ? (
            <SkeletonChart />
          ) : (
            <div className="h-64 sm:h-72 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.series?.ordersByDay || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.35} />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} angle={-20} textAnchor="end" height={50} />
                  <YAxis width={36} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => [v as any, t("labels.orders")]} />
                  <Legend verticalAlign="top" height={24} />
                  <Bar dataKey="count" name={t("labels.ordersShort")} radius={[6, 6, 0, 0]} fill="#002147" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title={t("charts.newClientsPerDay")}>
          {loading ? (
            <SkeletonChart />
          ) : (
            <div className="h-64 sm:h-72 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.series?.newClientsByDay || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradClients" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.35} />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} angle={-20} textAnchor="end" height={50} />
                  <YAxis
                    width={36}
                    tick={{ fontSize: 12 }}
                    allowDecimals={false}
                    domain={[0, upperNew]}
                    ticks={ticksNew}
                  />
                  <Tooltip formatter={(v) => [v as any, t("labels.clients")]} />
                  <Area type="monotone" dataKey="count" stroke="#0EA5E9" fill="url(#gradClients)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title={t("charts.mixInPeriod")}>
          {loading ? (
            <SkeletonChart />
          ) : (
            <div className="relative h-64 sm:h-72 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={56} outerRadius={88} paddingAngle={4}>
                    {donutData.map((e, i) => (
                      <Cell key={i} fill={e.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any, n: any) => [v, n]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-xs text-slate-500">{t("labels.total")}</div>
                  <div className="text-xl sm:text-2xl font-semibold text-slate-900">{fmt(totalDonut)}</div>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title={t("charts.claimsPerDay")}>
          {loading ? (
            <SkeletonChart />
          ) : (
            <div className="h-64 sm:h-72 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.series?.claimsByDay || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.35} />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} angle={-20} textAnchor="end" height={50} />
                  <YAxis
                    width={36}
                    tick={{ fontSize: 12 }}
                    allowDecimals={false}
                    domain={[0, upperClaims]}
                    ticks={ticksClaims}
                  />
                  <Tooltip formatter={(v) => [v as any, t("labels.claimsShort")]} />
                  <Line type="monotone" dataKey="count" stroke="#EF4444" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card
          title={t("loyal.title", { min: minOrders })}
          actions={
            <button
              onClick={exportLoyalCSV}
              className="rounded-lg border-2 border-amber-300 px-3 py-1.5 text-sm hover:bg-amber-50"
            >
              {t("loyal.exportCsv")}
            </button>
          }
        >
          {/* >>> mobile-friendly table */}
          <div className="overflow-x-auto">
            <table className="min-w-[680px] w-full text-xs sm:text-sm">
              <colgroup>
                <col style={{ width: "40%" }} />
                <col style={{ width: "24%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "20%" }} />
              </colgroup>
              <thead>
                <tr className="sticky top-0 bg-white border-b border-amber-200">
                  <Th>{t("loyal.table.client")}</Th>
                  <Th>{t("loyal.table.accountType")}</Th>
                  <Th className="text-right">{t("loyal.table.orders")}</Th>
                  <Th>{t("loyal.table.lastOrder")}</Th>
                </tr>
              </thead>
              <tbody>
                {(data?.loyalClients || []).map((r: any, i: number) => (
                  <tr
                    key={r.clientId + i}
                    className="border-b border-amber-100 last:border-b-0 hover:bg-amber-50/40"
                  >
                    <Td className="break-words">
                      <span className="block truncate sm:whitespace-normal">{r.name || r.clientId}</span>
                    </Td>
                    <Td className="capitalize">
                      {r.accountType
                        ? r.accountType === "company"
                          ? t("loyal.accountTypes.company")
                          : r.accountType === "person"
                          ? t("loyal.accountTypes.person")
                          : r.accountType
                        : "-"}
                    </Td>
                    <Td className="text-right tabular-nums">{fmt(r.orders)}</Td>
                    <Td className="text-slate-600">
                      {r.lastOrder ? (
                        <>
                          <span className="block">{new Date(r.lastOrder).toLocaleDateString()}</span>
                          <span className="block text-[11px] sm:text-xs">
                            {new Date(r.lastOrder).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </Td>
                  </tr>
                ))}
                {!data?.loyalClients?.length && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-500">
                      {t("loyal.none")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* -------------------- UI blocks -------------------- */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] sm:text-xs/relaxed opacity-90">{label}</label>
      {children}
    </div>
  );
}

function Card({
  title,
  actions,
  className = "",
  children,
}: {
  title: string;
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`relative rounded-2xl border-2 border-amber-300 bg-white/95 ring-1 ring-amber-200 shadow-md backdrop-blur ${className}`}
    >
      <div className="flex items-center justify-between gap-3 px-3 sm:px-4 pt-3">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {actions}
      </div>
      <div className="p-3 sm:p-4">{children}</div>
      <span className="pointer-events-none absolute -left-3 -top-3 h-6 w-6 rounded-full bg-amber-300/30 blur-md" />
      <span className="pointer-events-none absolute -bottom-3 -right-3 h-6 w-6 rounded-full bg-amber-300/30 blur-md" />
    </div>
  );
}
function Th({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <th className={`py-2 pr-3 text-left text-[11px] sm:text-xs font-semibold text-slate-700 ${className}`}>{children}</th>;
}
function Td({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <td className={`py-2 pr-3 ${className}`}>{children}</td>;
}
function KpiCard({ title, value, sub, accent = "from-sky-500 to-blue-600" }: { title: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-amber-300 ring-1 ring-amber-200 bg-white shadow-md">
      <div className={`absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br ${accent} opacity-20`} />
      <div className="relative p-4">
        <div className="text-xs text-slate-600">{title}</div>
        <div className="mt-1 text-2xl sm:text-3xl font-semibold text-slate-900">{value}</div>
        {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
      </div>
    </div>
  );
}
function Callout({ type = "info", title, children }: { type?: "info" | "error" | "warn"; title: string; children: React.ReactNode }) {
  const palette =
    type === "error"
      ? "bg-red-50 border-red-300 text-red-800"
      : type === "warn"
      ? "bg-amber-50 border-amber-300 text-amber-800"
      : "bg-blue-50 border-blue-300 text-blue-800";
  return (
    <div className={`rounded-xl border-2 p-3 ${palette}`}>
      <div className="mb-1 font-semibold">{title}</div>
      <div className="text-sm">{children}</div>
    </div>
  );
}
function PageLoader({ label = "…" }: { label?: string }) {
  return (
    <div className="p-3 sm:p-6">
      <div className="grid animate-pulse gap-3">
        <div className="h-8 w-48 rounded bg-slate-200" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-200" />
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-64 sm:h-72 rounded-2xl bg-slate-200" />
          ))}
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-600">{label}</p>
    </div>
  );
}
function SkeletonChart() {
  return <div className="h-64 sm:h-72 md:h-80 w-full animate-pulse rounded-xl bg-slate-100" />;
}
function QuickBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl border-2 border-amber-300 bg-white/10 px-3 py-1.5 text-xs sm:text-sm text-white backdrop-blur transition hover:bg-white/20"
    >
      {children}
    </button>
  );
}
