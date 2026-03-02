// filepath: d:\HotelManagementSystem\Frontend\src\pages\BookingDetailPage.jsx
// src/pages/BookingDetailPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Full detail view for a single booking — room info, stay dates, cost
// breakdown, payment status, and a cancel action.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector }   from 'react-redux';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  fetchBookingById,
  cancelBooking,
  selectCurrentBooking,
  selectBookingLoading,
  selectBookingError,
  clearCurrentBooking,
} from '../store/slices/bookingSlice';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (d) => d
  ? new Date(d).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
  : '—';

const calcNights = (ci, co) =>
  ci && co ? Math.max(0, Math.round((new Date(co) - new Date(ci)) / 86_400_000)) : 0;

const STATUS_META = {
  confirmed: { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', label: 'Confirmed' },
  pending:   { color: '#d97706', bg: '#fffbeb', border: '#fde68a', label: 'Pending'   },
  cancelled: { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', label: 'Cancelled' },
  completed: { color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe', label: 'Completed' },
};
const getStatus = (s = '') => STATUS_META[s.toLowerCase()] ?? {
  color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', label: s,
};

const TAX_RATE = 0.12;

const S = {
  page: { minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Segoe UI',sans-serif", color: '#1e293b' },
  hero: { background: 'linear-gradient(135deg,#1e293b 0%,#334155 100%)', color: '#fff', padding: '2rem 2rem 1.75rem' },
  heroInner: { maxWidth: '860px', margin: '0 auto' },
  backBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff', borderRadius: '8px', padding: '6px 14px',
    fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', marginBottom: '1rem',
  },
  heroTop: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' },
  heroTitle: { fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.2rem' },
  heroId: { fontSize: '0.78rem', color: '#94a3b8', margin: 0, fontFamily: 'monospace' },
  statusBadge: (s) => ({
    display: 'inline-block', fontSize: '0.75rem', fontWeight: 700, padding: '4px 14px',
    borderRadius: '999px', border: '1px solid',
    borderColor: getStatus(s).border, background: getStatus(s).bg, color: getStatus(s).color,
    textTransform: 'uppercase', letterSpacing: '0.06em',
  }),
  body: {
    maxWidth: '860px', margin: '0 auto', padding: '2rem 1.5rem',
    display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem', alignItems: 'start',
  },
  card: { background: '#fff', borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden', marginBottom: '1.25rem' },
  cardHeader: { padding: '1rem 1.5rem', borderBottom: '1px solid #f1f5f9' },
  cardHeaderTitle: { fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', margin: 0 },
  cardBody: { padding: '1.25rem 1.5rem' },
  roomRow: { display: 'flex', gap: '1rem', alignItems: 'flex-start' },
  roomImg: { width: '110px', height: '80px', objectFit: 'cover', borderRadius: '10px', flexShrink: 0 },
  roomPlaceholder: {
    width: '110px', height: '80px', borderRadius: '10px', flexShrink: 0,
    background: 'linear-gradient(135deg,#e0e7ff,#c7d2fe)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem',
  },
  roomName: { fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.3rem', display: 'flex', alignItems: 'center', gap: '8px' },
  typeBadge: {
    fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '999px',
    background: '#eef2ff', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em',
  },
  roomMeta: { fontSize: '0.82rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '4px' },
  infoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  infoItem: { display: 'flex', flexDirection: 'column', gap: '3px' },
  infoLabel: { fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8' },
  infoVal: { fontSize: '0.92rem', fontWeight: 600, color: '#1e293b' },
  costTable: { width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' },
  costTd: { padding: '7px 0', color: '#475569', borderBottom: '1px solid #f8fafc' },
  costTdRight: { padding: '7px 0', color: '#475569', textAlign: 'right', borderBottom: '1px solid #f8fafc' },
  costTotalTd: { padding: '10px 0 4px', fontWeight: 800, fontSize: '1rem', color: '#1e293b' },
  costTotalTdRight: { padding: '10px 0 4px', fontWeight: 800, fontSize: '1.1rem', color: '#6366f1', textAlign: 'right' },
  paymentBox: (paid) => ({
    background: paid ? '#f0fdf4' : '#fffbeb',
    border: '1.5px solid ' + (paid ? '#bbf7d0' : '#fde68a'),
    borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1rem',
    display: 'flex', alignItems: 'center', gap: '10px',
  }),
  paymentIcon: { fontSize: '1.5rem' },
  paymentLabel: { fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8' },
  paymentVal: (paid) => ({ fontSize: '0.95rem', fontWeight: 700, color: paid ? '#16a34a' : '#d97706' }),
  totalCard: { background: '#fff', borderRadius: '16px', padding: '1.25rem', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: '1rem' },
  totalCardLabel: { fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', margin: '0 0 0.4rem' },
  totalCardAmt: { fontSize: '2rem', fontWeight: 800, color: '#6366f1', margin: 0 },
  totalCardSub: { fontSize: '0.75rem', color: '#94a3b8', margin: '4px 0 0' },
  // Payment breakdown mini-table in sidebar
  payBreakCard: { background: '#fff', borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden', marginBottom: '1rem' },
  payBreakHead: { padding: '0.75rem 1.25rem', borderBottom: '1px solid #f1f5f9', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' },
  payBreakBody: { padding: '0.875rem 1.25rem' },
  payBreakRow:  { display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '4px 0', color: '#475569' },
  payBreakDiv:  { borderTop: '1.5px dashed #e2e8f0', margin: '6px 0' },
  payBreakTotal:{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 800, padding: '4px 0', color: '#1e293b' },
  payBreakDue:  { display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 800, padding: '4px 0', color: '#dc2626' },
  payBreakPaid: { display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 800, padding: '4px 0', color: '#16a34a' },
  viewInvoiceBtn: {
    width: '100%', padding: '11px', background: '#fff',
    border: '1.5px solid #c7d2fe', borderRadius: '12px',
    color: '#6366f1', fontWeight: 700, fontSize: '0.875rem',
    cursor: 'pointer', display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: '6px', marginBottom: '0.5rem',
  },
  cancelBtn: {
    width: '100%', padding: '12px',
    background: '#fff', border: '1.5px solid #fecaca',
    borderRadius: '12px', color: '#dc2626',
    fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
  },
  cancelBtnDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  successBanner: {
    background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '12px',
    padding: '0.875rem 1.25rem', color: '#16a34a', fontSize: '0.875rem', fontWeight: 600,
    display: 'flex', alignItems: 'center', gap: '10px',
    maxWidth: '860px', margin: '1.5rem auto -0.25rem',
  },
  center: { textAlign: 'center', padding: '5rem 2rem', color: '#94a3b8' },
  spinner: {
    width: '40px', height: '40px', margin: '0 auto 1.25rem',
    border: '3px solid #e2e8f0', borderTop: '3px solid #6366f1',
    borderRadius: '50%', animation: 'spin 0.8s linear infinite',
  },
  errorBox: {
    background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px',
    padding: '1rem 1.25rem', color: '#dc2626', fontSize: '0.875rem',
    margin: '2rem auto', maxWidth: '860px',
  },
  backdrop: {
    position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)',
    backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', zIndex: 1000, padding: '1rem',
  },
  modalBox: {
    background: '#fff', borderRadius: '20px', padding: '2rem',
    maxWidth: '400px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
    textAlign: 'center',
  },
  modalIcon: { fontSize: '2.5rem', marginBottom: '0.75rem' },
  modalTitle: { fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.5rem' },
  modalText: { fontSize: '0.875rem', color: '#64748b', margin: '0 0 1.5rem' },
  modalActions: { display: 'flex', gap: '0.75rem' },
  modalCancel: { flex: 1, padding: '11px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontWeight: 600, cursor: 'pointer', color: '#64748b' },
  modalConfirm: { flex: 1, padding: '11px', background: '#dc2626', border: 'none', borderRadius: '10px', fontWeight: 700, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' },
  smallSpinner: { width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' },
};

// ─────────────────────────────────────────────────────────────────────────────
const BookingDetailPage = () => {
  const { id }   = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const booking  = useSelector(selectCurrentBooking);
  const loading  = useSelector(selectBookingLoading);
  const error    = useSelector(selectBookingError);
  const [showConfirm, setShowConfirm] = useState(false);
  const [cancelling,  setCancelling]  = useState(false);
  const paymentSuccess = location.state?.paymentSuccess ?? false;

  useEffect(() => {
    dispatch(fetchBookingById(id));
    return () => dispatch(clearCurrentBooking());
  }, [dispatch, id]);

  const handleCancel = async () => {
    setCancelling(true);
    const result = await dispatch(cancelBooking(id));
    setCancelling(false);
    setShowConfirm(false);
    if (cancelBooking.fulfilled.match(result)) navigate('/bookings');
  };

  if (loading) return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
      <div style={S.center}><div style={S.spinner}/><p>Loading booking details…</p></div>
    </>
  );

  if (error)    return <div style={S.errorBox}>⚠️ {error}</div>;
  if (!booking) return null;

  const canCancel = ['pending', 'confirmed'].includes(booking?.status?.toLowerCase());
  const nights    = calcNights(booking.checkInDate, booking.checkOutDate);
  const room      = booking?.room ?? {};

// Invoice-based payment logic
const pricePerNight = Number(room.pricePerNight ?? 0);
const subtotal      = Number(booking.subtotal ?? pricePerNight * nights);
const svcCharge     = Number(booking.serviceCharges ?? booking.serviceCharge ?? 0);
const taxAmt        = Number(booking.taxAmount ?? (subtotal + svcCharge) * TAX_RATE);
const total         = Number(booking.totalAmount ?? subtotal + svcCharge + taxAmt);

// 🔥 Correct Payment Logic
const paidAmt      = Number(booking.paidAmount ?? 0);
const remainingAmt = Math.max(0, Number((total - paidAmt).toFixed(2)));
const amountDue    = remainingAmt;
const fullyPaid    = remainingAmt <= 0;
const paid         = fullyPaid;

  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
      <div style={S.page}>

        {/* Hero */}
        <div style={S.hero}>
          <div style={S.heroInner}>
            <button style={S.backBtn} onClick={() => navigate(-1)}>← My Bookings</button>
            <div style={S.heroTop}>
              <div>
                <h1 style={S.heroTitle}>🏨 Booking Details</h1>
                <p style={S.heroId}>ID: {booking._id ?? booking.id}</p>
              </div>
              <span style={S.statusBadge(booking.status)}>{getStatus(booking.status).label}</span>
            </div>
          </div>
        </div>

        {/* ── Payment Success Banner ── */}
        {paymentSuccess && (
          <div style={S.successBanner}>
            ✅ Payment successful! Your booking is confirmed. Check your email for details.
          </div>
        )}

        <div style={S.body}>

          {/* ── LEFT column ── */}
          <div>

            {/* Room */}
            <div style={S.card}>
              <div style={S.cardHeader}><p style={S.cardHeaderTitle}>🏠 Room</p></div>
              <div style={S.cardBody}>
                <div style={S.roomRow}>
                  {room.images?.[0]
                    ? <img src={room.images[0]} alt={`Room ${room.roomNumber}`} style={S.roomImg}/>
                    : <div style={S.roomPlaceholder}>🏨</div>
                  }
                  <div>
                    <p style={S.roomName}>
                      Room {room.roomNumber ?? '—'}
                      {room.roomType && <span style={S.typeBadge}>{room.roomType}</span>}
                    </p>
                    <div style={S.roomMeta}>
                      {room.maxOccupancy  && <span>👥 Up to {room.maxOccupancy} guests</span>}
                      {room.floor         && <span>🏢 Floor {room.floor}</span>}
                      {room.pricePerNight && <span>💵 ${room.pricePerNight} / night</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stay details */}
            <div style={S.card}>
              <div style={S.cardHeader}><p style={S.cardHeaderTitle}>📅 Stay Details</p></div>
              <div style={S.cardBody}>
                <div style={S.infoGrid}>
                  {Object.entries({
                    'Check-in':     fmt(booking.checkInDate),
                    'Check-out':    fmt(booking.checkOutDate),
                    'Duration':     `${nights} night${nights !== 1 ? 's' : ''}`,
                    'Guests':       booking.numberOfGuests ? `${booking.numberOfGuests} guest${booking.numberOfGuests !== 1 ? 's' : ''}` : '—',
                    'Booked on':    fmt(booking.createdAt),
                    'Last updated': fmt(booking.updatedAt),
                  }).map(([label, val]) => (
                    <div key={label} style={S.infoItem}>
                      <span style={S.infoLabel}>{label}</span>
                      <span style={S.infoVal}>{val}</span>
                    </div>
                  ))}
                </div>
                {booking.notes && (
                  <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: '#f8fafc', borderRadius: '10px', fontSize: '0.85rem', color: '#475569' }}>
                    📝 <strong>Notes:</strong> {booking.notes}
                  </div>
                )}
              </div>
            </div>

            {/* Cost breakdown */}
            <div style={S.card}>
              <div style={S.cardHeader}><p style={S.cardHeaderTitle}>💳 Cost Breakdown</p></div>
              <div style={S.cardBody}>
                <table style={S.costTable}>
                  <tbody>
                    {/* Room subtotal */}
                    <tr>
                      <td style={S.costTd}>
                        🏨 Room charge
                        <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginTop: '1px' }}>
                          ${pricePerNight.toFixed(2)} × {nights} night{nights !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td style={S.costTdRight}>${subtotal.toFixed(2)}</td>
                    </tr>

                    {/* Service charges — always show, muted if 0 */}
                    <tr>
                      <td style={{ ...S.costTd, color: svcCharge > 0 ? '#475569' : '#cbd5e1' }}>
                        🛎️ Service charges
                        {/* {svcCharge === 0 && (
                          <span style={{ display: 'block', fontSize: '0.72rem', color: '#cbd5e1', marginTop: '1px' }}>
                            No extra services added
                          </span>
                        )} */}
                      </td>
                      <td style={{ ...S.costTdRight, color: svcCharge > 0 ? '#475569' : '#cbd5e1' }}>
                        {amountDue > 0 ? `$${amountDue.toFixed(2)}` : '—'}
                      </td>
                    </tr>

                    {/* Tax */}
                    <tr>
                      <td style={S.costTd}>
                        🧾 Tax &amp; fees
                        <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginTop: '1px' }}>
                          {(TAX_RATE * 100).toFixed(0)}% GST on subtotal
                        </span>
                      </td>
                      <td style={S.costTdRight}>${taxAmt.toFixed(2)}</td>
                    </tr>

                    {/* Divider + Total */}
                    <tr>
                      <td colSpan={2} style={{ padding: '4px 0' }}>
                        <div style={{ borderTop: '1.5px dashed #e2e8f0' }} />
                      </td>
                    </tr>
                    <tr>
                      <td style={S.costTotalTd}>
                        <strong>Total</strong>
                        {!paid && (
                          <span style={{ marginLeft: '8px', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: '#fef9c3', color: '#a16207' }}>
                            UNPAID
                          </span>
                        )}
                      </td>
                      <td style={S.costTotalTdRight}><strong>${total.toFixed(2)}</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── RIGHT sidebar ── */}
          <div>
            {/* Payment status pill */}
            <div style={S.paymentBox(paid)}>
              <span style={S.paymentIcon}>{paid ? '✅' : '⏳'}</span>
              <div>
                <p style={S.paymentLabel}>Payment Status</p>
                <p style={S.paymentVal(paid)}>{paid ? 'Paid in Full' : 'Pending Payment'}</p>
                {booking.paymentMethod && (
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '2px 0 0', textTransform: 'capitalize' }}>
                    via {booking.paymentMethod}
                  </p>
                )}
              </div>
            </div>

            {/* Payment breakdown card — mirrors InvoicePage layout */}
            <div style={S.payBreakCard}>
              <div style={S.payBreakHead}>💳 Payment Breakdown</div>
              <div style={S.payBreakBody}>

                {/* Line items */}
                <div style={S.payBreakRow}>
                  <span>🏨 Room charge</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div style={{ ...S.payBreakRow, color: svcCharge > 0 ? '#475569' : '#cbd5e1' }}>
                  <span>🛎️ Service charges</span>
                  <span>{amountDue > 0 ? `$${amountDue.toFixed(2)}` : '—'}</span>
                </div>
                <div style={S.payBreakRow}>
                  <span>🧾 Tax ({(TAX_RATE * 100).toFixed(0)}%)</span>
                  <span>${taxAmt.toFixed(2)}</span>
                </div>

                <div style={S.payBreakDiv} />

                {/* Total */}
                <div style={S.payBreakTotal}>
                  <span>Total Bill</span>
                  <span>${total.toFixed(2)}</span>
                </div>

                <div style={S.payBreakDiv} />

                {/* Paid / Due */}
                <div style={S.payBreakPaid}>
                  <span>✅ Amount Paid</span>
                  <span>${paidAmt.toFixed(2)}</span>
                </div>
                {amountDue > 0 && (
                  <div style={S.payBreakDue}>
                    <span>⏳ Amount Due</span>
                    <span>${amountDue.toFixed(2)}</span>
                  </div>
                )}
                {fullyPaid && (
                  <div style={{ ...S.payBreakRow, color: '#16a34a', fontSize: '0.78rem', marginTop: '2px' }}>
                    <span>🎉 Fully paid — no outstanding balance</span>
                  </div>
                )}
              </div>
            </div>

            {/* View Invoice */}
            <button style={S.viewInvoiceBtn} onClick={() => navigate(`/bookings/${id}/invoice`)}>
              🧾 View Invoice
            </button>

            {/* Pay Remaining — only when there is an outstanding balance */}
            {!fullyPaid && remainingAmt > 0 && (
              <button
                style={{ ...S.viewInvoiceBtn, background: 'linear-gradient(135deg,#6366f1,#818cf8)', color: '#fff', border: 'none', marginBottom: '0.5rem' }}
                onClick={() => navigate('/payment', { state: { booking, amountDue: remainingAmt } })}
              >
                💳 Pay Remaining ${remainingAmt.toFixed(2)}
              </button>
            )}

            {/* Cancel */}
            {canCancel && (
              <button
                style={{ ...S.cancelBtn, ...(cancelling ? S.cancelBtnDisabled : {}) }}
                onClick={() => setShowConfirm(true)}
                disabled={cancelling}
              >
                🚫 Cancel Booking
              </button>
            )}
            {!canCancel && (
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', textAlign: 'center', marginTop: '0.5rem' }}>
                This booking can no longer be cancelled.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Confirm cancel modal */}
      {showConfirm && (
        <div style={S.backdrop} onClick={(e) => { if (e.target === e.currentTarget) setShowConfirm(false); }}>
          <div style={S.modalBox}>
            <div style={S.modalIcon}>🚫</div>
            <h2 style={S.modalTitle}>Cancel this booking?</h2>
            <p style={S.modalText}>This action cannot be undone. Your booking will be marked as cancelled.</p>
            <div style={S.modalActions}>
              <button style={S.modalCancel} onClick={() => setShowConfirm(false)} disabled={cancelling}>Keep it</button>
              <button
                style={{ ...S.modalConfirm, ...(cancelling ? { opacity: 0.6, cursor: 'not-allowed' } : {}) }}
                onClick={handleCancel}
                disabled={cancelling}
              >
                {cancelling ? <><span style={S.smallSpinner}/> Cancelling…</> : 'Yes, cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BookingDetailPage;
