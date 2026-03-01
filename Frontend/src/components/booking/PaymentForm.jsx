// src/components/booking/PaymentForm.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Step 3 of the Booking & Payment workflow.
// Receives the confirmed booking, collects payment details, and dispatches
// processPayment. On success it calls onPaymentComplete(payment).
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  processPayment,
  selectCurrentPayment,
  selectPaymentLoading,
  selectPaymentError,
  clearPaymentError,
} from '../../store/slices/paymentSlice';

const PAYMENT_METHODS = ['credit_card', 'debit_card', 'cash', 'bank_transfer', 'upi'];

// ─────────────────────────────────────────────────────────────────────────────
const PaymentForm = ({ booking, onPaymentComplete, onBack }) => {
  const dispatch        = useDispatch();
  const currentPayment  = useSelector(selectCurrentPayment);
  const loading         = useSelector(selectPaymentLoading);
  const error           = useSelector(selectPaymentError);

  const [form, setForm]       = useState({
    paymentMethod: 'credit_card',
    transactionId: '',
  });
  const [submitted, setSubmitted] = useState(false);

  // Clear error on unmount
  useEffect(() => {
    return () => { dispatch(clearPaymentError()); };
  }, [dispatch]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleChange = (e) => {
    dispatch(clearPaymentError());
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);

    const resultAction = await dispatch(
      processPayment({
        bookingId:     booking._id ?? booking.id,
        paymentAmount: booking.totalAmount ?? booking.totalBill,
        paymentMethod: form.paymentMethod,
        transactionId: form.transactionId || undefined,
      })
    );

    if (processPayment.fulfilled.match(resultAction)) {
      onPaymentComplete(resultAction.payload);
    }
  };

  // ── Total to display ──────────────────────────────────────────────────────
  const total = booking.totalAmount ?? booking.totalBill ?? 0;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="payment-form">
      <button
        type="button"
        className="btn btn--ghost payment-form__back"
        onClick={onBack}
      >
        ← Back
      </button>

      <h2 className="payment-form__title">Complete Payment</h2>

      {/* ── Booking reference ─────────────────────────────────────────── */}
      <div className="payment-form__booking-ref">
        <p>
          <strong>Booking ID:</strong>{' '}
          <code>{booking._id ?? booking.id}</code>
        </p>
        <p>
          <strong>Amount Due:</strong>{' '}
          <span className="payment-form__amount">${Number(total).toFixed(2)}</span>
        </p>
        <p>
          <strong>Check-in:</strong> {booking.checkInDate?.slice(0, 10)}
          &nbsp;→&nbsp;
          <strong>Check-out:</strong> {booking.checkOutDate?.slice(0, 10)}
        </p>
      </div>

      {/* ── Payment form ──────────────────────────────────────────────── */}
      <form className="payment-form__form" onSubmit={handleSubmit} noValidate>

        {/* Payment method */}
        <div className="form-group">
          <label htmlFor="pf-method">Payment Method</label>
          <select
            id="pf-method"
            name="paymentMethod"
            value={form.paymentMethod}
            onChange={handleChange}
            required
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        {/* Transaction ID — required for non-cash methods */}
        {form.paymentMethod !== 'cash' && (
          <div className="form-group">
            <label htmlFor="pf-txId">
              Transaction / Reference ID
              <small> — from your bank or payment gateway</small>
            </label>
            <input
              id="pf-txId"
              type="text"
              name="transactionId"
              value={form.transactionId}
              onChange={handleChange}
              placeholder="e.g. TXN-20240601-XXXX"
              required={form.paymentMethod !== 'cash'}
            />
          </div>
        )}

        {/* Error */}
        {error && submitted && (
          <p className="form-error" role="alert">{error}</p>
        )}

        <button
          type="submit"
          className="btn btn--primary payment-form__submit"
          disabled={
            loading ||
            (form.paymentMethod !== 'cash' && !form.transactionId.trim())
          }
        >
          {loading ? 'Processing…' : `Pay $${Number(total).toFixed(2)}`}
        </button>
      </form>
    </div>
  );
};

export default PaymentForm;
