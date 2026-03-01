// src/pages/AdminDashboardPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Admin dashboard — composes the three management widgets and adds a
// top-level stats bar that cross-slices all three domains.
// Wrapped by <AdminRoute> in the router, so only admins can reach it.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

// Widgets
import MaintenanceAlertsWidget from '../components/admin/MaintenanceAlertsWidget';
import LowStockWidget          from '../components/admin/LowStockWidget';
import StaffShiftWidget        from '../components/admin/StaffShiftWidget';
import PaymentOverridePanel    from '../components/admin/PaymentOverridePanel';

// Selectors for the cross-domain stats bar
import { selectMaintenanceSummary } from '../store/slices/maintenanceSlice';
import { selectLowStockAlerts }     from '../store/slices/inventorySlice';
import { selectStaffList }          from '../store/slices/staffSlice';

// ─────────────────────────────────────────────────────────────────────────────
const AdminDashboardPage = () => {
  const maintenance  = useSelector(selectMaintenanceSummary);
  const lowStock     = useSelector(selectLowStockAlerts);
  const staffList    = useSelector(selectStaffList);

  // ── Derived stats for the top bar ─────────────────────────────────────────
  const pendingRepairs  = maintenance.pending    ?? 0;
  const activeRepairs   = maintenance.inProgress ?? 0;
  const lowStockCount   = lowStock?.count        ?? 0;

  const activeStaff     = staffList.filter((s) => s.isActive).length;
  const totalStaff      = staffList.length;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <main className="admin-dashboard">
      <h1 className="admin-dashboard__heading">Admin Dashboard</h1>

      {/* ── Cross-domain stats bar ──────────────────────────────────────── */}
      <div className="stats-bar" aria-label="Overview statistics">
        <StatCard
          label="Pending Repairs"
          value={pendingRepairs}
          modifier={pendingRepairs > 0 ? 'warning' : 'success'}
          icon="🔧"
        />
        <StatCard
          label="Active Repairs"
          value={activeRepairs}
          modifier={activeRepairs > 0 ? 'info' : 'success'}
          icon="⚙️"
        />
        <StatCard
          label="Low Stock Items"
          value={lowStockCount}
          modifier={lowStockCount > 0 ? 'danger' : 'success'}
          icon="📦"
        />
        <StatCard
          label="Active Staff"
          value={`${activeStaff} / ${totalStaff}`}
          modifier="neutral"
          icon="👥"
        />
      </div>

      {/* ── Widget grid ────────────────────────────────────────────────── */}
      <div className="admin-dashboard__grid">
        {/* Maintenance alerts — spans full width on smaller layouts */}
        <div className="admin-dashboard__widget admin-dashboard__widget--full">
          <MaintenanceAlertsWidget />
        </div>

        {/* Low stock + staff shifts sit side-by-side on wide screens */}
        <div className="admin-dashboard__widget">
          <LowStockWidget />
        </div>

        <div className="admin-dashboard__widget">
          <StaffShiftWidget />
        </div>

        {/* Payment override spans full width — admins act on it urgently */}
        <div className="admin-dashboard__widget admin-dashboard__widget--full">
          <PaymentOverridePanel />
        </div>
      </div>
    </main>
  );
};

// ── StatCard (file-private) ───────────────────────────────────────────────────
const StatCard = ({ label, value, modifier, icon }) => (
  <div className={`stat-card stat-card--${modifier}`}>
    <span className="stat-card__icon" aria-hidden="true">{icon}</span>
    <span className="stat-card__value">{value}</span>
    <span className="stat-card__label">{label}</span>
  </div>
);

export default AdminDashboardPage;
