import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  createBooking,
  selectBookingLoading,
  selectBookingError,
  clearBookingError,
} from '../../store/slices/bookingSlice';

const calcNights = (ci, co) =>
  Math.max(0, Math.round((new Date(co) - new Date(ci)) / 86400000));

const classifyError = (msg = '') => {
  if (!msg) return { type: 'generic', text: '' };
  const lower = msg.toLowerCase();
  if (lower.includes('maintenance'))
    return { type: 'maintenance', text: msg };
  if (lower.includes('not available') || lower.includes('already booked'))
    return { type: 'conflict', text: msg };
  return { type: 'generic', text: msg };
};

const BookingForm = ({ room, checkInDate, checkOutDate, onSuccess, onBack }) => {
  const dispatch = useDispatch();
  const loading  = useSelector(selectBookingLoading);
  const error    = useSelector(selectBookingError);

  const [numberOfGuests, setGuests] = useState(1);
  const [serviceCharges, setSvc] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const nights    = calcNights(checkInDate, checkOutDate);
  const roomTotal = room.pricePerNight * nights;
  const svcTotal  = Number(serviceCharges || 0);

  // ✅ GST calculation (12%)
  const subtotal  = roomTotal + svcTotal;
  const tax       = subtotal * 0.12;
  const grandEst  = subtotal + tax;

  useEffect(() => () => dispatch(clearBookingError()), [dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    dispatch(clearBookingError());

    const result = await dispatch(
      createBooking({
        roomId: room._id ?? room.id,
        checkInDate,
        checkOutDate,
        numberOfGuests: Number(numberOfGuests),
        serviceCharges: svcTotal,
        totalAmount: Number(grandEst.toFixed(2)), // ✅ send GST-inclusive total
      })
    );

    if (createBooking.fulfilled.match(result)) {
      onSuccess(result.payload);
    }
  };

  const errInfo = classifyError(submitted ? error : '');

  return (
    <div className="booking-form">

      {onBack && (
        <button type="button" className="btn btn--ghost booking-form__back" onClick={onBack}>
          ← Back
        </button>
      )}

      <h2 className="booking-form__title">Complete Your Booking</h2>

      <div className="booking-form__room-snap">
        {room.images?.[0] && (
          <img src={room.images[0]} alt={`Room ${room.roomNumber}`} className="booking-form__room-img" />
        )}
        <div className="booking-form__room-info">
          <h3>
            Room {room.roomNumber}
            <span className="badge badge--type">{room.roomType}</span>
          </h3>
          <p>
            {checkInDate} → {checkOutDate}
            <span> ({nights} night{nights !== 1 ? 's' : ''})</span>
          </p>
          <p>${room.pricePerNight}/night</p>
        </div>
      </div>

      {errInfo.text && (
        <div className="alert alert--error">
          {errInfo.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>

        <div className="form-group">
          <label>Number of Guests (max {room.maxOccupancy})</label>
          <input
            type="number"
            min="1"
            max={room.maxOccupancy}
            value={numberOfGuests}
            onChange={(e) => setGuests(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Extra Service Charges ($)</label>
          <input
            type="number"
            min="0"
            value={serviceCharges}
            onChange={(e) => setSvc(e.target.value)}
            placeholder="0"
          />
        </div>

        {/* ✅ Updated Cost Breakdown */}
        <div className="booking-form__estimate">
          <span>Room ({nights} nights)</span>
          <span>${roomTotal.toFixed(2)}</span>

          {svcTotal > 0 && (
            <>
              <span>Service charges</span>
              <span>${svcTotal.toFixed(2)}</span>
            </>
          )}

          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>

          <span>GST (12%)</span>
          <span>${tax.toFixed(2)}</span>

          <span className="booking-form__estimate-total">Total (incl. GST)</span>
          <span className="booking-form__estimate-total">
            ${grandEst.toFixed(2)}
          </span>
        </div>

        <button
          type="submit"
          className="btn btn--primary btn--full"
          disabled={loading || nights < 1}
        >
          {loading ? 'Creating Booking…' : 'Confirm & Proceed to Payment'}
        </button>

      </form>
    </div>
  );
};

export default BookingForm;