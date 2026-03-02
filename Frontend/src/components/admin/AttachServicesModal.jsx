// src/components/admin/AttachServicesModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector }            from 'react-redux';
import {
  attachServicesToBooking,
  selectServicesLoading, selectServicesError, clearServicesError,
} from '../../store/slices/servicesSlice';

const fmt = (n) => `$${Number(n ?? 0).toFixed(2)}`;

const AttachServicesModal = ({ booking, availableServices, onClose, onSuccess }) => {
  const dispatch = useDispatch();
  const loading  = useSelector(selectServicesLoading);
  const apiError = useSelector(selectServicesError);

  // Simple array of selected service ObjectIds
  const [selectedIds, setSelectedIds] = useState([]);
  const [localErr,    setLocalErr]    = useState('');
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

  const services = (Array.isArray(availableServices) ? availableServices : [])
    .filter((s) => s.isAvailable !== false);

  // Toggle a service ID in/out of selectedIds
  const toggleService = (svc) => {
    const id = svc._id ?? svc.id;
    setLocalErr('');
    dispatch(clearServicesError());
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Total = sum of prices of selected services
  const selectedServices = services.filter((s) => selectedIds.includes(s._id ?? s.id));
  const total = selectedServices.reduce((sum, s) => sum + (s.price ?? 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedIds.length === 0) {
      setLocalErr('Select at least one service to attach.');
      return;
    }

    const result = await dispatch(
      attachServicesToBooking({
        bookingId:  booking._id ?? booking.id,
        serviceIds: selectedIds,
      })
    );

    if (attachServicesToBooking.fulfilled.match(result)) {
      onSuccess(result.payload, total);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal asm-modal" role="dialog" aria-modal="true" aria-labelledby="asm-title">
        <header className="modal__header">
          <h2 id="asm-title" className="modal__title">🛎️ Add Services to Booking</h2>
          <button ref={closeRef} className="modal__close" onClick={onClose} aria-label="Close">✕</button>
        </header>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal__body">

            {/* Booking context */}
            <div className="asm-booking-info">
              <span className="asm-booking-info__label">Booking</span>
              <span className="asm-booking-info__id font-mono text-xs">
                #{(booking._id ?? booking.id ?? '').toString().slice(-8).toUpperCase()}
              </span>
              <span className="asm-booking-info__sep">·</span>
              <span className="asm-booking-info__guest">{booking.guestName ?? booking.user?.name ?? 'Guest'}</span>
              {booking.room.roomNumber && (
                <>
                  <span className="asm-booking-info__sep">·</span>
                  <span className="asm-booking-info__room">Room {booking.room.roomNumber}</span>
                </>
              )}
            </div>

            {/* Service grid */}
            {services.length === 0 ? (
              <p className="widget__empty">No available services found.</p>
            ) : (
              <ul className="asm-service-grid" aria-label="Available services">
                {services.map((svc) => {
                  const id       = svc._id ?? svc.id;
                  const selected = selectedIds.includes(id);
                  return (
                    <li
                      key={id}
                      className={`asm-service-card ${selected ? 'asm-service-card--selected' : ''}`}
                      onClick={() => toggleService(svc)}
                    >
                      <div className="asm-service-card__top">
                        <span className="asm-service-card__icon">{svc.icon ?? '✨'}</span>
                        <span
                          className={`asm-service-card__check ${selected ? 'asm-service-card__check--on' : ''}`}
                          aria-hidden="true"
                        >
                          {selected ? '✓' : ''}
                        </span>
                      </div>
                      <p className="asm-service-card__name">{svc.serviceName}</p>
                      <p className="asm-service-card__price">{fmt(svc.price)}</p>
                      {svc.duration && (
                        <p className="asm-service-card__meta">{svc.duration}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Selected summary */}
            {selectedServices.length > 0 && (
              <div className="asm-bill">
                <p className="asm-bill__title">📋 Services to attach</p>
                <ul className="asm-bill__lines">
                  {selectedServices.map((svc) => (
                    <li key={svc._id ?? svc.id} className="asm-bill__line">
                      <span>{svc.icon} {svc.name}</span>
                      <span>{fmt(svc.price)}</span>
                    </li>
                  ))}
                </ul>
                <div className="asm-bill__total">
                  <span>Total to add</span>
                  <span className="asm-bill__total-amount">{fmt(total)}</span>
                </div>
              </div>
            )}

            {(localErr || apiError) && (
              <p className="rfm-error" role="alert">⚠ {localErr || apiError}</p>
            )}
          </div>

          <footer className="modal__footer">
            <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={loading || selectedIds.length === 0}
              aria-busy={loading}
            >
              {loading
                ? <><span className="hms-spinner hms-spinner--sm" aria-hidden="true" /> Attaching…</>
                : `Attach ${selectedIds.length > 0 ? `${selectedIds.length} service${selectedIds.length > 1 ? 's' : ''}` : 'Services'}${selectedIds.length > 0 ? ` — ${fmt(total)}` : ''}`
              }
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default AttachServicesModal;
