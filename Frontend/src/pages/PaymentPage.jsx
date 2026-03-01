// src/pages/PaymentPage.jsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate }   from 'react-router-dom';
import { useDispatch, useSelector }   from 'react-redux';
import {
  processPayment,
  selectCurrentPayment,
  selectPaymentLoading,
  selectPaymentError,
  clearPaymentError,
} from '../store/slices/paymentSlice';
import { selectCurrentBooking } from '../store/slices/bookingSlice';
import { generateTransactionId } from '../utils/generateTransactionId';

const PAYMENT_METHODS = [
  { value: 'card',          label: '💳 Credit / Debit Card', hint: 'Visa, Mastercard, Amex' },
  { value: 'UPI',           label: '📱 UPI',                 hint: 'GPay, PhonePe, Paytm'  },
  { value: 'bank_transfer', label: '🏦 Bank Transfer',       hint: 'NEFT / RTGS / IMPS'    },
  { value: 'cash',          label: '💵 Cash',                hint: 'Pay at front desk'      },
];

const S = {
  page:       { minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Segoe UI',sans-serif", color: '#1e293b' },
  hero:       { background: 'linear-gradient(135deg,#1e293b 0%,#334155 100%)', color: '#fff', padding: '2rem 2rem 1.75rem' },
  heroInner:  { maxWidth: '900px', margin: '0 auto' },
  backBtn:    { display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '8px', padding: '6px 14px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', marginBottom: '1rem' },
  heroTitle:  { fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.2rem' },
  heroSub:    { fontSize: '0.82rem', color: '#94a3b8', margin: 0 },
  body:       { maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem', display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem', alignItems: 'start' },
  // Summary card
  sumCard:    { background: '#fff', borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden', position: 'sticky', top: '1.5rem' },
  sumHead:    { padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8' },
  sumBody:    { padding: '1.25rem' },
  sumRow:     { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '7px 0', borderBottom: '1px solid #f8fafc', fontSize: '0.84rem' },
  sumKey:     { color: '#64748b', fontWeight: 500 },
  sumVal:     { color: '#1e293b', fontWeight: 600, textAlign: 'right', maxWidth: '160px', wordBreak: 'break-all' },
  amtBox:     { background: 'linear-gradient(135deg,#eef2ff,#e0e7ff)', borderRadius: '12px', padding: '1rem', textAlign: 'center', marginTop: '1rem' },
  amtLabel:   { fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6366f1', margin: '0 0 4px' },
  amtValue:   { fontSize: '2rem', fontWeight: 800, color: '#4338ca', margin: 0 },
  amtSub:     { fontSize: '0.72rem', color: '#818cf8', margin: '3px 0 0' },
  // Payment form card
  formCard:   { background: '#fff', borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' },
  formHead:   { padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9' },
  formTitle:  { fontSize: '1rem', fontWeight: 800, margin: 0, color: '#1e293b' },
  formSub:    { fontSize: '0.78rem', color: '#94a3b8', margin: '3px 0 0' },
  formBody:   { padding: '1.5rem' },
  // Method grid
  methodGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' },
  methodCard: (active) => ({
    padding: '0.875rem 1rem', borderRadius: '12px', cursor: 'pointer', textAlign: 'left',
    border: `2px solid ${active ? '#6366f1' : '#e2e8f0'}`,
    background: active ? '#eef2ff' : '#fff',
    boxShadow: active ? '0 0 0 1px #6366f1' : '0 1px 3px rgba(0,0,0,0.05)',
    transition: 'all 0.15s', position: 'relative',
  }),
  methodLabel:{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '2px' },
  methodHint: { fontSize: '0.7rem', color: '#94a3b8' },
  methodCheck:{ position: 'absolute', top: '8px', right: '8px', width: '18px', height: '18px', borderRadius: '50%', background: '#6366f1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 900 },
  // Tx ref row
  formGroup:  { marginBottom: '1.25rem' },
  label:      { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' },
  hint:       { fontSize: '0.72rem', color: '#94a3b8', fontWeight: 400 },
  inputWrap:  { display: 'flex', gap: '8px', alignItems: 'center' },
  input:      { flex: 1, padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.875rem', color: '#475569', background: '#f8fafc', outline: 'none', fontFamily: 'monospace' },
  regenBtn:   { padding: '10px 14px', background: '#f1f5f9', border: '1.5px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', fontSize: '1rem', color: '#475569', fontWeight: 700 },
  // Error
  errBox:     { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '12px 16px', marginBottom: '1.25rem', color: '#dc2626', fontSize: '0.875rem', display: 'flex', alignItems: 'flex-start', gap: '10px' },
  errClose:   { marginLeft: 'auto', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 700, flexShrink: 0 },
  // Pay button
  payBtn:     { width: '100%', padding: '14px', background: 'linear-gradient(135deg,#6366f1,#818cf8)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', letterSpacing: '0.01em', marginTop: '0.25rem' },
  payBtnDis:  { opacity: 0.6, cursor: 'not-allowed' },
  payNote:    { fontSize: '0.72rem', color: '#94a3b8', textAlign: 'center', marginTop: '8px' },
  spinner:    { width: '16px', height: '16px', border: '2.5px solid rgba(255,255,255,0.3)', borderTop: '2.5px solid #fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' },
  // Security badge row
  secRow:     { display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '1rem', flexWrap: 'wrap' },
  secBadge:   { fontSize: '0.7rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' },
};

const PaymentPage = () => {
  const location       = useLocation();
  const navigate       = useNavigate();
  const dispatch       = useDispatch();

  const stateBooking   = location.state?.booking;
  const reduxBooking   = useSelector(selectCurrentBooking);
  const booking        = stateBooking ?? reduxBooking;

  const currentPayment = useSelector(selectCurrentPayment);
  const loading        = useSelector(selectPaymentLoading);
  const error          = useSelector(selectPaymentError);

  const [paymentMethod, setMethod]    = useState('card');
  const [submitted,     setSubmitted] = useState(false);
  const [txRef,         setTxRef]     = useState(() => generateTransactionId('card'));

  useEffect(() => { setTxRef(generateTransactionId(paymentMethod)); }, [paymentMethod]);
  useEffect(() => () => dispatch(clearPaymentError()), [dispatch]);

  useEffect(() => {
    if (!booking && !loading) navigate('/bookings', { replace: true });
  }, [booking, loading, navigate]);

  useEffect(() => {
    if (currentPayment && submitted) {
      navigate(`/bookings/${booking?._id ?? booking?.id}`, {
        replace: true,
        state: { paymentSuccess: true },
      });
    }
  }, [currentPayment, submitted, booking, navigate]);

  if (!booking) return null;

  const total     = booking.totalAmount ?? booking.totalBill ?? 0;
  const bookingId = booking._id ?? booking.id;
  const status    = booking.status ?? booking.bookingStatus ?? 'pending';

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    dispatch(clearPaymentError());
    dispatch(processPayment({ bookingId, paymentAmount: total, paymentMethod, transactionId: txRef }));
  };

  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
      <div style={S.page}>

        {/* ── Hero ── */}
        <div style={S.hero}>
          <div style={S.heroInner}>
            <button style={S.backBtn} onClick={() => navigate(-1)}>← Back</button>
            <h1 style={S.heroTitle}>💳 Complete Your Payment</h1>
            <p style={S.heroSub}>Booking #{bookingId}</p>
          </div>
        </div>

        <div style={S.body}>

          {/* ── LEFT: Booking Summary ── */}
          <aside>
            <div style={S.sumCard}>
              <div style={S.sumHead}>📋 Booking Summary</div>
              <div style={S.sumBody}>
                {[
                  ['Booking ID',  bookingId],
                  ['Check-in',    booking.checkInDate?.slice(0, 10)   ?? '—'],
                  ['Check-out',   booking.checkOutDate?.slice(0, 10)  ?? '—'],
                  ['Room',        booking.room?.roomNumber ? `Room ${booking.room.roomNumber}` : '—'],
                  ['Guests',      booking.numberOfGuests ?? '—'],
                  ['Status',      status],
                ].map(([k, v]) => (
                  <div key={k} style={S.sumRow}>
                    <span style={S.sumKey}>{k}</span>
                    <span style={S.sumVal}>{v}</span>
                  </div>
                ))}
                <div style={S.amtBox}>
                  <p style={S.amtLabel}>Amount Due</p>
                  <p style={S.amtValue}>${Number(total).toFixed(2)}</p>
                  <p style={S.amtSub}>incl. tax & charges</p>
                </div>
              </div>
            </div>
          </aside>

          {/* ── RIGHT: Payment Form ── */}
          <section>
            <div style={S.formCard}>
              <div style={S.formHead}>
                <h2 style={S.formTitle}>Payment Details</h2>
                <p style={S.formSub}>Choose your preferred payment method</p>
              </div>
              <div style={S.formBody}>

                {/* Error */}
                {error && submitted && (
                  <div style={S.errBox} role="alert">
                    <span>⚠️</span>
                    <div><strong>Payment Failed</strong><br />{error}</div>
                    <button style={S.errClose} onClick={() => dispatch(clearPaymentError())}>✕</button>
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate>

                  {/* Method selector */}
                  <div style={S.methodGrid}>
                    {PAYMENT_METHODS.map((m) => {
                      const active = paymentMethod === m.value;
                      return (
                        <button
                          key={m.value}
                          type="button"
                          style={S.methodCard(active)}
                          onClick={() => { setMethod(m.value); dispatch(clearPaymentError()); setSubmitted(false); }}
                        >
                          {active && <span style={S.methodCheck}>✓</span>}
                          <span style={S.methodLabel}>{m.label}</span>
                          <span style={S.methodHint}>{m.hint}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Transaction reference */}
                  <div style={S.formGroup}>
                    <label style={S.label}>
                      Transaction Reference
                      <span style={S.hint}> — auto-generated</span>
                    </label>
                    <div style={S.inputWrap}>
                      <input
                        type="text"
                        value={txRef}
                        readOnly
                        style={S.input}
                        aria-label="Auto-generated transaction reference"
                      />
                      <button
                        type="button"
                        style={S.regenBtn}
                        onClick={() => setTxRef(generateTransactionId(paymentMethod))}
                        title="Regenerate reference"
                      >↺</button>
                    </div>
                  </div>

                  {/* Pay button */}
                  <button
                    type="submit"
                    style={{ ...S.payBtn, ...(loading ? S.payBtnDis : {}) }}
                    disabled={loading}
                  >
                    {loading
                      ? <><span style={S.spinner} /> Processing…</>
                      : `Pay $${Number(total).toFixed(2)}`
                    }
                  </button>
                  <p style={S.payNote}>You will be redirected to your booking confirmation after payment.</p>

                  {/* Security badges */}
                  <div style={S.secRow}>
                    {['🔒 Secure Payment', '🛡️ Data Encrypted', '✅ Instant Confirmation'].map((b) => (
                      <span key={b} style={S.secBadge}>{b}</span>
                    ))}
                  </div>
                </form>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default PaymentPage;
