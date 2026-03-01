// src/components/admin/RoomStatusToggle.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { updateRoomStatus } from '../../store/slices/roomSlice';

const STATUS_OPTIONS = [
  { value: 'available',   label: '✅ Available',    badge: 'badge--success' },
  { value: 'booked',      label: '📅 Booked',       badge: 'badge--info'    },
  { value: 'maintenance', label: '🔧 Maintenance',  badge: 'badge--warning' },
];

const RoomStatusToggle = ({ room, onUpdated }) => {
  const dispatch  = useDispatch();
  const [open,    setOpen]  = useState(false);
  const [busy,    setBusy]  = useState(false);
  const menuRef   = useRef(null);
  const current   = STATUS_OPTIONS.find((o) => o.value === room.status) ?? STATUS_OPTIONS[0];

  /* close on outside click */
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (!menuRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const select = async (value) => {
    setOpen(false);
    if (value === room.status) return;
    setBusy(true);
    // console.log({ id: room._id ?? room.id, status: value })
    const result = await dispatch(
      updateRoomStatus({ id: room._id ?? room.id, status: value })
    );
    setBusy(false);
    if (updateRoomStatus.fulfilled.match(result)) {
      onUpdated?.(result.payload);
    }
  };

  return (
    <div className="rst-wrap" ref={menuRef}>
      <button
        type="button"
        className={`rst-trigger badge ${current.badge}`}
        onClick={() => !busy && setOpen((p) => !p)}
        disabled={busy}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Room status: ${current.label}`}>
        {busy
          ? <span className="hms-spinner hms-spinner--sm" aria-hidden="true" />
          : <>{current.label} <span aria-hidden="true">▾</span></>}
      </button>

      {open && (
        <ul className="rst-menu" role="listbox" aria-label="Set room status">
          {STATUS_OPTIONS.map((opt) => (
            <li key={opt.value}
              className={`rst-menu__item ${opt.value === room.status ? 'rst-menu__item--active' : ''}`}
              role="option"
              aria-selected={opt.value === room.status}
              onClick={() => select(opt.value)}>
              {opt.label}
              {opt.value === room.status && (
                <span className="rst-menu__check" aria-hidden="true">✓</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default RoomStatusToggle;
