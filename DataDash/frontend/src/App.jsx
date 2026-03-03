import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Tooltip, Legend, Filler
);

const API = "https://dataflow-2.onrender.com";
const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f43f5e", "#84cc16"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) =>
  n === undefined || n === null ? "—"
  : n >= 1_000_000 ? `₹${(n / 1_000_000).toFixed(2)}M`
  : n >= 1_000    ? `₹${(n / 1_000).toFixed(1)}K`
  : `₹${Number(n).toFixed(2)}`;

const fmtFull = (n) =>
  n === undefined || n === null ? "—"
  : `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

// KPI Card 
function KpiCard({ icon, label, value, sub, color, trend }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 16, padding: "20px 24px",
      boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
      display: "flex", flexDirection: "column", gap: 8,
      borderTop: `4px solid ${color}`, flex: "1 1 180px", minWidth: 165,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 26 }}>{icon}</span>
        {trend !== undefined && (
          <span style={{
            fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
            background: trend >= 0 ? "#dcfce7" : "#fee2e2",
            color: trend >= 0 ? "#16a34a" : "#dc2626",
          }}>
            {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: "#1e293b", letterSpacing: -0.5 }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "#94a3b8" }}>{sub}</div>}
    </div>
  );
}

//  Card wrapper 
function Card({ title, icon, children, style = {}, subtitle }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 16, padding: "24px",
      boxShadow: "0 2px 16px rgba(0,0,0,0.07)", ...style,
    }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: 8 }}>
          <span>{icon}</span>{title}
        </h2>
        {subtitle && <p style={{ margin: "4px 0 0 28px", fontSize: 12, color: "#94a3b8" }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

//  Status Badge 
function Badge({ active }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 99,
      background: active ? "#dcfce7" : "#fee2e2",
      color: active ? "#15803d" : "#b91c1c",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
      {active ? "Active" : "Churned"}
    </span>
  );
}

// Region KPI Card 
function RegionCard({ data, idx }) {
  const color = COLORS[idx % COLORS.length];
  const customers = data.num_customers ?? data.customer_count ?? data.customers ?? "—";
  const orders    = data.num_orders    ?? data.order_count    ?? data.orders    ?? "—";
  const avgRev    = data.avg_revenue_per_customer ?? data.avg_revenue ?? null;
  return (
    <div style={{
      background: "#fff", borderRadius: 14, padding: "16px 20px",
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      borderLeft: `4px solid ${color}`, flex: "1 1 170px", minWidth: 155,
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>
        🌍 {data.region}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#1e293b" }}>{customers}</div>
          <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600 }}>Customers</div>
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#1e293b" }}>{orders}</div>
          <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600 }}>Orders</div>
        </div>
        <div style={{ gridColumn: "span 2", marginTop: 4 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color }}>{fmt(data.total_revenue)}</div>
          <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600 }}>Total Revenue</div>
        </div>
        {avgRev !== null && (
          <div style={{ gridColumn: "span 2" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>{fmt(avgRev)} / customer</div>
          </div>
        )}
      </div>
    </div>
  );
}


function CategoryRow({ c, idx, maxRevenue }) {
  const pct   = maxRevenue > 0 ? (c.total_revenue / maxRevenue) * 100 : 0;
  const color = COLORS[idx % COLORS.length];
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{c.category}</span>
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#64748b", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <strong style={{ color: "#1e293b" }}>{fmt(c.total_revenue)}</strong>
          {c.num_orders   !== undefined && <span>{c.num_orders} orders</span>}
          {c.avg_order_value !== undefined && <span>avg {fmt(c.avg_order_value)}</span>}
        </div>
      </div>
      <div style={{ height: 8, background: "#f1f5f9", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99 }} />
      </div>
    </div>
  );
}


function SortArrow({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <span style={{ color: "#cbd5e1", marginLeft: 4, fontSize: 10 }}>⇅</span>;
  return <span style={{ marginLeft: 4, color: "#6366f1", fontSize: 11 }}>{sortDir === "asc" ? "↑" : "↓"}</span>;
}


export default function App() {
  const [revenue,    setRevenue]    = useState([]);
  const [customers,  setCustomers]  = useState([]);
  const [categories, setCategories] = useState([]);
  const [regions,    setRegions]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

 
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");


  const [search,  setSearch]  = useState("");
  const [sortCol, setSortCol] = useState("total_spend");
  const [sortDir, setSortDir] = useState("desc");


  const filteredRevenue = useMemo(() => revenue.filter((r) => {
    if (dateFrom && r.order_year_month < dateFrom) return false;
    if (dateTo   && r.order_year_month > dateTo)   return false;
    return true;
  }), [revenue, dateFrom, dateTo]);

  
  const filteredCustomers = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = customers.filter((c) =>
      (c.name   || "").toLowerCase().includes(q) ||
      (c.region || "").toLowerCase().includes(q)
    );
    return [...filtered].sort((a, b) => {
      const av = a[sortCol] ?? 0;
      const bv = b[sortCol] ?? 0;
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [customers, search, sortCol, sortDir]);

  const fetchData = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      axios.get(`${API}/api/revenue`),
      axios.get(`${API}/api/top-customers`),
      axios.get(`${API}/api/categories`),
      axios.get(`${API}/api/regions`),
    ])
      .then(([rev, cust, cat, reg]) => {
        setRevenue(rev.data);
        setCustomers(cust.data);
        setCategories(cat.data);
        setRegions(reg.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Cannot connect to the backend server. Make sure server.py is running on http://127.0.0.1:8000");
        setLoading(false);
      });
  };

  useEffect(() => { fetchData(); }, []);

  // Loading
  if (loading)
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)",
        color: "#fff", fontFamily: "'Segoe UI',sans-serif", gap: 20,
      }}>
        <div style={{ fontSize: 52 }}>📊</div>
        <div style={{ fontSize: 22, fontWeight: 800 }}>Loading your dashboard…</div>
        <div style={{ fontSize: 13, opacity: 0.75 }}>Fetching live data from backend server</div>
        <div style={{ width: 220, height: 6, background: "rgba(255,255,255,0.25)", borderRadius: 99 }}>
          <div style={{ height: "100%", width: "55%", background: "#fff", borderRadius: 99, animation: "slide 1.4s ease-in-out infinite alternate" }} />
        </div>
        <style>{`@keyframes slide { from{width:15%} to{width:85%} }`}</style>
      </div>
    );

  // Error 
  if (error)
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", background: "#f8fafc",
        fontFamily: "'Segoe UI',sans-serif", gap: 16, padding: 32, textAlign: "center",
      }}>
        <div style={{ fontSize: 56 }}>🔌</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#1e293b" }}>Backend Not Reachable</div>
        <div style={{
          maxWidth: 500, fontSize: 14, color: "#64748b", lineHeight: 1.7,
          background: "#fff", padding: "20px 28px", borderRadius: 14,
          boxShadow: "0 2px 16px rgba(0,0,0,0.07)", border: "1px solid #fee2e2",
        }}>{error}</div>
        <div style={{ background: "#1e293b", color: "#a5f3fc", fontFamily: "monospace", fontSize: 13, padding: "12px 24px", borderRadius: 10 }}>
          cd backend &amp;&amp; uvicorn server:app --reload
        </div>
        <button onClick={fetchData} style={{
          padding: "10px 28px", borderRadius: 99, border: "none",
          background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
          color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
        }}>🔄 Retry Connection</button>
      </div>
    );

  //Derived KPIs 
  const totalRev   = revenue.reduce((s, r) => s + (r.total_revenue || 0), 0);
  const avgMonthly = revenue.length ? totalRev / revenue.length : 0;
  const growthPct  = (() => {
    if (revenue.length < 2) return undefined;
    const last = revenue[revenue.length - 1].total_revenue;
    const prev = revenue[revenue.length - 2].total_revenue;
    return parseFloat((((last - prev) / prev) * 100).toFixed(1));
  })();
  const activeCount  = customers.filter((c) => !c.churned).length;
  const churnedCount = customers.filter((c) =>  c.churned).length;
  const churnRate    = customers.length ? ((churnedCount / customers.length) * 100).toFixed(0) : 0;
  const topCat       = [...categories].sort((a, b) => b.total_revenue - a.total_revenue)[0] || {};
  const maxCatRev    = topCat.total_revenue || 1;

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("desc"); }
  };

  //Chart data
  const lineData = {
    labels: filteredRevenue.map((r) => r.order_year_month),
    datasets: [{
      label: "Monthly Revenue",
      data: filteredRevenue.map((r) => r.total_revenue),
      borderColor: "#6366f1", backgroundColor: "rgba(99,102,241,0.1)",
      fill: true, tension: 0.4, pointRadius: 5,
      pointBackgroundColor: "#6366f1", pointBorderColor: "#fff", pointBorderWidth: 2,
    }],
  };
  const lineOptions = {
    responsive: true, plugins: { legend: { display: false } },
    scales: {
      y: { grid: { color: "#f1f5f9" }, ticks: { callback: (v) => fmt(v), color: "#64748b", font: { size: 11 } } },
      x: { grid: { display: false },  ticks: { color: "#64748b", font: { size: 11 } } },
    },
  };
  const doughnutData = {
    labels: categories.map((c) => c.category),
    datasets: [{ data: categories.map((c) => c.total_revenue), backgroundColor: COLORS, borderWidth: 3, borderColor: "#fff", hoverOffset: 10 }],
  };
  const doughnutOptions = {
    responsive: true, cutout: "62%",
    plugins: {
      legend: { position: "bottom", labels: { padding: 14, font: { size: 11 }, usePointStyle: true } },
      tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${fmt(ctx.raw)}` } },
    },
  };

  const monthLabels = revenue.map((r) => r.order_year_month).sort();
  const minMonth    = monthLabels[0] || "";
  const maxMonth    = monthLabels[monthLabels.length - 1] || "";

 
  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#1e293b" }}>

      {/* HEADER */}
      <header style={{
        background: "linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)",
        padding: "0 32px", height: 68,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: "0 4px 24px rgba(99,102,241,0.3)",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 28 }}>📊</span>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>Business Analytics Dashboard</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
              Live data · {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </div>
          </div>
        </div>
        <button onClick={fetchData} style={{
          background: "rgba(255,255,255,0.18)", color: "#fff",
          border: "1px solid rgba(255,255,255,0.3)", borderRadius: 99,
          padding: "7px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer",
        }}>🔄 Refresh</button>
      </header>

      <main style={{ padding: "28px 32px", maxWidth: 1440, margin: "0 auto" }}>

        {/* ROW 1 — KPI Cards */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 24 }}>
          <KpiCard icon="💰" label="Total Revenue"        value={fmt(totalRev)}   sub="All completed orders"            color="#6366f1" trend={growthPct} />
          <KpiCard icon="📅" label="Avg Monthly Revenue"  value={fmt(avgMonthly)} sub={`Over ${revenue.length} months`} color="#10b981" />
          <KpiCard icon="👥" label="Active Customers"     value={activeCount}     sub={`${churnedCount} churned (${churnRate}%)`} color="#f59e0b" />
          <KpiCard icon="🏆" label="Top Category"         value={topCat.category || "—"} sub={fmt(topCat.total_revenue)} color="#8b5cf6" />
          <KpiCard icon="🌍" label="Regions"              value={regions.length}  sub="Geographic territories"          color="#06b6d4" />
        </div>

        {/* ROW 2 — Revenue Line Chart + Category Doughnut */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginBottom: 20 }}>
          <Card title="Monthly Revenue Trend" icon="📈" subtitle="Total completed-order revenue per month — filter by date range">
            {/* BONUS: Date-range filter */}
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>From</label>
              <input type="month" value={dateFrom} min={minMonth} max={dateTo || maxMonth}
                onChange={(e) => setDateFrom(e.target.value)}
                style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, background: "#f8fafc", color: "#1e293b" }} />
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>To</label>
              <input type="month" value={dateTo} min={dateFrom || minMonth} max={maxMonth}
                onChange={(e) => setDateTo(e.target.value)}
                style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, background: "#f8fafc", color: "#1e293b" }} />
              {(dateFrom || dateTo) && (
                <button onClick={() => { setDateFrom(""); setDateTo(""); }}
                  style={{ fontSize: 12, color: "#6366f1", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>
                  ✕ Clear
                </button>
              )}
              <span style={{ marginLeft: "auto", fontSize: 12, color: "#94a3b8" }}>
                {filteredRevenue.length} / {revenue.length} months shown
              </span>
            </div>
            {filteredRevenue.length > 0
              ? <Line data={lineData} options={lineOptions} />
              : <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8", fontSize: 14 }}>No data for selected range</div>
            }
          </Card>

          <Card title="Revenue by Category" icon="🛒" subtitle="Which product types earn the most">
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </Card>
        </div>

        {/* ROW 3 — Category Performance + Region Summary */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
          <Card title="Category Performance" icon="📦" subtitle="Revenue breakdown, order count & average order value per category">
            {categories.length === 0
              ? <div style={{ color: "#94a3b8", fontSize: 14 }}>No category data available</div>
              : [...categories].sort((a, b) => b.total_revenue - a.total_revenue)
                  .map((c, i) => <CategoryRow key={i} c={c} idx={i} maxRevenue={maxCatRev} />)
            }
          </Card>

          {/* Assignment requirement: Region Summary as card-based view */}
          <Card title="Regional Summary" icon="🗺️" subtitle="Customers, orders, total revenue & avg revenue per customer by region">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {regions.length === 0
                ? <div style={{ color: "#94a3b8", fontSize: 14 }}>No region data available</div>
                : regions.map((r, i) => <RegionCard key={i} data={r} idx={i} />)
              }
            </div>
          </Card>
        </div>

        {/* ROW 4 — Top Customers Table (full width) */}
        <Card title="Top 10 Customers" icon="🏆" subtitle="Ranked by total spend on completed orders · green = active · red = churned">
          {/* BONUS: Search box */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#94a3b8" }}>🔍</span>
              <input
                type="text"
                placeholder="Search by name or region…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  paddingLeft: 34, paddingRight: 14, paddingTop: 8, paddingBottom: 8,
                  borderRadius: 10, border: "1px solid #e2e8f0",
                  fontSize: 13, color: "#1e293b", background: "#f8fafc", width: 260, outline: "none",
                }}
              />
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>
              {filteredCustomers.length} of {customers.length} customers · click column headers to sort
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {[
                    { key: null,          label: "#" },
                    { key: "name",        label: "Customer" },
                    { key: "region",      label: "Region" },
                    { key: "total_spend", label: "Total Spend" },
                    { key: "churned",     label: "Status" },
                  ].map(({ key, label }) => (
                    <th key={label} onClick={() => key && toggleSort(key)} style={{
                      padding: "10px 14px", textAlign: "left", fontSize: 11,
                      fontWeight: 700, color: "#94a3b8", textTransform: "uppercase",
                      letterSpacing: 0.5, borderBottom: "2px solid #f1f5f9",
                      cursor: key ? "pointer" : "default", userSelect: "none", whiteSpace: "nowrap",
                    }}>
                      {label}{key && <SortArrow col={key} sortCol={sortCol} sortDir={sortDir} />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: "center", padding: "36px", color: "#94a3b8", fontSize: 14 }}>
                    {search ? `No customers match "${search}"` : "No customer data available"}
                  </td></tr>
                ) : filteredCustomers.map((c, i) => (
                  <tr key={i}
                    style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.12s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "12px 14px", fontSize: 14, color: "#94a3b8", fontWeight: 700 }}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                          background: `linear-gradient(135deg,${COLORS[i%COLORS.length]}44,${COLORS[i%COLORS.length]})`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 14, fontWeight: 800, color: COLORS[i % COLORS.length],
                        }}>
                          {(c.name || "?").charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 99, background: "#f1f5f9", color: "#475569" }}>
                        {c.region}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px", fontWeight: 700, fontSize: 14, color: "#1e293b" }}>
                      {fmtFull(c.total_spend)}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <Badge active={!c.churned} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <footer style={{ textAlign: "center", padding: "24px 0 8px", fontSize: 12, color: "#94a3b8" }}>
          Business Analytics Dashboard · All data served by FastAPI backend · React + Chart.js
        </footer>
      </main>

      {/* Responsive */}
      <style>{`
        @media (max-width: 900px) {
          main > div[style*="2fr 1fr"], main > div[style*="1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 600px) {
          header { padding: 0 16px !important; }
          main   { padding: 16px !important; }
        }
      `}</style>
    </div>
  );
}
