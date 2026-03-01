// src/pages/admin/StockMonitorPage.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector }                from 'react-redux';
import {
  fetchAllItems, addInventoryItem, updateItemDetails,
  deleteItem as deleteInventoryItem, updateStock, fetchLowStockAlerts,
  selectInventoryItems, selectLowStockAlerts,
  selectInventoryLoading, selectInventoryError, clearInventoryError,
} from '../../store/slices/inventorySlice';
import InventoryFormModal from '../../components/admin/InventoryFormModal';

const CATEGORY_ICONS = {
  food: '🍎', beverages: '🥤', cleaning: '🧹', toiletries: '🧴',
  linens: '🛏️', maintenance: '🔧', office: '📎', other: '📦',
};

const fmt = (n) => Number(n ?? 0).toLocaleString();

// ── Quick-adjust widget ───────────────────────────────────────────────────────
const QuickAdjust = ({ item, onDone }) => {
  const dispatch = useDispatch();
  const [op,   setOp]   = useState('add');
  const [qty,  setQty]  = useState(1);
  const [busy, setBusy] = useState(false);
  const [ok,   setOk]   = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!qty || qty < 1) return;
    setBusy(true);
  
    const result = await dispatch(updateStock({
      id: item._id ?? item.id,
      operation: op,
      quantity: Number(qty),
    }));
  
    setBusy(false);
    if (updateStock.fulfilled.match(result)) {
      setOk(true);
      setTimeout(() => { setOk(false); onDone?.(); }, 900);
    }
  };

  return (
    <form className="quick-update" onSubmit={submit}
      aria-label={`Adjust stock for ${item.itemName ?? item.name}`}>
      <div className="quick-update__op-toggle" role="group" aria-label="Operation">
        <button type="button"
          className={`btn btn--sm ${op === 'add' ? 'btn--success' : 'btn--ghost'}`}
          onClick={() => setOp('add')} aria-pressed={op === 'add'}>+ Add</button>
        <button type="button"
          className={`btn btn--sm ${op === 'remove' ? 'btn--danger' : 'btn--ghost'}`}
          onClick={() => setOp('remove')} aria-pressed={op === 'remove'}>− Remove</button>
      </div>
      <input
        className="quick-update__input"
        type="number" min="1" value={qty}
        onChange={(e) => setQty(e.target.value)}
        aria-label="Quantity"
      />
      <button type="submit" className="btn btn--primary btn--sm"
        disabled={busy} aria-busy={busy}>
        {busy ? <span className="hms-spinner hms-spinner--sm" aria-hidden="true" /> : 'Go'}
      </button>
      {ok && <span className="quick-update__ok" aria-live="polite">✓</span>}
    </form>
  );
};

// ── Delete confirm modal ──────────────────────────────────────────────────────
const DeleteConfirm = ({ item, onConfirm, onCancel, busy }) => (
  <div className="modal-backdrop"
    onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
    <div className="modal modal--sm" role="dialog" aria-modal="true">
      <header className="modal__header">
        <h2 className="modal__title">🗑️ Delete Item</h2>
        <button className="modal__close" onClick={onCancel}>✕</button>
      </header>
      <div className="modal__body">
        <p className="text-sm text-slate-700">
          Permanently delete <strong>{item.itemName ?? item.name}</strong>?
          This cannot be undone.
        </p>
        <div className="alert alert--error">
          <span className="alert__icon">⚠️</span>
          <span>
            Current stock of{' '}
            <strong>{fmt(item.quantity)} {item.unit}</strong>{' '}
            will be removed from the system.
          </span>
        </div>
      </div>
      <footer className="modal__footer">
        <button className="btn btn--ghost" onClick={onCancel} disabled={busy}>Cancel</button>
        <button className="btn btn--danger" onClick={onConfirm}
          disabled={busy} aria-busy={busy}>
          {busy
            ? <><span className="hms-spinner hms-spinner--sm" aria-hidden="true" /> Deleting…</>
            : 'Yes, Delete'}
        </button>
      </footer>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
const StockMonitorPage = () => {
  const dispatch = useDispatch();
  const items    = useSelector(selectInventoryItems);
  const lowStock = useSelector(selectLowStockAlerts);
  const loading  = useSelector(selectInventoryLoading);
  const error    = useSelector(selectInventoryError);

  const [catFilter,   setCatFilter]  = useState('');
  const [search,      setSearch]     = useState('');
  const [showLow,     setShowLow]    = useState(false);
  const [formItem,    setFormItem]   = useState(undefined); // undefined=closed, null=add, obj=edit
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,    setDeleting]   = useState(false);
  const [toast,       setToast]      = useState(null);

  useEffect(() => {
    dispatch(fetchAllItems());
    dispatch(fetchLowStockAlerts());
  }, [dispatch]);

  const pushToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await dispatch(deleteInventoryItem(deleteTarget._id ?? deleteTarget.id));
    setDeleting(false);
    setDeleteTarget(null);
    if (deleteInventoryItem.fulfilled.match(result)) {
      pushToast(`"${deleteTarget.itemName ?? deleteTarget.name}" removed.`);
      dispatch(fetchLowStockAlerts());
    }
  }, [dispatch, deleteTarget]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const allItems = Array.isArray(items)    ? items    : [];
  const lowItems = Array.isArray(lowStock) ? lowStock : [];
  const lowCount = lowItems.length;

  const categories = [...new Set(allItems.map((i) => i.category).filter(Boolean))];

  const sourceList = showLow ? lowItems : allItems;

  const filtered = sourceList.filter((i) => {
    if (catFilter && i.category !== catFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(i.itemName ?? i.name ?? '').toLowerCase().includes(q) &&
          !i.category?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const isLow      = (i) => i.quantity <= (i.lowStockThreshold ?? i.lowStock ?? 0);
  const isCritical = (i) => i.quantity === 0;

  return (
    <main className="admin-page" aria-labelledby="smp-inv-title">

      {/* Toast */}
      {toast && (
        <div className={`toast toast--${toast.type} fixed top-4 right-4 z-50 w-80`}
          role="status">
          <span className="toast__body">{toast.msg}</span>
          <button className="toast__close" onClick={() => setToast(null)}
            aria-label="Dismiss">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="admin-page__header">
        <div className="flex items-center gap-3">
          <h1 id="smp-inv-title" className="admin-page__title">📦 Inventory</h1>
          {lowCount > 0 && (
            <button
              className="inv-low-badge"
              onClick={() => setShowLow((p) => !p)}
              aria-pressed={showLow}
              title={showLow ? 'Show all items' : 'Show only low-stock items'}>
              ⚠️ {lowCount} low
            </button>
          )}
        </div>
        <div className="action-group">
          <button className="btn btn--ghost btn--sm"
            onClick={() => { dispatch(fetchAllItems()); dispatch(fetchLowStockAlerts()); }}
            disabled={loading}>
            {loading ? '…' : '↺ Refresh'}
          </button>
          <button className="btn btn--primary" onClick={() => setFormItem(null)}>
            + Add Item
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert--error" role="alert">
          <span className="alert__icon">⚠️</span>
          <span>{error}</span>
          <button className="alert__close"
            onClick={() => dispatch(clearInventoryError())}
            aria-label="Dismiss">✕</button>
        </div>
      )}

      {/* Low-stock alert banner */}
      {lowCount > 0 && (
        <div className="inv-alert-banner">
          <span className="inv-alert-banner__icon">⚠️</span>
          <span className="inv-alert-banner__text">
            <strong>{lowCount}</strong> item{lowCount > 1 ? 's are' : ' is'} at or below
            their low-stock threshold.
          </span>
          <button className="btn btn--sm btn--ghost"
            onClick={() => setShowLow((p) => !p)}>
            {showLow ? 'Show all' : 'View low-stock only'}
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="stats-bar">
        <div className="stat-card stat-card--neutral">
          <span className="stat-card__icon">📦</span>
          <span className="stat-card__value">{allItems.length}</span>
          <span className="stat-card__label">Total Items</span>
        </div>
        <div className="stat-card stat-card--warning">
          <span className="stat-card__icon">⚠️</span>
          <span className="stat-card__value">{lowCount}</span>
          <span className="stat-card__label">Low Stock</span>
        </div>
        <div className="stat-card stat-card--danger">
          <span className="stat-card__icon">🚫</span>
          <span className="stat-card__value">{allItems.filter(isCritical).length}</span>
          <span className="stat-card__label">Out of Stock</span>
        </div>
        <div className="stat-card stat-card--info">
          <span className="stat-card__icon">🏷️</span>
          <span className="stat-card__value">{categories.length}</span>
          <span className="stat-card__label">Categories</span>
        </div>
      </div>

      {/* Category pills */}
      {categories.length > 0 && (
        <div className="category-pills">
          <button
            className={`category-pill ${!catFilter ? 'category-pill--active' : ''}`}
            onClick={() => setCatFilter('')}>
            <span>🏷️</span>
            <span className="category-pill__name">All</span>
            <span className="category-pill__count">{allItems.length}</span>
          </button>
          {categories.map((cat) => (
            <button key={cat}
              className={`category-pill ${catFilter === cat ? 'category-pill--active' : ''}`}
              onClick={() => setCatFilter(cat)}>
              <span>{CATEGORY_ICONS[cat] ?? '📦'}</span>
              <span className="category-pill__name capitalize">{cat}</span>
              <span className="category-pill__count">
                {allItems.filter((i) => i.category === cat).length}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Filter bar */}
      <div className="filter-bar">
        <div className="form-group form-group--inline">
          <label htmlFor="inv-search">Search</label>
          <input id="inv-search" type="search" value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Item name or category…" />
        </div>
        {(search || catFilter || showLow) && (
          <button className="btn btn--ghost btn--sm"
            onClick={() => { setSearch(''); setCatFilter(''); setShowLow(false); }}>
            Clear
          </button>
        )}
        <span className="filter-bar__count">
          {filtered.length} item{filtered.length !== 1 ? 's' : ''}
          {showLow ? ' (low-stock only)' : ''}
        </span>
      </div>

      {/* Table */}
      {filtered.length === 0 && !loading
        ? <p className="page-empty">No inventory items match the current filters.</p>
        : (
          <div className="table-wrapper">
            <table className="data-table data-table--full" aria-label="Inventory">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Category</th>
                  <th>Stock</th>
                  <th>Threshold</th>
                  <th>Supplier</th>
                  <th>Quick Adjust</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const id   = item._id ?? item.id;
                  const name = item.itemName ?? item.name ?? '—';
                  const low  = isLow(item);
                  const crit = isCritical(item);

                  return (
                    <tr key={id}
                      className={crit || low ? 'data-table__row--alert' : ''}>
                      <td>
                        <div className="flex items-center gap-2">
                          <span>{CATEGORY_ICONS[item.category] ?? '📦'}</span>
                          <span className="font-medium text-slate-800">{name}</span>
                          {crit && <span className="badge badge--danger">Out of Stock</span>}
                          {!crit && low && <span className="badge badge--warning">Low</span>}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge--category capitalize">
                          {item.category ?? '—'}
                        </span>
                      </td>
                      <td>
                        <span className={crit || low
                          ? 'data-table__qty--low'
                          : 'data-table__qty--ok'}>
                          {fmt(item.quantity)} {item.unit ?? ''}
                        </span>
                      </td>
                      <td className="text-slate-500 text-xs">
                        ≤ {fmt(item.lowStockThreshold ?? item.lowStock ?? 0)} {item.unit ?? ''}
                      </td>
                      <td className="text-slate-500 text-sm">
                        {item.supplier ?? <span className="text-slate-300">—</span>}
                      </td>
                      <td>
                        <QuickAdjust item={item}
                          onDone={() => {
                            dispatch(fetchAllItems());
                            dispatch(fetchLowStockAlerts());
                          }} />
                      </td>
                      <td>
                        <div className="action-group">
                          <button className="btn btn--ghost btn--sm"
                            onClick={() => setFormItem(item)}
                            aria-label={`Edit ${name}`}>✏️</button>
                          <button className="btn btn--danger btn--sm"
                            onClick={() => setDeleteTarget(item)}
                            aria-label={`Delete ${name}`}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      {/* Add / Edit modal */}
      {formItem !== undefined && (
        <InventoryFormModal
          item={formItem}
          onClose={() => setFormItem(undefined)}
          onSuccess={(saved) => {
            setFormItem(undefined);
            dispatch(fetchAllItems());
            dispatch(fetchLowStockAlerts());
            pushToast(
              formItem
                ? `"${saved.itemName ?? saved.name}" updated.`
                : `"${saved.itemName ?? saved.name}" added.`
            );
          }}
        />
      )}

      {/* Delete confirm */}
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

export default StockMonitorPage;
