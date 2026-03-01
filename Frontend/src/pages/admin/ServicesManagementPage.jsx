// src/pages/admin/ServicesManagementPage.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector }                from 'react-redux';
import {
  fetchAllServices, deleteService,
  selectAllServices, selectServicesLoading, selectServicesError, clearServicesError,
} from '../../store/slices/servicesSlice';
import { fetchAllBookings, selectBookings } from '../../store/slices/bookingSlice';
import ServiceFormModal          from '../../components/admin/ServiceFormModal';
import ServiceAvailabilityToggle from '../../components/admin/ServiceAvailabilityToggle';
import AttachServicesModal       from '../../components/admin/AttachServicesModal';

const CATEGORY_ICONS = {
  spa: '🧖', dining: '🍽️', transport: '🚗', laundry: '👔',
  entertainment: '🎭', fitness: '🏋️', business: '💼', other: '✨',
};

const fmt = (n) => `$${Number(n ?? 0).toFixed(2)}`;

// ── Delete confirm ────────────────────────────────────────────────────────────
const DeleteConfirm = ({ service, onConfirm, onCancel, busy }) => (
  <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
    <div className="modal modal--sm" role="dialog" aria-modal="true">
      <header className="modal__header">
        <h2 className="modal__title">🗑️ Delete Service</h2>
        <button className="modal__close" onClick={onCancel} aria-label="Close">✕</button>
      </header>
      <div className="modal__body">
        <p className="text-sm text-slate-700">
          Permanently delete <strong>{service.icon} {service.name}</strong>?
        </p>
        <div className="alert alert--error">
          <span className="alert__icon">⚠️</span>
          <span>
            This service will be removed from the catalogue.
            Any existing billing entries that reference it will remain unaffected.
          </span>
        </div>
        <dl className="idc-summary">
          <dt>Category</dt>
          <dd className="capitalize">{service.category}</dd>
          <dt>Price</dt>
          <dd>{fmt(service.price)}</dd>
        </dl>
      </div>
      <footer className="modal__footer">
        <button className="btn btn--ghost" onClick={onCancel} disabled={busy}>Cancel</button>
        <button className="btn btn--danger" onClick={onConfirm} disabled={busy} aria-busy={busy}>
          {busy
            ? <><span className="hms-spinner hms-spinner--sm" aria-hidden="true" /> Deleting…</>
            : 'Yes, Delete Service'}
        </button>
      </footer>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
const ServicesManagementPage = () => {
  const dispatch  = useDispatch();
  const services  = useSelector(selectAllServices);
  const bookings  = useSelector(selectBookings);
  const loading   = useSelector(selectServicesLoading);
  const error     = useSelector(selectServicesError);

  const [catFilter,  setCatFilter]  = useState('');
  const [availFilter,setAvailFilter]= useState(''); // '' | 'true' | 'false'
  const [search,     setSearch]     = useState('');

  const [formSvc,    setFormSvc]    = useState(undefined); // undefined=closed, null=add, obj=edit
  const [deleteSvc,  setDeleteSvc]  = useState(null);
  const [attachCtx,  setAttachCtx]  = useState(null); // { booking }
  const [deleting,   setDeleting]   = useState(false);
  const [toast,      setToast]      = useState(null);

  useEffect(() => {
    dispatch(fetchAllServices());
    dispatch(fetchAllBookings({ status: 'confirmed' }));
  }, [dispatch]);

  const pushToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const allSvcs = Array.isArray(services) ? services : [];

  const filtered = allSvcs.filter((s) => {
    if (catFilter   && s.category !== catFilter)                     return false;
    if (availFilter && String(s.isAvailable !== false) !== availFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!s.name?.toLowerCase().includes(q) && !s.category?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const categories    = [...new Set(allSvcs.map((s) => s.category).filter(Boolean))];
  const availCount    = allSvcs.filter((s) => s.isAvailable !== false).length;
  const unavailCount  = allSvcs.length - availCount;

  // Active bookings for attach-to-booking picker
  const activeBookings = (Array.isArray(bookings) ? bookings : [])
    .filter((b) => b.status === 'confirmed' || b.status === 'checked-in');

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!deleteSvc) return;
    setDeleting(true);
    const result = await dispatch(deleteService(deleteSvc._id ?? deleteSvc.id));
    setDeleting(false);
    setDeleteSvc(null);
    if (deleteService.fulfilled.match(result)) {
      pushToast(`"${deleteSvc.name}" deleted.`);
    }
  }, [dispatch, deleteSvc]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <main className="admin-page" aria-labelledby="smp-svc-title">

      {/* ── Toast ── */}
      {toast && (
        <div className={`toast toast--${toast.type} fixed top-4 right-4 z-50 w-80`} role="status">
          <span className="toast__body">{toast.msg}</span>
          <button className="toast__close" onClick={() => setToast(null)} aria-label="Dismiss">✕</button>
        </div>
      )}

      {/* ── Header ── */}
      <div className="admin-page__header">
        <h1 id="smp-svc-title" className="admin-page__title">🛎️ Hotel Services</h1>
        <div className="action-group">
          <button className="btn btn--ghost btn--sm"
            onClick={() => dispatch(fetchAllServices())} disabled={loading}
            aria-label="Refresh services">
            {loading ? '…' : '↺ Refresh'}
          </button>
          <button className="btn btn--primary" onClick={() => setFormSvc(null)}>
            + Add Service
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="alert alert--error mb-4" role="alert">
          <span className="alert__icon">⚠️</span>
          <span>{error}</span>
          <button className="alert__close" onClick={() => dispatch(clearServicesError())}
            aria-label="Dismiss">✕</button>
        </div>
      )}

      {/* ── Stats ── */}
      <div className="stats-bar">
        <div className="stat-card stat-card--neutral">
          <span className="stat-card__icon">🛎️</span>
          <span className="stat-card__value">{allSvcs.length}</span>
          <span className="stat-card__label">Total Services</span>
        </div>
        <div className="stat-card stat-card--success">
          <span className="stat-card__icon">✅</span>
          <span className="stat-card__value">{availCount}</span>
          <span className="stat-card__label">Available</span>
        </div>
        <div className="stat-card stat-card--warning">
          <span className="stat-card__icon">🚫</span>
          <span className="stat-card__value">{unavailCount}</span>
          <span className="stat-card__label">Unavailable</span>
        </div>
        <div className="stat-card stat-card--info">
          <span className="stat-card__icon">📋</span>
          <span className="stat-card__value">{activeBookings.length}</span>
          <span className="stat-card__label">Active Bookings</span>
        </div>
      </div>

      {/* ── Attach-to-booking banner ── */}
      {activeBookings.length > 0 && (
        <div className="svc-attach-banner">
          <span className="svc-attach-banner__icon">📌</span>
          <span className="svc-attach-banner__text">
            <strong>{activeBookings.length}</strong> active booking{activeBookings.length > 1 ? 's' : ''} — select one to attach services to their bill:
          </span>
          <div className="svc-attach-banner__list">
            {activeBookings.slice(0, 6).map((b) => (
              <button key={b._id ?? b.id}
                className="btn btn--ghost btn--sm svc-attach-booking-btn"
                onClick={() => setAttachCtx({ booking: b })}>
                #{(b._id ?? b.id ?? '').toString().slice(-6).toUpperCase()}
                {b.roomNumber ? ` · Rm ${b.roomNumber}` : ''}
              </button>
            ))}
            {activeBookings.length > 6 && (
              <span className="svc-attach-banner__more">+{activeBookings.length - 6} more</span>
            )}
          </div>
        </div>
      )}

      {/* ── Category pills ── */}
      {categories.length > 0 && (
        <div className="category-pills">
          <button className={`category-pill ${!catFilter ? 'category-pill--active' : ''}`}
            onClick={() => setCatFilter('')}>
            <span>🏷️</span>
            <span className="category-pill__name">All</span>
            <span className="category-pill__count">{allSvcs.length}</span>
          </button>
          {categories.map((cat) => (
            <button key={cat}
              className={`category-pill ${catFilter === cat ? 'category-pill--active' : ''}`}
              onClick={() => setCatFilter(cat)}>
              <span>{CATEGORY_ICONS[cat] ?? '✨'}</span>
              <span className="category-pill__name capitalize">{cat}</span>
              <span className="category-pill__count">
                {allSvcs.filter((s) => s.category === cat).length}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── Filters ── */}
      <div className="filter-bar">
        <div className="form-group form-group--inline">
          <label htmlFor="svc-search">Search</label>
          <input id="svc-search" type="search" value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Service name or category…" />
        </div>
        <div className="form-group form-group--inline">
          <label htmlFor="svc-avail">Availability</label>
          <select id="svc-avail" value={availFilter} onChange={(e) => setAvailFilter(e.target.value)}>
            <option value="">All</option>
            <option value="true">✅ Available</option>
            <option value="false">🚫 Unavailable</option>
          </select>
        </div>
        {(search || availFilter) && (
          <button className="btn btn--ghost btn--sm"
            onClick={() => { setSearch(''); setAvailFilter(''); }}>Clear</button>
        )}
        <span className="filter-bar__count">
          {filtered.length} service{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Services grid ── */}
      {filtered.length === 0 && !loading && (
        <p className="page-empty">No services match the current filters.</p>
      )}

      <div className="svc-grid">
        {filtered.map((svc) => {
          const id          = svc._id ?? svc.id;
          const isAvailable = svc.isAvailable !== false;
          return (
            <div key={id}
              className={`svc-card ${!isAvailable ? 'svc-card--unavailable' : ''}`}>

              {/* Header row */}
              <div className="svc-card__header">
                <span className="svc-card__icon">{svc.icon ?? CATEGORY_ICONS[svc.category] ?? '✨'}</span>
                <div className="svc-card__header-right">
                  <ServiceAvailabilityToggle
                    service={svc}
                    onToggled={() => dispatch(fetchAllServices())}
                  />
                </div>
              </div>

              {/* Info */}
              <h3 className="svc-card__name">{svc.name}</h3>
              <p className="svc-card__price">{fmt(svc.price)}
                {svc.duration && <span className="svc-card__duration"> · {svc.duration}</span>}
              </p>
              <span className="badge badge--category capitalize svc-card__cat">
                {CATEGORY_ICONS[svc.category] ?? ''} {svc.category}
              </span>

              {svc.description && (
                <p className="svc-card__desc">{svc.description}</p>
              )}

              {svc.maxPerDay && (
                <p className="svc-card__meta">Max {svc.maxPerDay}/day</p>
              )}

              {/* Actions */}
              <div className="svc-card__actions">
                <button className="btn btn--ghost btn--sm"
                  onClick={() => setFormSvc(svc)}
                  aria-label={`Edit ${svc.name}`}>
                  ✏️ Edit
                </button>
                {activeBookings.length > 0 && isAvailable && (
                  <button className="btn btn--primary btn--sm svc-attach-btn"
                    onClick={() => setAttachCtx({ booking: null, preSelectedSvc: svc })}
                    aria-label={`Attach ${svc.name} to a booking`}>
                    📌 Attach
                  </button>
                )}
                <button className="btn btn--danger btn--sm"
                  onClick={() => setDeleteSvc(svc)}
                  aria-label={`Delete ${svc.name}`}>
                  🗑️
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Add / Edit service modal ── */}
      {formSvc !== undefined && (
        <ServiceFormModal
          service={formSvc}
          onClose={() => setFormSvc(undefined)}
          onSuccess={(saved) => {
            setFormSvc(undefined);
            dispatch(fetchAllServices());
            pushToast(
              formSvc
                ? `"${saved.name}" updated.`
                : `"${saved.name}" added to the catalogue.`
            );
          }}
        />
      )}

      {/* ── Attach services to booking modal ── */}
      {attachCtx && (
        <AttachServicesToBookingFlow
          bookings={activeBookings}
          allServices={allSvcs}
          preSelectedBooking={attachCtx.booking}
          onClose={() => setAttachCtx(null)}
          onSuccess={(_, total) => {
            setAttachCtx(null);
            pushToast(`Services totalling ${fmt(total)} added to the booking bill. ✅`);
          }}
        />
      )}

      {/* ── Delete confirm modal ── */}
      {deleteSvc && (
        <DeleteConfirm
          service={deleteSvc}
          onConfirm={handleDelete}
          onCancel={() => setDeleteSvc(null)}
          busy={deleting}
        />
      )}
    </main>
  );
};

// ── Inline booking picker → AttachServicesModal flow ─────────────────────────
const AttachServicesToBookingFlow = ({
  bookings, allServices, preSelectedBooking, onClose, onSuccess,
}) => {
  const [selectedBooking, setSelectedBooking] = useState(preSelectedBooking ?? null);

  if (!selectedBooking) {
    return (
      <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="modal modal--sm" role="dialog" aria-modal="true" aria-labelledby="abp-title">
          <header className="modal__header">
            <h2 id="abp-title" className="modal__title">📋 Select a Booking</h2>
            <button className="modal__close" onClick={onClose} aria-label="Close">✕</button>
          </header>
          <div className="modal__body">
            <p className="text-sm text-slate-600 mb-3">
              Choose an active booking to attach services to:
            </p>
            <ul className="abp-list">
              {bookings.map((b) => (
                <li key={b._id ?? b.id}>
                  <button type="button" className="abp-item"
                    onClick={() => setSelectedBooking(b)}>
                    <span className="abp-item__id font-mono text-xs">
                      #{(b._id ?? b.id ?? '').toString().slice(-8).toUpperCase()}
                    </span>
                    <span className="abp-item__guest">
                      {b.guestName ?? b.user?.name ?? 'Guest'}
                    </span>
                    {b.roomNumber && (
                      <span className="badge badge--info">Rm {b.roomNumber}</span>
                    )}
                    <span className={`badge ${b.status === 'checked-in' ? 'badge--success' : 'badge--warning'} ml-auto`}>
                      {b.status}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <footer className="modal__footer">
            <button className="btn btn--ghost" onClick={onClose}>Cancel</button>
          </footer>
        </div>
      </div>
    );
  }

  return (
    <AttachServicesModal
      booking={selectedBooking}
      availableServices={allServices}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
};

export default ServicesManagementPage;
