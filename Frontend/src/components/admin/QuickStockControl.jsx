// src/components/admin/QuickStockControl.jsx
import React, { useState } from 'react';
import { useDispatch }      from 'react-redux';
import { updateStock }      from '../../store/slices/inventorySlice';

const QuickStockControl = ({ item, onUpdated }) => {
  const dispatch    = useDispatch();
  const [amount, setAmount]   = useState('1');
  const [op,     setOp]       = useState('add');   // 'add' | 'remove'
  const [busy,   setBusy]     = useState(false);
  const [flash,  setFlash]    = useState(null);    // 'ok' | 'err'

  const id = item._id ?? item.id;

  const handleUpdate = async () => {
    const qty = Number(amount);
    if (!qty || qty <= 0) return;

    if (op === 'remove' && qty > item.quantity) {
      setFlash('err');
      setTimeout(() => setFlash(null), 2000);
      return;
    }

    setBusy(true);
    const result = await dispatch(updateStock({ id, operation: op, amount: qty }));
    setBusy(false);

    if (updateStock.fulfilled.match(result)) {
      setFlash('ok');
      setTimeout(() => setFlash(null), 1500);
      if (onUpdated) onUpdated(result.payload);
    } else {
      setFlash('err');
      setTimeout(() => setFlash(null), 2000);
    }
  };

  const handleKey = (e) => { if (e.key === 'Enter') handleUpdate(); };

  return (
    <div className="qsc-wrap">
      {/* Operation toggle */}
      <div className="qsc-op-toggle" role="group" aria-label="Stock operation">
        <button
          type="button"
          className={`btn btn--sm qsc-op-btn ${op === 'add' ? 'qsc-op-btn--active-add' : 'btn--ghost'}`}
          onClick={() => setOp('add')}
          aria-pressed={op === 'add'}
          title="Add stock"
        >+</button>
        <button
          type="button"
          className={`btn btn--sm qsc-op-btn ${op === 'remove' ? 'qsc-op-btn--active-remove' : 'btn--ghost'}`}
          onClick={() => setOp('remove')}
          aria-pressed={op === 'remove'}
          title="Remove stock"
        >−</button>
      </div>

      {/* Amount input */}
      <input
        type="number"
        min="1"
        max={op === 'remove' ? item.quantity : undefined}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        onKeyDown={handleKey}
        className="qsc-input"
        aria-label={`Amount to ${op}`}
      />

      {/* Confirm button */}
      <button
        type="button"
        className={`btn btn--sm ${op === 'add' ? 'btn--success' : 'btn--danger'}`}
        onClick={handleUpdate}
        disabled={busy}
        aria-busy={busy}
        aria-label={`${op === 'add' ? 'Add' : 'Remove'} ${amount} ${item.unit}`}
      >
        {busy
          ? <span className="hms-spinner hms-spinner--sm" aria-hidden="true" />
          : op === 'add' ? '↑ Add' : '↓ Remove'}
      </button>

      {/* Flash feedback */}
      {flash === 'ok'  && <span className="qsc-flash qsc-flash--ok"  aria-live="polite">✓</span>}
      {flash === 'err' && <span className="qsc-flash qsc-flash--err" aria-live="polite">✗</span>}
    </div>
  );
};

export default QuickStockControl;
