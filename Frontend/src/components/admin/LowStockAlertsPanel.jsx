// src/components/admin/LowStockAlertsPanel.jsx
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  getLowStockAlerts,
  selectLowStockAlerts,
  selectInventoryLoading,
} from '../../store/slices/inventorySlice';
import QuickStockControl from './QuickStockControl';

const LowStockAlertsPanel = ({ onItemUpdated }) => {
  const dispatch = useDispatch();
  const alerts   = useSelector(selectLowStockAlerts);
  const loading  = useSelector(selectInventoryLoading);

  useEffect(() => { dispatch(getLowStockAlerts()); }, [dispatch]);

  const items = Array.isArray(alerts) ? alerts : [];

  return (
    <div className="widget lsa-panel">
      <div className="widget__header">
        <h3 className="widget__title">
          🚨 Low Stock Alerts
          {items.length > 0 && (
            <span className="widget__badge widget__badge--danger">{items.length}</span>
          )}
        </h3>
        <button
          className="btn btn--ghost btn--sm"
          onClick={() => dispatch(getLowStockAlerts())}
          disabled={loading}
          aria-label="Refresh low stock alerts"
        >
          {loading ? <span className="hms-spinner hms-spinner--sm" aria-hidden="true" /> : '↺'}
        </button>
      </div>

      {items.length === 0 && !loading && (
        <div className="lsa-empty">
          <span className="lsa-empty__icon">✅</span>
          <p className="lsa-empty__msg">All stock levels are healthy.</p>
        </div>
      )}

      {items.length > 0 && (
        <ul className="lsa-list" aria-label="Low stock items">
          {items.map((item) => {
            const id          = item._id ?? item.id;
            const pct         = item.lowStockThreshold > 0
              ? Math.min(100, Math.round((item.quantity / item.lowStockThreshold) * 100))
              : 0;
            const isCritical  = item.quantity === 0;
            const isVeryLow   = !isCritical && pct <= 50;

            return (
              <li key={id}
                className={`lsa-item ${isCritical ? 'lsa-item--critical' : isVeryLow ? 'lsa-item--low' : 'lsa-item--warning'}`}
              >
                <div className="lsa-item__header">
                  <div className="lsa-item__info">
                    <span className="lsa-item__name">{item.itemName}</span>
                    <span className="badge badge--category capitalize">{item.category}</span>
                  </div>
                  <div className="lsa-item__qty-block">
                    {isCritical
                      ? <span className="lsa-item__qty lsa-item__qty--out">Out of stock</span>
                      : (
                        <span className="lsa-item__qty">
                          <strong>{item.quantity}</strong>
                          <span className="lsa-item__unit">/ {item.lowStockThreshold} {item.unit}</span>
                        </span>
                      )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="lsa-bar-track" role="progressbar"
                  aria-valuenow={item.quantity} aria-valuemin={0}
                  aria-valuemax={item.lowStockThreshold}
                  aria-label={`${item.quantity} of ${item.lowStockThreshold} ${item.unit} remaining`}>
                  <div
                    className={`lsa-bar ${isCritical ? 'lsa-bar--critical' : isVeryLow ? 'lsa-bar--low' : 'lsa-bar--warning'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* Quick restock */}
                <div className="lsa-item__restock">
                  <span className="lsa-item__restock-label">Quick restock:</span>
                  <QuickStockControl item={item} onUpdated={onItemUpdated} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default LowStockAlertsPanel;
