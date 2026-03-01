// src/components/admin/SalaryAnalyticsWidget.jsx
import React from 'react';
import { useSelector } from 'react-redux';
import { selectSalarySummary, selectStaffLoading } from '../../store/slices/staffSlice';

const ROLE_COLORS = {
  admin:         'bg-violet-500',
  manager:       'bg-brand-500',
  receptionist:  'bg-sky-500',
  housekeeping:  'bg-teal-500',
  maintenance:   'bg-amber-500',
  security:      'bg-rose-500',
};

const fmt = (n) => `$${Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const SalaryAnalyticsWidget = () => {
  const summary = useSelector(selectSalarySummary);
  const loading = useSelector(selectStaffLoading);

  const rows = Array.isArray(summary) ? summary : [];
  const totalPayroll  = rows.reduce((s, r) => s + (r.totalSalary  ?? r.total ?? 0), 0);
  const totalHeadcount = rows.reduce((s, r) => s + (r.count ?? r.headcount ?? 0), 0);
  const maxPayroll    = Math.max(...rows.map((r) => r.totalSalary ?? r.total ?? 0), 1);

  return (
    <div className="widget">
      <div className="widget__header">
        <h3 className="widget__title">💰 Payroll by Department</h3>
        {loading && <span className="hms-spinner hms-spinner--sm" aria-hidden="true" />}
      </div>

      {/* Totals */}
      <div className="saw-totals">
        <div className="saw-total-card">
          <span className="saw-total-card__value">{totalHeadcount}</span>
          <span className="saw-total-card__label">Total Staff</span>
        </div>
        <div className="saw-total-card saw-total-card--highlight">
          <span className="saw-total-card__value">{fmt(totalPayroll)}</span>
          <span className="saw-total-card__label">Monthly Payroll</span>
        </div>
        <div className="saw-total-card">
          <span className="saw-total-card__value">
            {totalHeadcount > 0 ? fmt(totalPayroll / totalHeadcount) : '—'}
          </span>
          <span className="saw-total-card__label">Avg. per Person</span>
        </div>
      </div>

      {rows.length === 0 && !loading && (
        <p className="widget__empty">No salary data available.</p>
      )}

      {/* Per-role bars */}
      <div className="saw-rows">
        {rows.map((row) => {
          const role      = row._id ?? row.role ?? 'unknown';
          const count     = row.count ?? row.headcount ?? 0;
          const total     = row.totalSalary ?? row.total ?? 0;
          const avg       = row.avgSalary ?? row.average ?? (count > 0 ? total / count : 0);
          const pct       = Math.round((total / maxPayroll) * 100);
          const barColor  = ROLE_COLORS[role] ?? 'bg-slate-400';

          return (
            <div key={role} className="saw-row">
              <div className="saw-row__header">
                <div className="saw-row__left">
                  <span className={`saw-role-dot ${barColor}`} aria-hidden="true" />
                  <span className="saw-row__role capitalize">{role}</span>
                  <span className="badge badge--muted">{count} staff</span>
                </div>
                <div className="saw-row__right">
                  <span className="saw-row__avg">{fmt(avg)}/mo avg</span>
                  <span className="saw-row__total">{fmt(total)} total</span>
                </div>
              </div>
              <div className="saw-bar-track" role="progressbar"
                aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
                aria-label={`${role} payroll: ${pct}% of highest`}>
                <div className={`saw-bar ${barColor}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SalaryAnalyticsWidget;
