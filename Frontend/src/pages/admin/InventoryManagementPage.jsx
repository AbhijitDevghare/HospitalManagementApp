// src/pages/admin/InventoryManagementPage.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector }                from 'react-redux';
import {
  fetchAllInventoryItems, deleteInventoryItem, getLowStockAlerts,
  selectInventoryItems, selectInventoryLoading, selectInventoryError,
  selectLowStockAlerts, clearInventoryError,
} from '../../store/slices/inventorySlice';
import InventoryFormModal  from '../../components/admin/InventoryFormModal';
import QuickStockControl   from '../../components/admin/QuickStockControl';
import LowStockAlertsPanel from '../../components/admin/LowStockAlertsPanel';

const PAGE_SIZE = 15;

const CATEGORY_ICONS = {
  food: '🍽️', beverage: '🥤', housekeeping: '🧹',
  maintenance: '🔧', toiletries: '🧴', linen: '🛏️',
  electronics: '💡', other: '📦',
};

// ── Delete confirm modal ──────────────────────────────────────────────────────
const DeleteConfirm = ({ item, onConfirm, onCancel, busy }) => (
  <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
    <div className="modal modal--sm" role="dialog" aria-modal="true" aria-labelledby="idc-title">
      <header className="modal__header">
        <h2 id="idc-title" className="modal__title">🗑️ Delete Item</h2>
        <button className="modal__close" onClick={onCancel} aria-label="Close">✕</button>
      </header>
      <div className="modal__body">
        <p className="text-sm text-slate-700">
          Permanently remove <strong>{item.itemName}</strong> from inventory?
        </p>
        <div className="alert alert--error">
          <span className="alert__icon">⚠️</span>
          <span>
            All stock history for this item will be lost. This cannot be undone.
          </span>
        </div>
        <dl className="idc-summary">
          <dt>Current stock</dt>
          <dd>{item.quantity} {item.unit}</dd>
          <dt>Category</dt>
          <dd className="capitalize">{item.category}</dd>
        </dl>
      </div>
      <footer className="modal__footer">
        <button className="btn btn--ghost" onClick={onCancel} disabled={busy}>Cancel</button>
        <button className="btn btn--danger" onClick={onConfirm} disabled={busy} aria-busy={busy}>
          {busy
            ? <><span className="hms-spinner hms-spinner--sm" aria-hidden="true" /> Deleting…</>
            : 'Yes, Delete Item'}
        </button>
      </footer>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
const InventoryManagementPage = () => {
  const dispatch   = useDispatch();
  const items      = useSelector(selectInventoryItems);
  const loading    = useSelector(selectInventoryLoading);
  const error      = useSelector(selectInventoryError);
  const lowAlerts  = useSelector(selectLowStockAlerts);

  const [search,      setSearch]      = useState('');
  const [catFilter,   setCatFilter]   = useState('');
  const [stockFilter, setStockFilter] = useState(''); // '' | 'low' | 'ok'
  const [page,        setPage]        = useState(1);
  const [showAlerts,  setShowAlerts]  = useState(true);

  const [formItem,    setFormItem]    = useState(undefined); // undefined=closed, null=add, obj=edit
  const [deleteTarget,setDeleteTarget]= useState(null);
  const [deleting,    setDeleting]    = useState(false);
  const [toast,       setToast]       = useState(null);

  // ── Fetch on mount ────────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchAllInventoryItems({ ...(catFilter && { category: catFilter }) }));
    dispatch(getLowStockAlerts());
  }, [dispatch, catFilter]);

  const pushToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Derived list ──────────────────────────────────────────────────────────
  const allItems = Array.isArray(items) ? items : [];
  const alertIds = new Set((Array.isArray(lowAlerts) ? lowAlerts : []).map((a) => a._id ?? a.id));

  const filtered = allItems.filter((it) => {
    if (search) {
      const q = search.toLowerCase();
      if (!it.itemName?.toLowerCase().includes(q) && !it.category?.toLowerCase().includes(q) &&
          !it.supplier?.toLowerCase().includes(q)) return false;
    }
    if (stockFilter === 'low' && !alertIds.has(it._id ?? it.id)) return false;
    if (stockFilter === 'ok'  &&  alertIds.has(it._id ?? it.id)) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSlice  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Category pills ────────────────────────────────────────────────────────
  const categories = [...new Set(allItems.map((it) => it.category).filter(Boolean))];

  // ── Summary counts ────────────────────────────────────────────────────────
  const totalQtyValue = allItems.reduce((s, it) =>
    s + (it.quantity ?? 0) * (it.costPerUnit ?? 0), 0);
  const lowCount = alertIds.size;

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await dispatch(deleteInventoryItem(deleteTarget._id ?? deleteTarget.id));
    setDeleting(false);
    setDeleteTarget(null);
    if (deleteInventoryItem.fulfilled.match(result)) {
      pushToast(`"${deleteTarget.itemName}" removed from inventory.`);
      dispatch(getLowStockAlerts());
    }
  }, [dispatch, deleteTarget]);

  const handleStockUpdated = useCallback(() => {
    dispatch(fetchAllInventoryItems({ ...(catFilter && { category: catFilter }) }));
    dispatch(getLowStockAlerts());
  }, [dispatch, catFilter]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <main className="admin-page" aria-labelledby="imp-title">

      {/* ── Toast ── */}
      {toast && (
        <div className={`toast toast--${toast.type} fixed top-4 right-4 z-50 w-80`} role="status">
          <span className="toast__body">{toast.msg}</span>
          <button className="toast__close" onClick={() => setToast(null)} aria-label="Dismiss">✕</button>
        </div>
      )}

      {/* ── Page header ── */}
      <div className="admin-page__header">
        <h1 id="imp-title" className="admin-page__title">📦 Inventory Management</h1>
        <div className="action-group">
          <button
            className={`btn btn--sm ${showAlerts ? 'btn--primary' : 'btn--ghost'}`}
            onClick={() => setShowAlerts((v) => !v)}
            aria-pressed={showAlerts}
          >
            🚨 Alerts {lowCount > 0 && <span className="imp-alert-count">{lowCount}</span>}
          </button>
          <button className="btn btn--ghost btn--sm"
            onClick={() => { dispatch(fetchAllInventoryItems({})); dispatch(getLowStockAlerts()); }}
            disabled={loading} aria-label="Refresh">
            {loading ? '…' : '↺ Refresh'}
          </button>
          <button className="btn btn--primary" onClick={() => setFormItem(null)}>
            + Add Item
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="alert alert--error mb-4" role="alert">
          <span className="alert__icon">⚠️</span>
          <span>{error}</span>
          <button className="alert__close" onClick={() => dispatch(clearInventoryError())}
            aria-label="Dismiss">✕</button>
        </div>
      )}

      {/* ── Summary stats ── */}
      <div className="stats-bar">
        <div className="stat-card stat-card--neutral">
          <span className="stat-card__icon">📦</span>
          <span className="stat-card__value">{allItems.length}</span>
          <span className="stat-card__label">Total Items</span>
        </div>
        <div className="stat-card stat-card--danger">
          <span className="stat-card__icon">🚨</span>
          <span className="stat-card__value">{lowCount}</span>
          <span className="stat-card__label">Low Stock</span>
        </div>
        <div className="stat-card stat-card--success">
          <span className="stat-card__icon">✅</span>
          <span className="stat-card__value">{allItems.length - lowCount}</span>
          <span className="stat-card__label">Stocked OK</span>
        </div>
        <div className="stat-card stat-card--info">
          <span className="stat-card__icon">💰</span>
          <span className="stat-card__value">
            ${totalQtyValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
          <span className="stat-card__label">Stock Value</span>
        </div>
      </div>

      {/* ── Low stock alerts panel ── */}
      {showAlerts && lowCount > 0 && (
        <div className="mb-6">
          <LowStockAlertsPanel onItemUpdated={handleStockUpdated} />
        </div>
      )}

      {/* ── Category pills ── */}
      {categories.length > 0 && (
        <div className="category-pills">
          <button
            className={`category-pill ${!catFilter ? 'category-pill--active' : ''}`}
            onClick={() => { setCatFilter(''); setPage(1); }}
          >
            <span>🏷️</span>
            <span className="category-pill__name">All</span>
            <span className="category-pill__count">{allItems.length}</span>
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              className={`category-pill ${catFilter === cat ? 'category-pill--active' : ''}`}
              onClick={() => { setCatFilter(cat); setPage(1); }}
            >
              <span>{CATEGORY_ICONS[cat] ?? '📦'}</span>
              <span className="category-pill__name capitalize">{cat}</span>
              <span className="category-pill__count">
                {allItems.filter((it) => it.category === cat).length}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── Filters ── */}
      <div className="filter-bar">
        <div className="form-group form-group--inline">
          <label htmlFor="imp-search">Search</label>
          <input id="imp-search" type="search" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Item name, category, supplier…" />
        </div>
        <div className="form-group form-group--inline">
          <label htmlFor="imp-stock">Stock</label>
          <select id="imp-stock" value={stockFilter}
            onChange={(e) => { setStockFilter(e.target.value); setPage(1); }}>
            <option value="">All</option>
            <option value="low">🚨 Low / Out</option>
            <option value="ok">✅ Stocked OK</option>
          </select>
        </div>
        {(search || stockFilter) && (
          <button className="btn btn--ghost btn--sm"
            onClick={() => { setSearch(''); setStockFilter(''); setPage(1); }}>
            Clear
          </button>
        )}
        <span className="filter-bar__count">
          {filtered.length} item{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Table ── */}
      {pageSlice.length === 0 && !loading ? (
        <p className="page-empty">No inventory items match the current filters.</p>
      ) : (
        <div className="table-wrapper">
          <table className="data-table data-table--full" aria-label="Inventory list">
            <thead>
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th>Stock</th>
                <th>Threshold</th>
                <th>Cost / Unit</th>
                <th>Supplier</th>
                <th>Quick Stock</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageSlice.map((item) => {
                const id        = item._id ?? item.id;
                const isLow     = alertIds.has(id);
                const isOut     = item.quantity === 0;
                const rowCls    = isOut ? 'data-table__row--alert' : isLow ? 'imp-row--low' : '';

                return (
                  <tr key={id} className={rowCls}>
                    {/* Item name */}
                    <td>
                      <div className="imp-item-cell">
                        <span className="imp-item-icon">
                          {CATEGORY_ICONS[item.category] ?? '📦'}
                        </span>
                        <div>
                          <p className="imp-item-name">{item.itemName}</p>
                          {item.description && (
                            <p className="imp-item-desc">{item.description}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td>
                      <span className="badge badge--category capitalize">{item.category}</span>
                    </td>

                    {/* Stock quantity */}
                    <td>
                      <span className={isOut
                        ? 'data-table__qty--low'
                        : isLow
                          ? 'imp-qty--low'
                          : 'data-table__qty--ok'}>
                        {isOut && '⚠ '}
                        {item.quantity} {item.unit}
                      </span>
                    </td>

                    {/* Low stock threshold */}
                    <td className="text-slate-500 text-xs">
                      ≤ {item.lowStockThreshold} {item.unit}
                    </td>

                    {/* Cost */}
                    <td className="text-slate-600">
                      {item.costPerUnit
                        ? `$${Number(item.costPerUnit).toFixed(2)}`
                        : <span className="text-slate-400">—</span>}
                    </td>

                    {/* Supplier */}
                    <td className="text-slate-600 text-xs">
                      {item.supplier || <span className="text-slate-400">—</span>}
                    </td>

                    {/* Quick stock control */}
                    <td>
                      <QuickStockControl item={item} onUpdated={handleStockUpdated} />
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="action-group">
                        <button className="btn btn--ghost btn--sm"
                          onClick={() => setFormItem(item)}
                          aria-label={`Edit ${item.itemName}`}>
                          ✏️ Edit
                        </button>
                        <button className="btn btn--danger btn--sm"
                          onClick={() => setDeleteTarget(item)}
                          aria-label={`Delete ${item.itemName}`}>
                          🗑️
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

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="pagination">
          <button className="btn btn--ghost btn--sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            ← Prev
          </button>
          <span className="pagination__info">Page {page} of {totalPages}</span>
          <button className="btn btn--ghost btn--sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            Next →
          </button>
        </div>
      )}

      {/* ── Add / Edit modal ── */}
      {formItem !== undefined && (
        <InventoryFormModal
          item={formItem}
          onClose={() => setFormItem(undefined)}
          onSuccess={(saved) => {
            setFormItem(undefined);
            handleStockUpdated();
            pushToast(
              formItem
                ? `"${saved.itemName}" updated successfully.`
                : `"${saved.itemName}" added to inventory.`
            );
          }}
        />
      )}

      {/* ── Delete confirm modal ── */}
      {deleteTarget && (
        <DeleteConfirm
          item={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          busy={deleting}
        />
      )}
    </main>
  );
};

export default InventoryManagementPage;
