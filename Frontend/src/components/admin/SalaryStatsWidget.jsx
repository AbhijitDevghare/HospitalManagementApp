// src/components/admin/SalaryStatsWidget.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Reads selectSalarySummary (populated by fetchSalarySummary) and renders
// a visual breakdown: bar chart proportional to average salary, head-count,
// and total payroll per role. Purely presentational — no dispatches.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { useSelector } from 'react-redux';
import { selectSalarySummary } from '../../store/slices/staffSlice';

const SalaryStatsWidget = () => {
  const summary = useSelector(selectSalarySummary); // [{ role, headCount, averageSalary, totalSalary }]

  if (!summary?.length) return null;

  const maxAvg = Math.max(...summary.map((r) => r.averageSalary ?? 0), 1);

  const grandTotal    = summary.reduce((s, r) => s + (r.totalSalary  ?? 0), 0);
  const totalHeads    = summary.reduce((s, r) => s + (r.headCount    ?? 0), 0);

  return (
    <section className="salary-widget" aria-labelledby="sal-title">
      <h2 id="sal-title" className="salary-widget__title">💰 Salary Overview by Role</h2>

      {/* ── Totals ────────────────────────────────────────────────────── */}
      <div className="salary-widget__totals">
        <div className="salary-widget__total-card">
          <span className="salary-widget__total-value">{totalHeads}</span>
          <span className="salary-widget__total-label">Total Staff</span>
        </div>
        <div className="salary-widget__total-card salary-widget__total-card--highlight">
          <span className="salary-widget__total-value">
            ${grandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
          <span className="salary-widget__total-label">Monthly Payroll</span>
        </div>
      </div>

      {/* ── Per-role breakdown ────────────────────────────────────────── */}
      <div className="salary-widget__rows">
        {summary.map((row) => {
          const pct = ((row.averageSalary ?? 0) / maxAvg) * 100;
          const role = row.role ?? row._id ?? 'Unknown';
          return (
            <div key={role} className="salary-widget__row">
              <div className="salary-widget__row-header">
                <span className="salary-widget__role">
                  <span className={`badge badge--role`}>{role}</span>
                </span>
                <span className="salary-widget__heads">
                  {row.headCount ?? 0} staff
                </span>
                <span className="salary-widget__avg">
                  avg ${Number(row.averageSalary ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
                <span className="salary-widget__total">
                  total ${Number(row.totalSalary ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
              {/* Proportional bar */}
              <div
                className="salary-widget__bar-track"
                role="presentation"
                aria-label={`${role} average salary bar`}
              >
                <div
                  className="salary-widget__bar"
                  style={{ width: `${pct.toFixed(1)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default SalaryStatsWidget;
