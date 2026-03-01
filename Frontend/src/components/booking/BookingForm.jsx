// src/components/booking/BookingForm.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Collects numberOfGuests (+ optional serviceCharges) and dispatches
// createBooking. Surfaces the maintenanceGuard 403 error inline.
// On success calls onSuccess(booking) so the parent can route to payment.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector }   from 'react-redux';
import {
  createBooking,
  selectBookingLoading,
  selectBookingError,
  clearBookingError,
} from '../../store/slices/bookingSlice';

// ── Helpers ───────────────────────────────────────────────────────────────────
const calcNights = (ci, co) =>
  Math.max(0, Math.round((new Date(co) - new Date(ci)) / 86_400_000));

// Classify the backend error string so we can render maintenance errors
// with a distinct style vs generic validation errors.
const classifyError = (msg = '') => {
  if (!msg) return { type: 'generic', text: '' };
  const lower = msg.toLowerCase();
  if (lower.includes('maintenance'))
    return { type: 'maintenance', text: msg };
  if (lower.includes('not available') || lower.includes('already booked'))
    return { type: 'conflict', text: msg };
  return { type: 'generic', text: msg };
};

// ─────────────────────────────────────────────────────────────────────────────
const BookingForm = ({ room, checkInDate, checkOutDate, onSuccess, onBack }) => {
  const dispatch      = useDispatch();
  const loading       = useSelector(selectBookingLoading);
  const error         = useSelector(selectBookingError);

  const [numberOfGuests,  setGuests]   = useState(1);
  const [serviceCharges,  setSvc]      = useState(0);
  const [submitted,       setSubmitted] = useState(false);

  const nights    = calcNights(checkInDate, checkOutDate);
  const roomTotal = room.pricePerNight * nights;
  const grandEst  = roomTotal + Number(serviceCharges || 0);

  // Clear stale error on unmount
  useEffect(() => () => dispatch(clearBookingError()), [dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    dispatch(clearBookingError());

    const result = await dispatch(
      createBooking({
        roomId:         room._id ?? room.id,
        checkInDate,
        checkOutDate,
        numberOfGuests: Number(numberOfGuests),
        serviceCharges: Number(serviceCharges) || 0,
      })
    );

    if (createBooking.fulfilled.match(result)) {
      onSuccess(result.payload);
    }
  };

  const errInfo = classifyError(submitted ? error : '');

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="booking-form">
      {onBack && (
        <button type="button" className="btn btn--ghost booking-form__back" onClick={onBack}>
          ← Back
        </button>
      )}

      <h2 className="booking-form__title">Complete Your Booking</h2>

      {/* ── Room snapshot ─────────────────────────────────────────────── */}
      <div className="booking-form__room-snap">
        {room.images?.[0] && (
          <img src={room.images[0]} alt={`Room ${room.roomNumber}`} className="booking-form__room-img" />
        )}
        <div className="booking-form__room-info">
          <h3>Room {room.roomNumber} <span className="badge badge--type">{room.roomType}</span></h3>
          <p>{checkInDate} → {checkOutDate}
            <span className="booking-form__nights"> ({nights} night{nights !== 1 ? 's' : ''})</span>
          </p>
          <p className="booking-form__rate">${room.pricePerNight}/night</p>
        </div>
      </div>

      {/* ── Error banners ─────────────────────────────────────────────── */}
      {errInfo.type === 'maintenance' && (
        <div className="alert alert--maintenance" role="alert">
          <span className="alert__icon" aria-hidden="true">🔧</span>
          <div>
            <strong>Room Unavailable — Under Maintenance</strong>
            <p>{errInfo.text}</p>
            <p>Please select a different room or check back later.</p>
          </div>
        </div>
      )}

      {errInfo.type === 'conflict' && (
        <div className="alert alert--conflict" role="alert">
          <span className="alert__icon" aria-hidden="true">📅</span>
          <div>
            <strong>Date Conflict</strong>
            <p>{errInfo.text}</p>
          </div>
        </div>
      )}

      {errInfo.type === 'generic' && errInfo.text && (
        <div className="alert alert--error" role="alert">
          <span className="alert__icon" aria-hidden="true">⚠️</span>
          <p>{errInfo.text}</p>
        </div>
      )}

      {/* ── Booking form ──────────────────────────────────────────────── */}
      <form className="booking-form__fields" onSubmit={handleSubmit} noValidate>

        {/* Number of guests */}
        <div className="form-group">
          <label htmlFor="bf-guests">
            Number of Guests
            <span className="form-group__hint"> (max {room.maxOccupancy})</span>
          </label>
          <input
            id="bf-guests"
            type="number"
            min="1"
            max={room.maxOccupancy}
            value={numberOfGuests}
            onChange={(e) => {
              dispatch(clearBookingError());
              setSubmitted(false);
              setGuests(e.target.value);
            }}
            required
          />
          {submitted && (Number(numberOfGuests) < 1 || Number(numberOfGuests) > room.maxOccupancy) && (
            <span className="form-group__error-msg" role="alert">
              Guests must be between 1 and {room.maxOccupancy}.
            </span>
          )}
        </div>

        {/* Service charges */}
        <div className="form-group">
          <label htmlFor="bf-svc">
            Extra Service Charges ($)
            <small> — laundry, parking, etc. (optional)</small>
          </label>
          <input
            id="bf-svc"
            type="number"
            min="0"
            value={serviceCharges}
            onChange={(e) => {
              dispatch(clearBookingError());
              setSvc(e.target.value);
            }}
            placeholder="0"
          />
        </div>

        {/* Cost estimate */}
        <div className="booking-form__estimate">
          <span>Room ({nights} nights)</span>
          <span>${roomTotal.toFixed(2)}</span>
          {Number(serviceCharges) > 0 && (
            <>
              <span>Service charges</span>
              <span>${Number(serviceCharges).toFixed(2)}</span>
            </>
          )}
          <span className="booking-form__estimate-total">Estimated Total (excl. tax)</span>
          <span className="booking-form__estimate-total">${grandEst.toFixed(2)}</span>
        </div>

        <button
          type="submit"
          className="btn btn--primary btn--full"
          disabled={loading || nights < 1}
          aria-busy={loading}
        >
          {loading ? (
            <><span className="hms-spinner hms-spinner--sm" aria-hidden="true" /> Creating Booking…</>
          ) : (
            'Confirm & Proceed to Payment'
          )}
        </button>
      </form>
    </div>
  );
};

export default BookingForm;
