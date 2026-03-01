// src/components/admin/EditShiftModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Focused modal for editing a single staff member's shift times.
// Dispatches updateShiftTiming({ id, startTime, endTime }).
// Validates HH:MM 24-hour format and that endTime > startTime before dispatch.
// Accessible: focus-trapped, Escape closes, body scroll locked.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector }           from 'react-redux';
import {
  updateShiftTiming,
  selectStaffLoading,
  selectStaffError,
  clearStaffError,
} from '../../store/slices/staffSlice';

const isValidTime = (t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);

const EditShiftModal = ({ member, onClose, onSuccess }) => {
  const dispatch  = useDispatch();
  const loading   = useSelector(selectStaffLoading);
  const error     = useSelector(selectStaffError);

  const id = member._id ?? member.id;

  const [startTime, setStart] = useState(member.shift?.startTime ?? '');
  const [endTime,   setEnd]   = useState(member.shift?.endTime   ?? '');
  const [localErr,  setLocalErr] = useState('');

  const closeRef = useRef(null);

  // Focus close button on open
  useEffect(() => { closeRef.current?.focus(); }, []);

  // Escape key
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Clear slice error on unmount
  useEffect(() => () => dispatch(clearStaffError()), [dispatch]);

  const validate = () => {
    if (!isValidTime(startTime)) return 'Start time must be in HH:MM (24-hour) format.';
    if (!isValidTime(endTime))   return 'End time must be in HH:MM (24-hour) format.';
    if (startTime >= endTime)    return 'End time must be later than start time.';
    return '';
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setLocalErr(err); return; }
    setLocalErr('');

    const result = await dispatch(updateShiftTiming({ id, startTime, endTime }));
    if (updateShiftTiming.fulfilled.match(result)) {
      onSuccess(result.payload);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="modal modal--sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="esm-title"
      >
        <header className="modal__header">
          <h2 id="esm-title" className="modal__title">
            Edit Shift — {member.name}
          </h2>
          <button
            ref={closeRef}
            className="modal__close"
            onClick={onClose}
            aria-label="Close shift editor"
          >✕</button>
        </header>

        <form onSubmit={handleSave} noValidate className="modal__body">
          <p className="modal__desc">
            <span className={`badge badge--role`}>{member.role}</span>
            {member.department && (
              <span className="modal__dept"> · {member.department}</span>
            )}
          </p>

          {/* Start time */}
          <div className="form-group">
            <label htmlFor="esm-start">Shift Start</label>
            <input
              id="esm-start"
              type="time"
              value={startTime}
              onChange={(e) => { setStart(e.target.value); setLocalErr(''); dispatch(clearStaffError()); }}
              required
              aria-describedby={localErr ? 'esm-err' : undefined}
            />
          </div>

          {/* End time */}
          <div className="form-group">
            <label htmlFor="esm-end">Shift End</label>
            <input
              id="esm-end"
              type="time"
              value={endTime}
              onChange={(e) => { setEnd(e.target.value); setLocalErr(''); dispatch(clearStaffError()); }}
              required
            />
          </div>

          {/* Duration hint */}
          {isValidTime(startTime) && isValidTime(endTime) && startTime < endTime && (
            <p className="modal__hint">
              Duration: {calcDuration(startTime, endTime)}
            </p>
          )}

          {/* Validation / API error */}
          {(localErr || error) && (
            <p id="esm-err" className="form-error" role="alert">
              {localErr || error}
            </p>
          )}

          <footer className="modal__footer">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? (
                <><span className="hms-spinner hms-spinner--sm" aria-hidden="true" /> Saving…</>
              ) : 'Save Shift'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

// ── Duration helper ───────────────────────────────────────────────────────────
const calcDuration = (start, end) => {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const mins = (eh * 60 + em) - (sh * 60 + sm);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h${m > 0 ? ` ${m}m` : ''}`;
};

export default EditShiftModal;
