import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { BarChart3, TrendingUp, PieChart as PieIcon, Award } from 'lucide-react';

const SalesAnalytics = () => {
  const { apiFetch } = useAuth();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeals = async () => {
      try {
        const res = await apiFetch('/api/deals');
        if (res && res.data) {
          setDeals(res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDeals();
  }, [apiFetch]);

  // Calculations
  const calculations = React.useMemo(() => {
    if (deals.length === 0) return { forecast: 0, winRate: 0, funnel: [], repPerformance: [] };

    // 1. Revenue Forecast (weighted by stage probability)
    const forecast = deals
      .filter(d => !['Closed Won', 'Closed Lost'].includes(d.stage))
      .reduce((sum, d) => sum + d.amount * ((d.probability || 0) / 100), 0);

    // 2. Win Rate Ratio: Won / (Won + Lost)
    const wonCount = deals.filter(d => d.stage === 'Closed Won').length;
    const lostCount = deals.filter(d => d.stage === 'Closed Lost').length;
    const winRate = wonCount + lostCount > 0 ? (wonCount / (wonCount + lostCount)) * 100 : 0;

    // 3. Stage Funnel (counts by stage)
    const stages = ['New', 'Contacted', 'Proposal Sent', 'Negotiation', 'Closed Won'];
    const funnel = stages.map(stage => ({
      name: stage,
      value: deals.filter(d => d.stage === stage).reduce((sum, d) => sum + d.amount, 0),
      count: deals.filter(d => d.stage === stage).length
    }));

    // 4. Rep Performance (won deals value by rep)
    const repMap = {};
    deals.filter(d => d.stage === 'Closed Won').forEach(d => {
      const repName = d.assignedTo?.name || 'Unassigned';
      repMap[repName] = (repMap[repName] || 0) + d.amount;
    });

    const repPerformance = Object.keys(repMap).map(name => ({
      name,
      value: repMap[name]
    }));

    return { forecast, winRate, funnel, repPerformance, wonCount, lostCount };
  }, [deals]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#a855f7'];

  if (loading) return <div style={{ textAlign: 'center', padding: '100px' }}>Loading analytics metrics...</div>;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 className="gradient-text" style={{ fontSize: '1.8rem', marginBottom: '4px' }}>Sales Analytics</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Revenue forecasts, win rates, conversion funnels, and sales rep performance statistics.</p>
      </div>

      {/* Analytics KPI Blocks */}
      <div style={kpiGridStyles}>
        <div className="glass-card" style={kpiCardStyles}>
          <TrendingUp size={24} style={{ color: 'var(--primary)' }} />
          <div>
            <span style={kpiLabelStyles}>Probability-Weighted Forecast</span>
            <h3>₹{calculations.forecast.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h3>
          </div>
        </div>

        <div className="glass-card" style={kpiCardStyles}>
          <Award size={24} style={{ color: 'var(--success)' }} />
          <div>
            <span style={kpiLabelStyles}>Win Rate Ratio</span>
            <h3>{calculations.winRate.toFixed(1)}%</h3>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              ({calculations.wonCount} won vs {calculations.lostCount} lost deals)
            </span>
          </div>
        </div>
      </div>

      {/* Recharts Splits Grid */}
      <div style={splitGridStyles}>
        {/* Chart A: Stage Funnel Value */}
        <div className="glass-card">
          <h3 style={chartTitleStyles}>Pipeline Funnel Value (₹)</h3>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={calculations.funnel}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" />
                <YAxis stroke="var(--text-muted)" />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--glass-border)' }}
                  formatter={(val) => [`₹${val.toLocaleString('en-IN')}`, 'Pipeline Value']}
                />
                <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]}>
                  {calculations.funnel.map((entry, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart B: Win Value Distribution by Rep */}
        <div className="glass-card">
          <h3 style={chartTitleStyles}>Won Revenue by Sales Rep (₹)</h3>
          {calculations.repPerformance.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '100px 0' }}>No Closed Won sales data available.</p>
          ) : (
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={calculations.repPerformance}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {calculations.repPerformance.map((entry, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--glass-border)' }}
                    formatter={(val) => `₹${val.toLocaleString('en-IN')}`}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Styles objects ---
const kpiGridStyles = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: '20px',
};

const kpiCardStyles = {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
};

const kpiLabelStyles = {
  fontSize: '12px',
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  fontWeight: 'bold',
  letterSpacing: '0.02em',
};

const splitGridStyles = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
  gap: '24px',
};

const chartTitleStyles = {
  fontSize: '1rem',
  marginBottom: '20px',
  borderBottom: '1px solid var(--glass-border)',
  paddingBottom: '10px',
};

export default SalesAnalytics;
