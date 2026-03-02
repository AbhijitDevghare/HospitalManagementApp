// src/components/admin/LowStockWidget.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Fetches fetchLowStockAlerts and fetchInventorySummary.
// Displays a per-category summary row and a detailed alert list showing
// each item's current quantity vs its threshold (deficit).
// Provides a quick inline restock field that dispatches updateStock.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchLowStockAlerts,
  fetchInventorySummary,
  updateStock,
  selectLowStockAlerts,
  selectInventorySummary,
  selectInventoryLoading,
  selectInventoryError,
  selectLastAlertMessage,
  clearAlertMessage,
  clearInventoryError,
} from '../../store/slices/inventorySlice';

// ─────────────────────────────────────────────────────────────────────────────
const LowStockWidget = () => {
  const dispatch      = useDispatch();
  const alerts        = useSelector(selectLowStockAlerts);   // { count, items[] }
  const summary       = useSelector(selectInventorySummary); // array of { _id, totalItems, … }
  const loading       = useSelector(selectInventoryLoading);
  const error         = useSelector(selectInventoryError);
  const alertMessage  = useSelector(selectLastAlertMessage);

  // Inline restock state: { [itemId]: quantityString }
  const [restockQty, setRestockQty]   = useState({});
  const [restockingId, setRestockingId] = useState(null);

  // ── Initial fetch ─────────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchLowStockAlerts());
    dispatch(fetchInventorySummary());
  }, [dispatch]);

  // ── Auto-dismiss alert message after 4 s ─────────────────────────────────
  useEffect(() => {
    if (!alertMessage) return;
    const t = setTimeout(() => dispatch(clearAlertMessage()), 4000);
    return () => clearTimeout(t);
  }, [dispatch, alertMessage]);

  // ── Restock handler ───────────────────────────────────────────────────────
  const handleRestock = async (itemId) => {
    const qty = Number(restockQty[itemId]);
    if (!qty || qty <= 0) return;
    setRestockingId(itemId);
    await dispatch(updateStock({ id: itemId,operation:"add", quantity:qty}));
    setRestockingId(null);
    setRestockQty((prev) => ({ ...prev, [itemId]: '' }));
  };

  const alertItems = alerts?.items ?? [];
  const alertCount = alerts?.count ?? 0;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <section className="widget widget--inventory" aria-labelledby="stock-title">
      <header className="widget__header">
        <h2 id="stock-title" className="widget__title">
          📦 Low Stock Alerts
          {alertCount > 0 && (
            <span className="widget__badge widget__badge--danger">{alertCount}</span>
          )}
        </h2>
        <button
          className="btn btn--ghost btn--sm"
          onClick={() => {
            dispatch(fetchLowStockAlerts());
            dispatch(fetchInventorySummary());
          }}
          disabled={loading}
          aria-label="Refresh inventory data"
        >
          {loading ? '…' : '↺ Refresh'}
        </button>
      </header>

      {/* ── Toast messages ───────────────────────────────────────────────── */}
      {alertMessage && (
        <p className="widget__toast widget__toast--warning" role="status">
          {alertMessage}
          <button
            className="widget__toast-close"
            onClick={() => dispatch(clearAlertMessage())}
            aria-label="Dismiss"
          >✕</button>
        </p>
      )}
      {error && (
        <p className="widget__toast widget__toast--error" role="alert">
          {error}
          <button
            className="widget__toast-close"
            onClick={() => dispatch(clearInventoryError())}
            aria-label="Dismiss error"
          >✕</button>
        </p>
      )}

      {/* ── Category summary ─────────────────────────────────────────────── */}
      {summary.length > 0 && (
        <div className="widget__section">
          <h3 className="widget__section-title">By Category</h3>
          <div className="category-pills">
            {summary.map((cat) => (
              <div key={cat._id} className="category-pill">
                <span className="category-pill__name">{cat._id}</span>
                <span className="category-pill__count">{cat.totalItems ?? cat.count ?? 0} items</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Alert items list ─────────────────────────────────────────────── */}
      <div className="widget__section">
        <h3 className="widget__section-title">Items Below Threshold</h3>

        {alertItems.length === 0 && !loading ? (
          <p className="widget__empty">All items are sufficiently stocked. ✓</p>
        ) : (
          <div className="widget__table-wrapper">
            <table className="data-table" aria-label="Low stock items">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Category</th>
                  <th>Qty</th>
                  <th>Threshold</th>
                  <th>Deficit</th>
                  <th>Quick Restock</th>
                </tr>
              </thead>
              <tbody>
                {alertItems.map((item) => {
                  const id = item._id ?? item.id;
                  return (
                    <tr key={id} className="data-table__row data-table__row--alert">
                      <td>{item.itemName}</td>
                      <td>{item.category}</td>
                      <td>
                        <span className="data-table__qty data-table__qty--low">
                          {item.quantity}
                        </span>
                      </td>
                      <td>{item.lowStockThreshold}</td>
                      <td>
                        <span className="badge badge--danger">
                          -{item.deficit ?? (item.lowStockThreshold - item.quantity)}
                        </span>
                      </td>
                      <td>
                        <div className="inline-restock">
                          <input
                            type="number"
                            min="1"
                            placeholder="Qty"
                            value={restockQty[id] ?? ''}
                            onChange={(e) =>
                              setRestockQty((prev) => ({ ...prev, [id]: e.target.value }))
                            }
                            aria-label={`Restock quantity for ${item.itemName}`}
                            className="inline-restock__input"
                          />
                          <button
                            className="btn btn--primary btn--sm"
                            onClick={() => handleRestock(id)}
                            disabled={!restockQty[id] || restockingId === id}
                            aria-label={`Add stock for ${item.itemName}`}
                          >
                            {restockingId === id ? '…' : '+ Add'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};

export default LowStockWidget;
