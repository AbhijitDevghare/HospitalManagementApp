// src/components/booking/BookingConfirmation.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Step 4 — success screen shown after processPayment resolves.
// Displays booking reference, payment receipt and a "Return to Dashboard" CTA.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { useNavigate } from 'react-router-dom';

const BookingConfirmation = ({ booking, payment }) => {
  const navigate = useNavigate();

  return (
    <div className="booking-confirmation">
      {/* Success icon */}
      <div className="booking-confirmation__icon" aria-hidden="true">✓</div>

      <h2 className="booking-confirmation__title">Booking Confirmed!</h2>
      <p className="booking-confirmation__subtitle">
        Your reservation is confirmed. A receipt has been sent to your email.
      </p>

      {/* ── Booking details ─────────────────────────────────────────────── */}
      <section className="confirmation-card">
        <h3>Booking Details</h3>
        <dl className="confirmation-card__list">
          <dt>Booking ID</dt>
          <dd><code>{booking._id ?? booking.id}</code></dd>

          <dt>Room</dt>
          <dd>
            {booking.roomId?.roomNumber
              ? `Room ${booking.roomId.roomNumber} (${booking.roomId.roomType})`
              : booking.roomId}
          </dd>

          <dt>Check-in</dt>
          <dd>{booking.checkInDate?.slice(0, 10)}</dd>

          <dt>Check-out</dt>
          <dd>{booking.checkOutDate?.slice(0, 10)}</dd>

          <dt>Status</dt>
          <dd>
            <span className={`badge badge--${booking.bookingStatus}`}>
              {booking.bookingStatus}
            </span>
          </dd>
        </dl>
      </section>

      {/* ── Payment receipt ──────────────────────────────────────────────── */}
      {payment && (
        <section className="confirmation-card confirmation-card--payment">
          <h3>Payment Receipt</h3>
          <dl className="confirmation-card__list">
            <dt>Payment ID</dt>
            <dd><code>{payment._id ?? payment.id}</code></dd>

            <dt>Amount Paid</dt>
            <dd>${Number(payment.paymentAmount ?? 0).toFixed(2)}</dd>

            <dt>Method</dt>
            <dd>
              {(payment.paymentMethod ?? '').replace(/_/g, ' ')
                .replace(/\b\w/g, (c) => c.toUpperCase())}
            </dd>

            {payment.transactionId && (
              <>
                <dt>Transaction ID</dt>
                <dd><code>{payment.transactionId}</code></dd>
              </>
            )}

            <dt>Payment Status</dt>
            <dd>
              <span className={`badge badge--${payment.paymentStatus}`}>
                {payment.paymentStatus}
              </span>
            </dd>
          </dl>
        </section>
      )}

      {/* ── Actions ──────────────────────────────────────────────────────── */}
      <div className="booking-confirmation__actions">
        <button
          className="btn btn--primary"
          onClick={() => navigate('/dashboard')}
        >
          Go to Dashboard
        </button>
        <button
          className="btn btn--ghost"
          onClick={() => navigate('/bookings')}
        >
          View My Bookings
        </button>
      </div>
    </div>
  );
};

export default BookingConfirmation;
