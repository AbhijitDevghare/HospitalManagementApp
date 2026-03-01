// src/components/admin/AvailabilityChecker.jsx
// Inline per-row availability checker for the admin room table.
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { checkSpecificRoomAvailability } from '../../store/slices/roomSlice';

const today = () => new Date().toISOString().slice(0, 10);
const tomorrow = () => {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

const AvailabilityChecker = ({ room }) => {
  const dispatch = useDispatch();
  const [checkIn,  setCheckIn]  = useState(today());
  const [checkOut, setCheckOut] = useState(tomorrow());
  const [result,   setResult]   = useState(null);  // null | { available, message }
  const [busy,     setBusy]     = useState(false);
  const [open,     setOpen]     = useState(false);

  const check = async () => {
    if (!checkIn || !checkOut || checkIn >= checkOut) return;
    setBusy(true);
    setResult(null);
    const res = await dispatch(
      checkSpecificRoomAvailability({
        id: room._id ?? room.id,
        checkIn,
        checkOut,
      })
    );
    setBusy(false);
    if (checkSpecificRoomAvailability.fulfilled.match(res)) {
      setResult(res.payload);
    } else {
      setResult({ available: false, message: res.payload ?? 'Error checking availability.' });
    }
  };

  if (!open) {
    return (
      <button type="button" className="btn btn--ghost btn--sm"
        onClick={() => setOpen(true)}
        aria-label={`Check availability for room ${room.roomNumber}`}>
        📅 Check
      </button>
    );
  }

  return (
    <div className="avail-checker" role="region" aria-label="Availability checker">
      <div className="avail-checker__dates">
        <input type="date" value={checkIn}
          min={today()}
          onChange={(e) => { setCheckIn(e.target.value); setResult(null); }}
          aria-label="Check-in date" />
        <span className="avail-checker__sep">→</span>
        <input type="date" value={checkOut}
          min={checkIn || today()}
          onChange={(e) => { setCheckOut(e.target.value); setResult(null); }}
          aria-label="Check-out date" />
        <button type="button" className="btn btn--primary btn--sm"
          onClick={check} disabled={busy || checkIn >= checkOut}
          aria-busy={busy}>
          {busy ? <span className="hms-spinner hms-spinner--sm" aria-hidden="true" /> : 'Go'}
        </button>
        <button type="button" className="btn btn--ghost btn--sm"
          onClick={() => { setOpen(false); setResult(null); }}
          aria-label="Close checker">✕</button>
      </div>

      {result !== null && (
        <div className={`avail-badge mt-1 ${result.available ? 'avail-badge--available' : 'avail-badge--unavailable'}`}
          role="status">
          {result.available ? '✅ Available' : '🚫 Unavailable'}
          {result.message && <span className="ml-1 text-xs opacity-75">— {result.message}</span>}
        </div>
      )}
    </div>
  );
};

export default AvailabilityChecker;
