// src/components/admin/StaffFormModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector }            from 'react-redux';
import {
  addStaff, updateStaffDetails,
  selectStaffLoading, selectStaffError, clearStaffError,
} from '../../store/slices/staffSlice';

const ROLES   = ['manager', 'receptionist', 'housekeeping', 'maintenance', 'security', 'chef', 'waiter', 'concierge', 'other'];
const SHIFTS  = ['morning', 'afternoon', 'evening', 'night', 'flexible'];
const DAYS    = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const StaffFormModal = ({ staff, onClose, onSuccess }) => {
  const dispatch = useDispatch();
  const loading  = useSelector(selectStaffLoading);
  const apiError = useSelector(selectStaffError);
  const isEdit   = Boolean(staff);

  const [f, setF] = useState({
    name:       staff?.name       ?? '',
    email:      staff?.email      ?? '',
    phone:      staff?.phone      ?? '',
    role:       staff?.role       ?? 'receptionist',
    salary:     staff?.salary     ?? '',
    shift:      staff?.shift      ?? 'morning',
    shiftStart: staff?.shiftStart ?? staff?.shift_start ?? '08:00',
    shiftEnd:   staff?.shiftEnd   ?? staff?.shift_end   ?? '16:00',
    workDays:   staff?.workDays   ?? staff?.work_days   ?? ['Mon','Tue','Wed','Thu','Fri'],
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
  useEffect(() => () => dispatch(clearStaffError()), [dispatch]);

  const change = (e) => {
    setF((p) => ({ ...p, [e.target.name]: e.target.value }));
    setLocalErr('');
    dispatch(clearStaffError());
  };

  const toggleDay = (day) => {
    setF((p) => ({
      ...p,
      workDays: p.workDays.includes(day)
        ? p.workDays.filter((d) => d !== day)
        : [...p.workDays, day],
    }));
  };

  const validate = () => {
    if (!f.name.trim())                          return 'Full name is required.';
    if (!isEdit && !f.email.trim())              return 'Email is required.';
    if (!isEdit && !/\S+@\S+\.\S+/.test(f.email)) return 'Enter a valid email address.';
    if (!f.salary || Number(f.salary) <= 0)      return 'Salary must be greater than 0.';
    if (f.workDays.length === 0)                 return 'Select at least one work day.';
    if (f.shiftStart >= f.shiftEnd)              return 'Shift end must be after shift start.';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setLocalErr(err); return; }

    const payload = {
      name:       f.name.trim(),
      role:       f.role,
      salary:     Number(f.salary),
      shift:      f.shift,
      shiftStart: f.shiftStart,
      shiftEnd:   f.shiftEnd,
      workDays:   f.workDays,
      ...(!isEdit && { email: f.email.trim() }),
      ...(f.phone.trim() && { phone: f.phone.trim() }),
    };

    const action = isEdit
      ? updateStaffDetails({ id: staff._id ?? staff.id, updates: payload })
      : addStaff(payload);

    const result = await dispatch(action);
    if (
      addStaff.fulfilled.match(result) ||
      updateStaffDetails.fulfilled.match(result)
    ) {
      onSuccess(result.payload);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal rfm-modal" role="dialog" aria-modal="true" aria-labelledby="sfm-title">
        <header className="modal__header">
          <h2 id="sfm-title" className="modal__title">
            {isEdit ? '✏️ Edit Staff Member' : '👤 Onboard New Staff'}
          </h2>
          <button ref={closeRef} className="modal__close" onClick={onClose} aria-label="Close">✕</button>
        </header>

        <form onSubmit={handleSubmit} noValidate className="rfm-body">

          {/* Name + Role */}
          <div className="rfm-grid-2">
            <div className="form-group">
              <label htmlFor="sfm-name">Full Name <span className="rfm-req">*</span></label>
              <input id="sfm-name" name="name" type="text"
                value={f.name} onChange={change} placeholder="Jane Smith" required />
            </div>
            <div className="form-group">
              <label htmlFor="sfm-role">Role <span className="rfm-req">*</span></label>
              <select id="sfm-role" name="role" value={f.role} onChange={change}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Email + Phone — email hidden on edit */}
          <div className="rfm-grid-2">
            {!isEdit && (
              <div className="form-group">
                <label htmlFor="sfm-email">Email <span className="rfm-req">*</span></label>
                <input id="sfm-email" name="email" type="email"
                  value={f.email} onChange={change} placeholder="jane@hotel.com" required />
              </div>
            )}
            <div className="form-group">
              <label htmlFor="sfm-phone">
                Phone <span className="form-group__optional">(optional)</span>
              </label>
              <input id="sfm-phone" name="phone" type="tel"
                value={f.phone} onChange={change} placeholder="+1 555 000 0000" />
            </div>
          </div>

          {/* Salary */}
          <div className="form-group">
            <label htmlFor="sfm-salary">Monthly Salary (USD) <span className="rfm-req">*</span></label>
            <input id="sfm-salary" name="salary" type="number" min="1"
              value={f.salary} onChange={change} placeholder="3500" />
          </div>

          {/* Shift fieldset */}
          <fieldset className="sfm-shift-fieldset">
            <legend className="sfm-shift-legend">🕐 Shift Details</legend>

            <div className="form-group">
              <label htmlFor="sfm-shift">Shift Type</label>
              <select id="sfm-shift" name="shift" value={f.shift} onChange={change}>
                {SHIFTS.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>

            <div className="rfm-grid-2">
              <div className="form-group">
                <label htmlFor="sfm-start">Start Time <span className="rfm-req">*</span></label>
                <input id="sfm-start" name="shiftStart" type="time"
                  value={f.shiftStart} onChange={change} />
              </div>
              <div className="form-group">
                <label htmlFor="sfm-end">End Time <span className="rfm-req">*</span></label>
                <input id="sfm-end" name="shiftEnd" type="time"
                  value={f.shiftEnd} onChange={change} />
              </div>
            </div>

            {/* Work days */}
            <div className="form-group">
              <label>Work Days <span className="rfm-req">*</span></label>
              <div className="sfm-day-row">
                {DAYS.map((d) => (
                  <button key={d} type="button"
                    className={`sfm-day-btn ${f.workDays.includes(d) ? 'sfm-day-btn--active' : ''}`}
                    onClick={() => toggleDay(d)}
                    aria-pressed={f.workDays.includes(d)}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </fieldset>

          {(localErr || apiError) && (
            <p className="rfm-error" role="alert">⚠ {localErr || apiError}</p>
          )}

          <footer className="modal__footer">
            <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn--primary" disabled={loading} aria-busy={loading}>
              {loading
                ? <><span className="hms-spinner hms-spinner--sm" aria-hidden="true" /> Saving…</>
                : isEdit ? 'Save Changes' : '✅ Onboard Staff'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default StaffFormModal;
