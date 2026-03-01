// src/components/admin/ServiceFormModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector }            from 'react-redux';
import {
  createService, updateService,
  selectServicesLoading, selectServicesError, clearServicesError,
} from '../../store/slices/servicesSlice';

const CATEGORIES = ['spa', 'laundry', 'dining', 'transport', 'housekeeping', 'concierge', 'other'];
const ICONS      = ['🧖', '🍽️', '🚗', '👔', '🎭', '🏋️', '💼', '✨', '🛎️', '🧹', '💆', '🎵'];

const ServiceFormModal = ({ service, onClose, onSuccess }) => {
  const dispatch = useDispatch();
  const loading  = useSelector(selectServicesLoading);
  const apiError = useSelector(selectServicesError);
  const isEdit   = Boolean(service);

  const [f, setF] = useState({
    serviceName: service?.serviceName ?? service?.name ?? '',
    category:    service?.category    ?? 'other',
    price:       service?.price       !== undefined ? String(service.price) : '',
    duration:    service?.duration    ?? '',
    description: service?.description ?? '',
    icon:        service?.icon        ?? '✨',
    maxPerDay:   service?.maxPerDay   !== undefined ? String(service.maxPerDay) : '',
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
  useEffect(() => () => dispatch(clearServicesError()), [dispatch]);

  const change = (e) => {
    setF((p) => ({ ...p, [e.target.name]: e.target.value }));
    setLocalErr('');
    dispatch(clearServicesError());
  };

  const validate = () => {
    if (!f.serviceName.trim())                               return 'Service name is required.';
    if (f.price === '' || isNaN(Number(f.price)))            return 'Price is required.';
    if (Number(f.price) < 0)                                 return 'Price must be 0 or more.';
    if (f.maxPerDay !== '' && isNaN(Number(f.maxPerDay)))    return 'Max per day must be a number.';
    if (f.maxPerDay !== '' && Number(f.maxPerDay) < 1)       return 'Max per day must be at least 1.';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setLocalErr(err); return; }

    const payload = {
      serviceName: f.serviceName.trim(),
      category:    f.category,
      price:       Number(f.price),
      // Optional fields — only sent when non-empty to avoid overwriting with blank
      ...(f.icon                 && { icon:        f.icon                   }),
      ...(f.description.trim()   && { description: f.description.trim()     }),
      ...(f.duration.trim()      && { duration:    f.duration.trim()        }),
      ...(f.maxPerDay !== ''     && { maxPerDay:   Number(f.maxPerDay)      }),
    };

    const action = isEdit
      ? updateService({ id: service._id ?? service.id, updates: payload })
      : createService(payload);

    const result = await dispatch(action);
    if (createService.fulfilled.match(result) || updateService.fulfilled.match(result)) {
      onSuccess(result.payload);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal rfm-modal" role="dialog" aria-modal="true" aria-labelledby="sfm-svc-title">
        <header className="modal__header">
          <h2 id="sfm-svc-title" className="modal__title">
            {isEdit ? '✏️ Edit Service' : '➕ Add New Service'}
          </h2>
          <button ref={closeRef} className="modal__close" onClick={onClose} aria-label="Close">✕</button>
        </header>

        <form onSubmit={handleSubmit} noValidate className="rfm-body">

          {/* Icon picker */}
          <div className="form-group">
            <label>Icon</label>
            <div className="sfm-icon-grid" role="group" aria-label="Select service icon">
              {ICONS.map((ic) => (
                <button key={ic} type="button"
                  className={`sfm-icon-btn ${f.icon === ic ? 'sfm-icon-btn--active' : ''}`}
                  onClick={() => setF((p) => ({ ...p, icon: ic }))}
                  aria-pressed={f.icon === ic}
                  aria-label={`Icon ${ic}`}>
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {/* Name + Category */}
          <div className="rfm-grid-2">
            <div className="form-group">
              <label htmlFor="sfm-svc-name">Service Name <span className="rfm-req">*</span></label>
              <input id="sfm-svc-name" name="serviceName" type="text"
                value={f.serviceName} onChange={change}
                placeholder="e.g. Deep Tissue Massage"
                required aria-required="true"
                aria-invalid={localErr && !f.serviceName.trim() ? 'true' : undefined} />
            </div>
            <div className="form-group">
              <label htmlFor="sfm-svc-cat">Category</label>
              <select id="sfm-svc-cat" name="category" value={f.category} onChange={change}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Price + Duration */}
          <div className="rfm-grid-2">
            <div className="form-group">
              <label htmlFor="sfm-svc-price">Price ($) <span className="rfm-req">*</span></label>
              <input id="sfm-svc-price" name="price" type="number" min="0" step="0.01"
                value={f.price} onChange={change}
                placeholder="50.00" required aria-required="true"
                aria-invalid={localErr && (f.price === '' || Number(f.price) < 0) ? 'true' : undefined} />
            </div>
            <div className="form-group">
              <label htmlFor="sfm-svc-dur">
                Duration
                <span className="form-group__optional"> (optional)</span>
              </label>
              <input id="sfm-svc-dur" name="duration" type="text"
                value={f.duration} onChange={change} placeholder="60 min" />
            </div>
          </div>

          {/* Max per day */}
          <div className="form-group">
            <label htmlFor="sfm-svc-max">
              Max Bookings / Day
              <span className="form-group__optional"> (optional — blank = unlimited)</span>
            </label>
            <input id="sfm-svc-max" name="maxPerDay" type="number" min="1"
              value={f.maxPerDay} onChange={change} placeholder="Unlimited"
              aria-invalid={localErr && f.maxPerDay !== '' && Number(f.maxPerDay) < 1 ? 'true' : undefined} />
            <span className="form-group__hint">Leave blank to allow unlimited bookings per day.</span>
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="sfm-svc-desc">
              Description
              <span className="form-group__optional"> (optional)</span>
            </label>
            <textarea id="sfm-svc-desc" name="description" rows={3}
              value={f.description} onChange={change}
              placeholder="What's included, where to find it, booking notes…"
              className="rfm-textarea" />
          </div>

          {(localErr || apiError) && (
            <div className="alert alert--error" role="alert">
              <span className="alert__icon">⚠️</span>
              <span>{localErr || apiError}</span>
            </div>
          )}

          <footer className="modal__footer">
            <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn--primary" disabled={loading} aria-busy={loading}>
              {loading
                ? <><span className="hms-spinner hms-spinner--sm" aria-hidden="true" /> Saving…</>
                : isEdit ? 'Save Changes' : 'Create Service'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default ServiceFormModal;
