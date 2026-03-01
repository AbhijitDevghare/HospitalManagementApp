// src/pages/RoomDetailPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Shows full room details (all images, amenities, description).
// Has a date picker that calls checkSpecificRoomAvailability and shows
// an 'Available' or 'Already Booked' badge.
// Opens PriceBreakdownModal before dispatching createBooking.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector }                from 'react-redux';
import {
  fetchRoomById,
  checkSpecificRoomAvailability,
  selectCurrentRoom,
  selectAvailabilityStatus,
  selectRoomLoading,
  selectRoomError,
  clearAvailabilityStatus,
  clearCurrentRoom,
  clearRoomError,
} from '../store/slices/roomSlice';
import { selectIsAuthenticated } from '../store/slices/authSlice';
import PriceBreakdownModal from '../components/booking/PriceBreakdownModal';

// ── Helpers ───────────────────────────────────────────────────────────────────
const toDateStr = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};
const calcNights = (ci, co) =>
  Math.max(0, Math.round((new Date(co) - new Date(ci)) / 86_400_000));

// ─────────────────────────────────────────────────────────────────────────────
const RoomDetailPage = () => {
  const { id }                        = useParams();
  const [searchParams]                = useSearchParams();
  const dispatch                      = useDispatch();
  const navigate                      = useNavigate();

  const room               = useSelector(selectCurrentRoom);
  const availability       = useSelector(selectAvailabilityStatus);
  const roomLoading        = useSelector(selectRoomLoading);
  const roomError          = useSelector(selectRoomError);
  const isAuthenticated    = useSelector(selectIsAuthenticated);

  // Pre-fill dates from gallery URL params if present
  const [dates, setDates] = useState({
    checkInDate:  searchParams.get('checkIn')  || toDateStr(0),
    checkOutDate: searchParams.get('checkOut') || toDateStr(1),
  });
  const [serviceCharges, setServiceCharges] = useState(0);
  const [activeImg, setActiveImg]           = useState(0);
  const [showModal, setShowModal]           = useState(false);
  const [availChecked, setAvailChecked]     = useState(false);

  const nights = calcNights(dates.checkInDate, dates.checkOutDate);

  // ── Fetch room details on mount ───────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchRoomById(id));
    return () => {
      dispatch(clearCurrentRoom());
      dispatch(clearAvailabilityStatus());
      dispatch(clearRoomError());
    };
  }, [dispatch, id]);

  // ── Check availability ────────────────────────────────────────────────────
  const checkAvailability = useCallback(() => {
    if (nights < 1) return;
    dispatch(clearAvailabilityStatus());
    dispatch(
      checkSpecificRoomAvailability({
        id,
        checkInDate:  dates.checkInDate,
        checkOutDate: dates.checkOutDate,
      })
    );
    setAvailChecked(true);
  }, [dispatch, id, dates, nights]);

  // Auto-check when dates are pre-filled from gallery navigation
  useEffect(() => {
    if (searchParams.get('checkIn') && searchParams.get('checkOut') && nights >= 1) {
      checkAvailability();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ── Date change ───────────────────────────────────────────────────────────
  const handleDateChange = (e) => {
    dispatch(clearAvailabilityStatus());
    dispatch(clearRoomError());
    setAvailChecked(false);
    setDates((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // ── Open modal → user clicks "Book This Room" ─────────────────────────────
  const handleOpenModal = () => {
    if (!isAuthenticated) {
      navigate('/login', {
        state: { from: { pathname: `/rooms/${id}` } },
      });
      return;
    }
    setShowModal(true);
  };

  // ── Confirm booking — navigate to BookingFormPage with context ───────────
  const handleConfirmBooking = () => {
    setShowModal(false);
    navigate('/book', {
      state: {
        room,
        checkInDate:    dates.checkInDate,
        checkOutDate:   dates.checkOutDate,
        serviceCharges: Number(serviceCharges) || 0,
      },
    });
  };

  // ── Availability badge ────────────────────────────────────────────────────
  const AvailabilityBadge = () => {
    if (!availChecked)      return null;
    if (roomLoading)        return <span className="avail-badge avail-badge--checking">Checking…</span>;
    if (roomError)          return <span className="avail-badge avail-badge--error">Check failed</span>;
    if (!availability)      return null;


    return availability.available
      ? <span className="avail-badge avail-badge--available">✓ Room Available</span>
      : <span className="avail-badge avail-badge--unavailable">✗ Already Booked</span>;
  };

  // ── Loading / error skeletons ─────────────────────────────────────────────
  if (roomLoading && !room) {
    return (
      <main className="room-detail room-detail--loading" aria-label="Loading room details">
        <div className="room-detail__skeleton">
          <div className="skeleton-block room-detail__skeleton-hero" />
          <div className="skeleton-line skeleton-line--title" />
          <div className="skeleton-line skeleton-line--med"   />
          <div className="skeleton-line skeleton-line--short" />
        </div>
      </main>
    );
  }

  if (roomError && !room) {
    return (
      <main className="room-detail room-detail--error">
        <p className="page-error" role="alert">{roomError}</p>
        <button className="btn btn--ghost" onClick={() => navigate(-1)}>← Go Back</button>
      </main>
    );
  }

  if (!room) return null;

  const images    = room.images?.length ? room.images : [];
  const canBook   = availability?.available === true;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <main className="room-detail">
        <button className="btn btn--ghost room-detail__back" onClick={() => navigate(-1)}>
          ← Back
        </button>

        {/* ── Image gallery ───────────────────────────────────────────── */}
        <section className="room-detail__gallery" aria-label="Room images">
          {images.length > 0 ? (
            <>
              <img
  className="room-detail__hero-img"
  src={`http://localhost:5000${images[activeImg].url}`}
  alt={`Room ${room.roomNumber} — image ${activeImg + 1} of ${images.length}`}
/>
              {images.length > 1 && (
                <div className="room-detail__thumbnails" role="list">
                  {images.map((img, i) => (
  <button
    key={i}
    className={`room-detail__thumb ${i === activeImg ? 'room-detail__thumb--active' : ''}`}
    onClick={() => setActiveImg(i)}
  >
    <img
      src={`http://localhost:5000${img.url}`}
      alt=""
      loading="lazy"
    />
  </button>
))}
                </div>
              )}
            </>
          ) : (
            <div className="room-detail__no-img" aria-hidden="true">🏨</div>
          )}
        </section>

        <div className="room-detail__content">
          {/* ── Room info ─────────────────────────────────────────────── */}
          <div className="room-detail__info">
            <div className="room-detail__info-header">
              <div>
                <h1 className="room-detail__title">Room {room.roomNumber}</h1>
                <span className={`badge badge--type room-detail__type`}>{room.roomType}</span>
              </div>
              <div className="room-detail__price-block">
                <span className="room-detail__price">
                  ${room.pricePerNight}<small>/night</small>
                </span>
              </div>
            </div>

            <p className="room-detail__occupancy">
              👥 Accommodates up to <strong>{room.maxOccupancy}</strong> guest{room.maxOccupancy !== 1 ? 's' : ''}
            </p>

            {room.description && (
              <p className="room-detail__description">{room.description}</p>
            )}

            {/* Amenities */}
            {room.amenities?.length > 0 && (
              <div className="room-detail__amenities">
                <h2 className="room-detail__section-title">Amenities</h2>
                <ul className="amenities-grid">
                  {room.amenities.map((a) => (
                    <li key={a} className="amenities-grid__item">
                      <span aria-hidden="true">✓</span> {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* ── Availability & booking panel ─────────────────────────── */}
          <aside className="room-detail__booking-panel" aria-label="Availability checker">
            <h2 className="room-detail__section-title">Check Availability</h2>

            {/* Date pickers */}
            <div className="booking-panel__dates">
              <div className="form-group">
                <label htmlFor="rd-ci">Check-in</label>
                <input
                  id="rd-ci"
                  type="date"
                  name="checkInDate"
                  value={dates.checkInDate}
                  min={toDateStr(0)}
                  onChange={handleDateChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="rd-co">Check-out</label>
                <input
                  id="rd-co"
                  type="date"
                  name="checkOutDate"
                  value={dates.checkOutDate}
                  min={dates.checkInDate || toDateStr(1)}
                  onChange={handleDateChange}
                />
              </div>
            </div>

            {nights > 0 && (
              <p className="booking-panel__nights">
                {nights} night{nights !== 1 ? 's' : ''}
                <span className="booking-panel__est">
                  {' '}· est. ${(room.pricePerNight * nights).toFixed(2)}
                </span>
              </p>
            )}

            {/* Optional service charges */}
            <div className="form-group">
              <label htmlFor="rd-svc">
                Extra service charges ($)
                <small> — optional</small>
              </label>
              <input
                id="rd-svc"
                type="number"
                min="0"
                value={serviceCharges}
                onChange={(e) => setServiceCharges(e.target.value)}
                placeholder="0"
              />
            </div>

            {/* Check button */}
            <button
              className="btn btn--ghost btn--full"
              onClick={checkAvailability}
              disabled={roomLoading || nights < 1}
            >
              {roomLoading ? 'Checking…' : 'Check Availability'}
            </button>

            {/* Availability badge */}
            <div className="booking-panel__badge-row" aria-live="polite">
              <AvailabilityBadge />
            </div>

            {/* Booking error */}

            {/* Book button — always visible, gated by availability */}
            <button
              className="btn btn--primary btn--full booking-panel__book-btn"
              onClick={handleOpenModal}
              disabled={availChecked && !canBook}
              title={availChecked && !canBook ? 'This room is not available for the selected dates' : ''}
            >
              {availChecked && !canBook ? 'Not Available' : 'Book This Room'}
            </button>

            {!isAuthenticated && (
              <p className="booking-panel__auth-hint">
                You must <a href="/login">sign in</a> to complete a booking.
              </p>
            )}
          </aside>
        </div>
      </main>

      {/* ── Price Breakdown Modal ────────────────────────────────────── */}
      {showModal && (
        <PriceBreakdownModal
          room={room}
          checkInDate={dates.checkInDate}
          checkOutDate={dates.checkOutDate}
          serviceCharges={Number(serviceCharges) || 0}
          onConfirm={handleConfirmBooking}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
};

export default RoomDetailPage;
