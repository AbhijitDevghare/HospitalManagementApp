// src/components/admin/ShiftTimingModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector }            from 'react-redux';
import {
  updateShiftTiming,
  selectStaffLoading, selectStaffError, clearStaffError,
} from '../../store/slices/staffSlice';

const ShiftTimingModal = ({ staff, onClose, onSuccess }) => {
  const dispatch = useDispatch();
  const loading  = useSelector(selectStaffLoading);
  const apiError = useSelector(selectStaffError);

  const [startTime, setStart] = useState(staff?.shiftTiming?.startTime ?? '');
  const [endTime,   setEnd]   = useState(staff?.shiftTiming?.endTime   ?? '');
  const [localErr,  setLocalErr] = useState('');
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
  useEffect(() => () => dispatch(clearStaffError()), [dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!startTime || !endTime) { setLocalErr('Both start and end times are required.'); return; }
    if (startTime >= endTime)   { setLocalErr('End time must be after start time.'); return; }
    setLocalErr('');

    const result = await dispatch(
      updateShiftTiming({ id: staff._id ?? staff.id, startTime, endTime })
    );
    if (updateShiftTiming.fulfilled.match(result)) onSuccess(result.payload);
  };

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal modal--sm" role="dialog" aria-modal="true" aria-labelledby="stm-title">
        <header className="modal__header">
          <h2 id="stm-title" className="modal__title">🕐 Update Shift Timings</h2>
          <button ref={closeRef} className="modal__close" onClick={onClose} aria-label="Close">✕</button>
        </header>

        <form onSubmit={handleSubmit} noValidate className="modal__body">
          {/* Staff info */}
          <div className="stm-staff-row">
            <div className="staff-cell__avatar">
              {staff?.name?.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="stm-name">{staff?.name}</p>
              <p className="stm-role">{staff?.role}</p>
            </div>
          </div>

          {/* Current shift */}
          {staff?.shiftTiming?.startTime && (
            <div className="stm-current">
              <span className="stm-current__label">Current shift:</span>
              <span className="shift-badge">
                {staff.shiftTiming.startTime} – {staff.shiftTiming.endTime}
              </span>
            </div>
          )}

          {/* New timings */}
          <div className="rfm-grid-2">
            <div className="form-group">
              <label htmlFor="stm-start">New Start Time <span className="rfm-req">*</span></label>
              <input id="stm-start" type="time" value={startTime}
                onChange={(e) => { setStart(e.target.value); setLocalErr(''); dispatch(clearStaffError()); }}
                required />
            </div>
            <div className="form-group">
              <label htmlFor="stm-end">New End Time <span className="rfm-req">*</span></label>
              <input id="stm-end" type="time" value={endTime}
                onChange={(e) => { setEnd(e.target.value); setLocalErr(''); dispatch(clearStaffError()); }}
                required />
            </div>
          </div>

          {(localErr || apiError) && (
            <p className="rfm-error" role="alert">⚠ {localErr || apiError}</p>
          )}

          <footer className="modal__footer">
            <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn--primary" disabled={loading} aria-busy={loading}>
              {loading
                ? <><span className="hms-spinner hms-spinner--sm" aria-hidden="true" /> Updating…</>
                : 'Update Shift'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default ShiftTimingModal;
