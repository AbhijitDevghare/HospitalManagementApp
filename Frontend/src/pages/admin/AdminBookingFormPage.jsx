// src/pages/admin/AdminBookingFormPage.jsx
import React, { useState, useCallback } from 'react';
import { useDispatch, useSelector }     from 'react-redux';
import { useNavigate }                  from 'react-router-dom';
import {
  createBooking,
  selectBookingLoading,
  selectBookingError,
  clearBookingError,
} from '../../store/slices/bookingSlice';
import {
  previewInvoice,
  selectInvoicePreview,
  selectPreviewLoading,
  clearInvoicePreview,
} from '../../store/slices/invoiceSlice';
import UserSearchCombobox     from '../../components/admin/UserSearchCombobox';
import RoomAvailabilityPicker from '../../components/admin/RoomAvailabilityPicker';

const TAX_RATE = 0.12;
const fmt        = (n) => `$${Number(n ?? 0).toFixed(2)}`;
const diffNights = (ci, co) => {
  if (!ci || !co) return 0;
  return Math.max(0, Math.round((new Date(co) - new Date(ci)) / 86_400_000));
};

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  page:        { minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Segoe UI',sans-serif", color: '#1e293b' },
  hero:        { background: 'linear-gradient(135deg,#1e293b 0%,#334155 100%)', color: '#fff', padding: '2rem 2rem 1.75rem' },
  heroInner:   { maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '1rem' },
  backBtn:     { display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '8px', padding: '7px 14px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', flexShrink: 0 },
  heroText:    { flex: 1 },
  heroTitle:   { fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.2rem' },
  heroSub:     { fontSize: '0.82rem', color: '#94a3b8', margin: 0 },
  body:        { maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' },
  errBanner:   { display: 'flex', alignItems: 'center', gap: '10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '12px 16px', marginBottom: '1.5rem', color: '#dc2626', fontSize: '0.875rem' },
  errClose:    { marginLeft: 'auto', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 700 },
  layout:      { display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem', alignItems: 'start' },
  // Step card
  stepCard:    { background: '#fff', borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden', marginBottom: '1.25rem' },
  stepTop:     { display: 'flex', alignItems: 'center', gap: '12px', padding: '1.1rem 1.5rem', borderBottom: '1px solid #f1f5f9' },
  stepBadge:   { width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#818cf8)', color: '#fff', fontWeight: 800, fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepTitle:   { fontSize: '0.95rem', fontWeight: 700, margin: 0, color: '#1e293b' },
  stepHint:    { fontSize: '0.72rem', color: '#94a3b8', marginLeft: 'auto' },
  stepBody:    { padding: '1.25rem 1.5rem' },
  // Form
  dateGrid:    { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  formGroup:   { display: 'flex', flexDirection: 'column', gap: '5px' },
  label:       { fontSize: '0.8rem', fontWeight: 600, color: '#475569' },
  req:         { color: '#ef4444' },
  input:       { padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', color: '#1e293b', background: '#f8fafc', outline: 'none', width: '100%', boxSizing: 'border-box' },
  inputErr:    { borderColor: '#f87171', background: '#fff5f5' },
  fieldErr:    { fontSize: '0.72rem', color: '#ef4444', margin: 0 },
  nightsBadge: { display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '999px', padding: '4px 14px', fontSize: '0.8rem', fontWeight: 600, marginTop: '0.75rem' },
  textarea:    { width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.875rem', color: '#1e293b', background: '#f8fafc', resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  // Room picker enhancement
  roomGrid:    { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' },
  roomCard:    (sel) => ({ border: `2px solid ${sel ? '#6366f1' : '#e2e8f0'}`, borderRadius: '14px', padding: '0.9rem 1rem', cursor: 'pointer', background: sel ? '#eef2ff' : '#fff', transition: 'all 0.15s', position: 'relative' }),
  roomCardImg: { width: '100%', height: '90px', objectFit: 'cover', borderRadius: '8px', marginBottom: '0.6rem' },
  roomCardPH:  { width: '100%', height: '90px', background: 'linear-gradient(135deg,#e0e7ff,#c7d2fe)', borderRadius: '8px', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem' },
  roomCardNum: { fontWeight: 700, fontSize: '0.9rem', color: '#1e293b', margin: '0 0 3px' },
  roomCardMeta:{ fontSize: '0.75rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '2px' },
  roomCardPrice:{ fontSize: '0.85rem', fontWeight: 700, color: '#6366f1', marginTop: '4px' },
  roomTypeBadge:{ display:'inline-block', fontSize:'0.65rem', fontWeight:700, padding:'2px 7px', borderRadius:'999px', background:'#eef2ff', color:'#6366f1', textTransform:'uppercase', letterSpacing:'0.04em' },
  roomSelCheck: { position: 'absolute', top: '8px', right: '8px', width: '20px', height: '20px', borderRadius: '50%', background: '#6366f1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800 },
  // Sidebar
  sidebarCard: { background: '#fff', borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden', position: 'sticky', top: '1.5rem' },
  sidebarHead: { padding: '1rem 1.5rem', borderBottom: '1px solid #f1f5f9', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8' },
  sidebarBody: { padding: '1.25rem 1.5rem' },
  sumRow:      { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '6px 0', borderBottom: '1px solid #f8fafc', fontSize: '0.84rem' },
  sumKey:      { color: '#64748b', fontWeight: 500 },
  sumVal:      { color: '#1e293b', fontWeight: 600, textAlign: 'right', maxWidth: '170px', wordBreak: 'break-word' },
  muted:       { color: '#cbd5e1', fontStyle: 'italic' },
  estBox:      { background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '0.9rem 1rem', marginTop: '1rem', fontSize: '0.84rem' },
  estRow:      { display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: '#475569' },
  estTotal:    { display: 'flex', justifyContent: 'space-between', padding: '7px 0 2px', borderTop: '1px dashed #cbd5e1', marginTop: '4px', fontWeight: 700, fontSize: '1rem', color: '#6366f1' },
  submitBtn:   { width: '100%', marginTop: '1rem', padding: '13px', background: 'linear-gradient(135deg,#6366f1,#818cf8)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
  submitDis:   { opacity: 0.55, cursor: 'not-allowed' },
  submitHint:  { fontSize: '0.72rem', color: '#94a3b8', textAlign: 'center', marginTop: '6px' },
  spinner:     { width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' },
  // Modal
  backdrop:    { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' },
  modal:       { background: '#fff', borderRadius: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', width: '100%', maxWidth: '500px', overflow: 'hidden', animation: 'fadeUp 0.2s ease' },
  mHead:       { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', background: 'linear-gradient(135deg,#6366f1,#818cf8)', color: '#fff' },
  mTitle:      { fontSize: '1.1rem', fontWeight: 800, margin: 0 },
  mClose:      { background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' },
  mBody:       { padding: '1.5rem' },
  snapBox:     { background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '0.9rem 1.1rem', marginBottom: '1.25rem', fontSize: '0.85rem' },
  snapRow:     { display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: '#475569' },
  snapKey:     { fontWeight: 500, color: '#94a3b8' },
  snapVal:     { fontWeight: 600, color: '#1e293b' },
  bTable:      { width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' },
  bTd:         { padding: '6px 0', color: '#475569', verticalAlign: 'top' },
  bTdR:        { padding: '6px 0', color: '#475569', textAlign: 'right', fontWeight: 500 },
  bSub:        { display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginTop: '1px' },
  bDiv:        { borderTop: '1px dashed #e2e8f0' },
  bTotTd:      { padding: '10px 0 4px', fontWeight: 800, fontSize: '1rem', color: '#1e293b' },
  bTotTdR:     { padding: '10px 0 4px', fontWeight: 800, fontSize: '1.05rem', color: '#6366f1', textAlign: 'right' },
  mHint:       { fontSize: '0.78rem', color: '#94a3b8', background: '#f8fafc', borderRadius: '10px', padding: '10px 12px', marginTop: '1rem', lineHeight: 1.5 },
  mFoot:       { display: 'flex', gap: '0.75rem', padding: '1rem 1.5rem', borderTop: '1px solid #f1f5f9', background: '#fafafa' },
  mCancel:     { flex: 1, padding: '11px', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontWeight: 600, fontSize: '0.9rem', color: '#64748b', cursor: 'pointer' },
  mConfirm:    { flex: 2, padding: '11px', background: 'linear-gradient(135deg,#6366f1,#818cf8)', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '0.9rem', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px' },
  mConfirmDis: { opacity: 0.6, cursor: 'not-allowed' },
};

// ── Invoice Preview Modal ─────────────────────────────────────────────────────
const InvoicePreviewModal = ({ nights, room, guestLabel, serviceCharges, numberOfGuests, onConfirm, onCancel, loading }) => {
  const subtotal = (room?.pricePerNight ?? 0) * nights;
  const svc      = Number(serviceCharges ?? 0);
  const tax      = (subtotal + svc) * TAX_RATE;
  const total    = subtotal + svc + tax;

  return (
    <div style={S.backdrop} onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div style={S.modal} role="dialog" aria-modal="true">
        <div style={S.mHead}>
          <h2 style={S.mTitle}>🧾 Invoice Preview</h2>
          <button style={S.mClose} onClick={onCancel}>✕</button>
        </div>
        <div style={S.mBody}>
          <div style={S.snapBox}>
            {[
              ['Guest',    guestLabel],
              ['Room',     room ? `Room ${room.roomNumber} · ${room.type ?? room.roomType}` : '—'],
              ['Duration', `${nights} night${nights !== 1 ? 's' : ''}`],
              ['Guests',   `${numberOfGuests} guest${numberOfGuests !== 1 ? 's' : ''}`],
            ].map(([k, v]) => (
              <div key={k} style={S.snapRow}>
                <span style={S.snapKey}>{k}</span>
                <span style={S.snapVal}>{v}</span>
              </div>
            ))}
          </div>
          <table style={S.bTable}>
            <tbody>
              <tr>
                <td style={S.bTd}>Room rate <span style={S.bSub}>{fmt(room?.pricePerNight)} × {nights} nights</span></td>
                <td style={S.bTdR}>{fmt(subtotal)}</td>
              </tr>
              {svc > 0 && (
                <tr>
                  <td style={S.bTd}>Service charges</td>
                  <td style={S.bTdR}>{fmt(svc)}</td>
                </tr>
              )}
              <tr style={S.bDiv}>
                <td style={S.bTd}>Tax & fees <span style={S.bSub}>{(TAX_RATE * 100).toFixed(0)}% GST</span></td>
                <td style={S.bTdR}>{fmt(tax)}</td>
              </tr>
              <tr>
                <td style={S.bTotTd}>Total Due</td>
                <td style={S.bTotTdR}>{fmt(total)}</td>
              </tr>
            </tbody>
          </table>
          <p style={S.mHint}>ℹ️ The booking will be created with <strong>pending</strong> payment status. You can process payment on the next screen.</p>
        </div>
        <div style={S.mFoot}>
          <button style={S.mCancel} onClick={onCancel} disabled={loading}>← Back</button>
          <button
            style={{ ...S.mConfirm, ...(loading ? S.mConfirmDis : {}) }}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <><span style={S.spinner} /> Creating…</> : `✅ Confirm & Create — ${fmt(total)}`}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const AdminBookingFormPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const loading  = useSelector(selectBookingLoading);
  const apiError = useSelector(selectBookingError);

  const [guest,         setGuest]       = useState(null);
  const [room,          setRoom]        = useState(null);
  const [checkIn,       setCheckIn]     = useState('');
  const [checkOut,      setCheckOut]    = useState('');
  const [numGuests,     setNumGuests]   = useState(1);
  const [serviceCharge, setSvcCharge]   = useState(0);
  const [notes,         setNotes]       = useState('');
  const [errors,        setErrors]      = useState({});
  const [showPreview,   setShowPreview] = useState(false);

  const nights = diffNights(checkIn, checkOut);
  const today  = new Date().toISOString().split('T')[0];

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = useCallback(() => {
    const e = {};
    if (!guest) {
      e.guest = 'Please select a guest.';
    } else if (guest.type === 'new') {
      if (!guest.guestData?.name?.trim())                   e.guest = 'Guest name is required.';
      else if (!guest.guestData?.email?.trim())             e.guest = 'Guest email is required.';
      else if (!/\S+@\S+\.\S+/.test(guest.guestData.email)) e.guest = 'Enter a valid email.';
    }
    if (!checkIn)  e.checkIn  = 'Check-in date is required.';
    if (!checkOut) e.checkOut = 'Check-out date is required.';
    if (checkIn && checkOut && checkIn >= checkOut) e.checkOut = 'Check-out must be after check-in.';
    if (!room)     e.room     = 'Please select an available room.';
    return e;
  }, [guest, checkIn, checkOut, room]);

  const handlePreview = (e) => {
    e.preventDefault();
    dispatch(clearBookingError());
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setShowPreview(true);
  };

  const handleConfirm = async () => {
    const payload = {
      roomId:         room._id ?? room.id,
      checkInDate:    checkIn,
      checkOutDate:   checkOut,
      numberOfGuests: Number(numGuests) || 1,
      serviceCharges: Number(serviceCharge) || 0,
      ...(notes.trim() && { notes: notes.trim() }),
      ...(guest.type === 'existing'
        ? { userId: guest.user._id ?? guest.user.id }
        : {
            guestName:  guest.guestData.name.trim(),
            guestEmail: guest.guestData.email.trim(),
            ...(guest.guestData.phone && { guestPhone: guest.guestData.phone.trim() }),
          }),
    };
    const result = await dispatch(createBooking(payload));
    if (createBooking.fulfilled.match(result)) {
      // Go to payment so admin can process it immediately
      navigate('/payment', { state: { booking: result.payload } });
    }
  };

  const guestLabel = guest?.type === 'existing'
    ? `${guest.user.name ?? ''} (${guest.user.email})`
    : guest?.type === 'new' ? `${guest.guestData.name} — New Guest` : '—';

  const subtotal = (room?.pricePerNight ?? 0) * nights;
  const svc      = Number(serviceCharge) || 0;

  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}} @keyframes fadeUp{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}`}</style>
      <div style={S.page}>

        {/* ── Hero ── */}
        <div style={S.hero}>
          <div style={S.heroInner}>
            <button style={S.backBtn} onClick={() => navigate(-1)}>← Back</button>
            <div style={S.heroText}>
              <h1 style={S.heroTitle}>📋 New Admin Booking</h1>
              <p style={S.heroSub}>Walk-in · Phone reservation · Manual entry</p>
            </div>
          </div>
        </div>

        <div style={S.body}>
          {apiError && (
            <div style={S.errBanner} role="alert">
              ⚠️ <span>{apiError}</span>
              <button style={S.errClose} onClick={() => dispatch(clearBookingError())}>✕</button>
            </div>
          )}

          <form onSubmit={handlePreview} noValidate>
            <div style={S.layout}>

              {/* ── LEFT ── */}
              <div>

                {/* Step 1 — Guest */}
                <div style={S.stepCard}>
                  <div style={S.stepTop}>
                    <div style={S.stepBadge}>1</div>
                    <h2 style={S.stepTitle}>Guest</h2>
                    {guest && <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>✓ Selected</span>}
                  </div>
                  <div style={S.stepBody}>
                    <UserSearchCombobox value={guest} onChange={setGuest} error={errors.guest} />
                  </div>
                </div>

                {/* Step 2 — Dates */}
                <div style={S.stepCard}>
                  <div style={S.stepTop}>
                    <div style={S.stepBadge}>2</div>
                    <h2 style={S.stepTitle}>Stay Dates</h2>
                    {nights > 0 && <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#6366f1', fontWeight: 600 }}>🌙 {nights} night{nights !== 1 ? 's' : ''}</span>}
                  </div>
                  <div style={S.stepBody}>
                    <div style={S.dateGrid}>
                      <div style={S.formGroup}>
                        <label style={S.label} htmlFor="abf-ci">Check-in <span style={S.req}>*</span></label>
                        <input
                          id="abf-ci" type="date" value={checkIn} min={today}
                          style={{ ...S.input, ...(errors.checkIn ? S.inputErr : {}) }}
                          onChange={(e) => { setCheckIn(e.target.value); setRoom(null); setErrors((p) => ({ ...p, checkIn: '', room: '' })); }}
                        />
                        {errors.checkIn && <p style={S.fieldErr}>{errors.checkIn}</p>}
                      </div>
                      <div style={S.formGroup}>
                        <label style={S.label} htmlFor="abf-co">Check-out <span style={S.req}>*</span></label>
                        <input
                          id="abf-co" type="date" value={checkOut} min={checkIn || today}
                          style={{ ...S.input, ...(errors.checkOut ? S.inputErr : {}) }}
                          onChange={(e) => { setCheckOut(e.target.value); setRoom(null); setErrors((p) => ({ ...p, checkOut: '', room: '' })); }}
                        />
                        {errors.checkOut && <p style={S.fieldErr}>{errors.checkOut}</p>}
                      </div>
                    </div>
                    {/* Guests count */}
                    <div style={{ ...S.formGroup, marginTop: '0.875rem' }}>
                      <label style={S.label} htmlFor="abf-guests">
                        Number of Guests <span style={S.req}>*</span>
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                          type="button"
                          onClick={() => setNumGuests((n) => Math.max(1, Number(n) - 1))}
                          style={{ width: '34px', height: '34px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: '1.1rem', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                        >−</button>
                        <input
                          id="abf-guests" type="number" min="1" max={room?.maxOccupancy ?? 20}
                          value={numGuests}
                          onChange={(e) => setNumGuests(Math.max(1, Number(e.target.value)))}
                          style={{ ...S.input, width: '70px', textAlign: 'center', flex: 'none' }}
                        />
                        <button
                          type="button"
                          onClick={() => setNumGuests((n) => Math.min(room?.maxOccupancy ?? 20, Number(n) + 1))}
                          style={{ width: '34px', height: '34px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: '1.1rem', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                        >+</button>
                        {room?.maxOccupancy && (
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                            Max {room.maxOccupancy} for this room
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 3 — Room (upgraded) */}
                <div style={S.stepCard}>
                  <div style={S.stepTop}>
                    <div style={S.stepBadge}>3</div>
                    <h2 style={S.stepTitle}>Room</h2>
                    <span style={S.stepHint}>Maintenance rooms disabled automatically</span>
                    {room && <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>✓ Room {room.roomNumber}</span>}
                  </div>
                  <div style={S.stepBody}>
                    {(!checkIn || !checkOut || nights < 1) ? (
                      <div style={{ textAlign: 'center', padding: '2rem 0', color: '#94a3b8', fontSize: '0.875rem' }}>
                        📅 Select check-in and check-out dates first to see available rooms.
                      </div>
                    ) : (
                      <RoomAvailabilityPicker
                        checkIn={checkIn}
                        checkOut={checkOut}
                        value={room}
                        onChange={(r) => { setRoom(r); setErrors((p) => ({ ...p, room: '' })); }}
                        error={errors.room}
                      />
                    )}
                    {errors.room && <p style={{ ...S.fieldErr, marginTop: '0.5rem' }}>{errors.room}</p>}

                    {/* Selected room preview card */}
                    {room && (
                      <div style={{ marginTop: '1rem', background: '#f8fafc', border: '1.5px solid #c7d2fe', borderRadius: '12px', padding: '0.875rem 1rem', display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
                        {room.images?.[0]
                          ? <img src={room.images[0]} alt="" style={{ width: '72px', height: '52px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }} />
                          : <div style={{ width: '72px', height: '52px', background: 'linear-gradient(135deg,#e0e7ff,#c7d2fe)', borderRadius: '8px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>🏨</div>
                        }
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Room {room.roomNumber}</span>
                            <span style={S.roomTypeBadge}>{room.type ?? room.roomType}</span>
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', gap: '12px' }}>
                            {room.floor        && <span>🏢 Floor {room.floor}</span>}
                            {room.maxOccupancy && <span>👥 Max {room.maxOccupancy}</span>}
                            <span style={{ color: '#6366f1', fontWeight: 700 }}>{fmt(room.pricePerNight)}/night</span>
                          </div>
                          {nights > 0 && (
                            <div style={{ marginTop: '4px', fontSize: '0.78rem', color: '#16a34a', fontWeight: 600 }}>
                              {nights} nights = {fmt(room.pricePerNight * nights)} before tax
                            </div>
                          )}
                        </div>
                        <button type="button" style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem', padding: '2px' }} onClick={() => setRoom(null)} title="Change room">✕</button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Step 4 — Service charges */}
                <div style={S.stepCard}>
                  <div style={S.stepTop}>
                    <div style={S.stepBadge}>4</div>
                    <h2 style={S.stepTitle}>Service Charges <span style={S.stepHint}>Optional</span></h2>
                  </div>
                  <div style={S.stepBody}>
                    <div style={S.formGroup}>
                      <label style={S.label} htmlFor="abf-svc">Extra charges (laundry, parking, minibar…)</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#475569' }}>$</span>
                        <input
                          id="abf-svc" type="number" min="0" step="0.01"
                          value={serviceCharge}
                          onChange={(e) => setSvcCharge(e.target.value)}
                          style={{ ...S.input, flex: 1 }}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 5 — Notes */}
                <div style={S.stepCard}>
                  <div style={S.stepTop}>
                    <div style={S.stepBadge}>5</div>
                    <h2 style={S.stepTitle}>Internal Notes <span style={S.stepHint}>Optional</span></h2>
                  </div>
                  <div style={S.stepBody}>
                    <textarea
                      rows={3} style={S.textarea} value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Special requests, accessibility needs, VIP notes…"
                    />
                  </div>
                </div>
              </div>

              {/* ── RIGHT: Sidebar ── */}
              <aside>
                <div style={S.sidebarCard}>
                  <div style={S.sidebarHead}>📋 Booking Summary</div>
                  <div style={S.sidebarBody}>
                    {[
                      ['Guest',    guest ? (guest.type === 'existing' ? (guest.user.name ?? guest.user.email) : (guest.guestData?.name || '—')) : null],
                      ['Room',     room  ? `Room ${room.roomNumber} · ${room.type ?? room.roomType}` : null],
                      ['Check-in', checkIn  || null],
                      ['Check-out',checkOut || null],
                      ['Nights',   nights > 0 ? `${nights} night${nights !== 1 ? 's' : ''}` : null],
                      ['Guests',   numGuests ? `${numGuests} guest${numGuests !== 1 ? 's' : ''}` : null],
                    ].map(([k, v]) => (
                      <div key={k} style={S.sumRow}>
                        <span style={S.sumKey}>{k}</span>
                        <span style={v ? S.sumVal : S.muted}>{v ?? 'Not set'}</span>
                      </div>
                    ))}

                    {room && nights > 0 && (
                      <div style={S.estBox}>
                        <div style={S.estRow}><span>Room ({nights}n)</span><span>{fmt(subtotal)}</span></div>
                        {svc > 0 && <div style={S.estRow}><span>Service charges</span><span>{fmt(svc)}</span></div>}
                        <div style={S.estRow}><span>Tax ({(TAX_RATE * 100).toFixed(0)}%)</span><span>{fmt((subtotal + svc) * TAX_RATE)}</span></div>
                        <div style={S.estTotal}><span>Est. Total</span><span>{fmt((subtotal + svc) * (1 + TAX_RATE))}</span></div>
                      </div>
                    )}

                    <button
                      type="submit"
                      style={{ ...S.submitBtn, ...(loading ? S.submitDis : {}) }}
                      disabled={loading}
                    >
                      {loading ? <><span style={S.spinner} /> Preparing…</> : '🧾 Preview Invoice & Confirm'}
                    </button>
                    <p style={S.submitHint}>Review the full invoice before creating.</p>
                  </div>
                </div>
              </aside>
            </div>
          </form>
        </div>
      </div>

      {/* ── Invoice Modal ── */}
      {showPreview && (
        <InvoicePreviewModal
          nights={nights}
          room={room}
          guestLabel={guestLabel}
          serviceCharges={svc}
          numberOfGuests={Number(numGuests) || 1}
          onConfirm={handleConfirm}
          onCancel={() => setShowPreview(false)}
          loading={loading}
        />
      )}
    </>
  );
};

export default AdminBookingFormPage;
