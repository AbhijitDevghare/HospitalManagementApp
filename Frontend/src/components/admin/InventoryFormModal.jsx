// src/components/admin/InventoryFormModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector }            from 'react-redux';
import {
  addInventoryItem, updateItemDetails,
  selectInventoryLoading, selectInventoryError, clearInventoryError,
} from '../../store/slices/inventorySlice';

const CATEGORIES = [
  'food', 'beverages', 'cleaning', 'toiletries',
  'linens', 'maintenance', 'office', 'other',
];

const InventoryFormModal = ({ item, onClose, onSuccess }) => {
  const dispatch = useDispatch();
  const loading  = useSelector(selectInventoryLoading);
  const apiError = useSelector(selectInventoryError);
  const isEdit   = Boolean(item);

  const [f, setF] = useState({
    itemName:          item?.itemName          ?? item?.name ?? '',
    category:          item?.category          ?? 'other',
    quantity:          item?.quantity          ?? '',
    unit:              item?.unit              ?? 'units',
    lowStockThreshold: item?.lowStockThreshold ?? item?.lowStock ?? 5,
    supplier:          item?.supplier          ?? '',
    notes:             item?.notes             ?? '',
  });
  const [localErr, setLocalErr] = useState('');
  const closeRef = useRef(null);

  useEffect(() => { closeRef.current?.focus(); }, []);
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);
  useEffect(() => () => dispatch(clearInventoryError()), [dispatch]);

  const change = (e) => {
    setF((p) => ({ ...p, [e.target.name]: e.target.value }));
    setLocalErr('');
    dispatch(clearInventoryError());
  };

  const validate = () => {
    if (!f.itemName.trim())                           return 'Item name is required.';
    if (isEdit && f.quantity === '')                  return 'Quantity is required.';
    if (!isEdit && (f.quantity === '' || Number(f.quantity) < 0))
      return 'Initial quantity must be 0 or more.';
    if (!f.lowStockThreshold || Number(f.lowStockThreshold) < 1)
      return 'Low-stock threshold must be at least 1.';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setLocalErr(err); return; }

    const payload = {
      itemName:          f.itemName.trim(),
      category:          f.category,
      unit:              f.unit.trim() || 'units',
      lowStockThreshold: Number(f.lowStockThreshold),
      ...(f.quantity !== '' && { quantity: Number(f.quantity) }),
      ...(f.supplier.trim() && { supplier: f.supplier.trim() }),
      ...(f.notes.trim()    && { notes:    f.notes.trim()    }),
    };

    const action = isEdit
      ? updateItemDetails({ id: item._id ?? item.id, updates: payload })
      : addInventoryItem(payload);

    const result = await dispatch(action);
    if (
      addInventoryItem.fulfilled.match(result) ||
      updateItemDetails.fulfilled.match(result)
    ) {
      onSuccess(result.payload);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal rfm-modal" role="dialog" aria-modal="true" aria-labelledby="ifm-title">
        <header className="modal__header">
          <h2 id="ifm-title" className="modal__title">
            {isEdit ? '✏️ Edit Item' : '📦 Add Inventory Item'}
          </h2>
          <button ref={closeRef} className="modal__close" onClick={onClose} aria-label="Close">✕</button>
        </header>

        <form onSubmit={handleSubmit} noValidate className="rfm-body">

          {/* Name + Category */}
          <div className="rfm-grid-2">
            <div className="form-group">
              <label htmlFor="ifm-name">Item Name <span className="rfm-req">*</span></label>
              <input id="ifm-name" name="itemName" type="text"
                value={f.itemName} onChange={change}
                placeholder="e.g. Bath Towels" required />
            </div>
            <div className="form-group">
              <label htmlFor="ifm-cat">Category</label>
              <select id="ifm-cat" name="category" value={f.category} onChange={change}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quantity + Unit */}
          <div className="rfm-grid-2">
            <div className="form-group">
              <label htmlFor="ifm-qty">
                {isEdit ? 'Set Quantity' : 'Initial Quantity'}
                <span className="rfm-req"> *</span>
              </label>
              <input id="ifm-qty" name="quantity" type="number" min="0"
                value={f.quantity} onChange={change} placeholder="0" />
            </div>
            <div className="form-group">
              <label htmlFor="ifm-unit">Unit</label>
              <input id="ifm-unit" name="unit" type="text"
                value={f.unit} onChange={change} placeholder="units / kg / pcs…" />
            </div>
          </div>

          {/* Low-stock threshold */}
          <div className="form-group">
            <label htmlFor="ifm-threshold">
              Low-Stock Alert Threshold <span className="rfm-req">*</span>
            </label>
            <input id="ifm-threshold" name="lowStockThreshold" type="number" min="1"
              value={f.lowStockThreshold} onChange={change} />
            <span className="form-group__hint">
              A warning badge appears when stock falls at or below this number.
            </span>
          </div>

          {/* Supplier */}
          <div className="form-group">
            <label htmlFor="ifm-supplier">
              Supplier <span className="form-group__optional">(optional)</span>
            </label>
            <input id="ifm-supplier" name="supplier" type="text"
              value={f.supplier} onChange={change} placeholder="Supplier name or contact" />
          </div>

          {/* Notes */}
          <div className="form-group">
            <label htmlFor="ifm-notes">
              Notes <span className="form-group__optional">(optional)</span>
            </label>
            <textarea id="ifm-notes" name="notes" rows={2}
              className="rfm-textarea" value={f.notes} onChange={change}
              placeholder="Storage location, handling instructions…" />
          </div>

          {(localErr || apiError) && (
            <p className="rfm-error" role="alert">⚠ {localErr || apiError}</p>
          )}

          <footer className="modal__footer">
            <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn--primary" disabled={loading} aria-busy={loading}>
              {loading
                ? <><span className="hms-spinner hms-spinner--sm" aria-hidden="true" /> Saving…</>
                : isEdit ? 'Save Changes' : 'Add Item'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default InventoryFormModal;
