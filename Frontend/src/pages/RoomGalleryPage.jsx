// src/pages/RoomGalleryPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Guest-facing room search page.
// Dispatches fetchAvailableRooms with date + roomType filters and renders
// results as cards. Navigates to /rooms/:id when a card is clicked.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector }   from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  fetchAvailableRooms,
  fetchAllRooms,
  selectAvailableRooms,
  selectRooms,
  selectRoomLoading,
  selectRoomError,
  clearAvailableRooms,
  clearRoomError,
} from '../store/slices/roomSlice';

// ── Helpers ───────────────────────────────────────────────────────────────────
const toDateStr = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

const calcNights = (ci, co) => {
  const diff = Math.round((new Date(co) - new Date(ci)) / 86_400_000);
  return diff > 0 ? diff : 0;
};

const ROOM_TYPES = ['', 'single', 'double', 'suite', 'deluxe', 'penthouse'];

// ─────────────────────────────────────────────────────────────────────────────
const RoomGalleryPage = () => {
  const dispatch       = useDispatch();
  const navigate       = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialise from URL query params so sharing / back-navigation works
  const [form, setForm] = useState({
    checkInDate:  searchParams.get('checkIn')  || toDateStr(0),
    checkOutDate: searchParams.get('checkOut') || toDateStr(1),
    roomType:     searchParams.get('type')     || '',
  });
  const [searched, setSearched] = useState(false);

  const availableRooms = useSelector((s) => {
    const v = selectAvailableRooms(s);
    return Array.isArray(v) ? v : [];
  });
  const allRooms = useSelector((s) => {
    const v = selectRooms(s);
    return Array.isArray(v) ? v : [];
  });
  const loading        = useSelector(selectRoomLoading);
  const error          = useSelector(selectRoomError);

  const nights = calcNights(form.checkInDate, form.checkOutDate);

  // ── On first mou
  // nt: load all rooms as a visual "catalogue" ────────────────
  useEffect(() => {
    dispatch(fetchAllRooms({ status: 'available' }));
    return () => {
      dispatch(clearAvailableRooms());
      dispatch(clearRoomError());
    };
  }, [dispatch]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleChange = (e) => {
    dispatch(clearRoomError());
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (nights < 1) return;
    // Sync filters into URL so the browser back button restores the search
    setSearchParams({
      checkIn:  form.checkInDate,
      checkOut: form.checkOutDate,
      ...(form.roomType && { type: form.roomType }),
    });
    dispatch(clearAvailableRooms());
    dispatch(fetchAvailableRooms(form));
    setSearched(true);
  };

  const handleClear = () => {
    setForm({ checkInDate: toDateStr(0), checkOutDate: toDateStr(1), roomType: '' });
    dispatch(clearAvailableRooms());
    dispatch(clearRoomError());
    setSearchParams({});
    setSearched(false);
  };

  const handleCardClick = (roomId) => {
    // Carry dates in URL so RoomDetailPage can pre-fill its availability check
    navigate(
      `/rooms/${roomId}?checkIn=${form.checkInDate}&checkOut=${form.checkOutDate}`
    );
  };

  // Show available rooms after a search, otherwise the full catalogue
  const displayRooms = Array.isArray(searched ? availableRooms : allRooms)
    ? (searched ? availableRooms : allRooms)
    : [];


  // ─────────────────────────────────────────────────────────────────────────
  return (
    <main className="gallery-page">
      {/* ── Hero search bar ───────────────────────────────────────────── */}
      <section className="gallery-page__hero">
        <h1 className="gallery-page__hero-title">Find Your Perfect Room</h1>
        <p className="gallery-page__hero-sub">
          Choose your dates and let us handle the rest.
        </p>

        <form
          className="gallery-page__search-bar"
          onSubmit={handleSearch}
          noValidate
          aria-label="Room search"
        >
          {/* Check-in */}
          <div className="search-bar__field">
            <label htmlFor="gal-ci">Check-in</label>
            <input
              id="gal-ci"
              type="date"
              name="checkInDate"
              value={form.checkInDate}
              min={toDateStr(0)}
              onChange={handleChange}
              required
            />
          </div>

          {/* Check-out */}
          <div className="search-bar__field">
            <label htmlFor="gal-co">Check-out</label>
            <input
              id="gal-co"
              type="date"
              name="checkOutDate"
              value={form.checkOutDate}
              min={form.checkInDate || toDateStr(1)}
              onChange={handleChange}
              required
            />
          </div>

          {/* Room type */}
          <div className="search-bar__field">
            <label htmlFor="gal-type">Room Type</label>
            <select
              id="gal-type"
              name="roomType"
              value={form.roomType}
              onChange={handleChange}
            >
              {ROOM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Any Type'}
                </option>
              ))}
            </select>
          </div>

          <div className="search-bar__actions">
            <button
              type="submit"
              className="btn btn--primary"
              disabled={loading || nights < 1}
            >
              {loading ? 'Searching…' : 'Search'}
            </button>
            {searched && (
              <button type="button" className="btn btn--ghost" onClick={handleClear}>
                Clear
              </button>
            )}
          </div>
        </form>

        {nights > 0 && (
          <p className="gallery-page__nights-badge">
            {nights} night{nights !== 1 ? 's' : ''} selected
          </p>
        )}
      </section>

      {/* ── Error ─────────────────────────────────────────────────────── */}
      {error && (
        <p className="page-error" role="alert">{error}</p>
      )}

      {/* ── Results heading ───────────────────────────────────────────── */}
      <section className="gallery-page__results" aria-live="polite">
        {searched && !loading && (
          <h2 className="gallery-page__results-heading">
            
                {console.log("ROOOMS : ",availableRooms)}

            
            {availableRooms.length > 0
              ? `${availableRooms.length} room${availableRooms.length !== 1 ? 's' : ''} available for your dates`
              : 'No rooms found for those dates. Try adjusting your search.'}
          </h2>
        )}

        {!searched && (
          <h2 className="gallery-page__results-heading">Our Rooms</h2>
        )}

        {/* ── Room card grid ───────────────────────────────────────────── */}
        <div className="room-gallery">
          {displayRooms.map((room) => (
            <RoomCard
              key={room._id ?? room.id}
              room={room}
              nights={searched ? nights : null}
              onClick={() => handleCardClick(room._id ?? room.id)}
            />
          ))}

          {loading && (
            <div className="room-gallery__skeleton-grid">
              {[1, 2, 3].map((n) => <SkeletonCard key={n} />)}
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

// ── RoomCard ──────────────────────────────────────────────────────────────────
const RoomCard = ({ room, nights, onClick }) => {
  const total = nights && nights > 0
    ? (room.pricePerNight * nights).toFixed(2)
    : null;

  return (
    <article className="room-card" onClick={onClick} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      aria-label={`View details for room ${room.roomNumber}`}
    >
      <div className="room-card__img-wrap">
        {room.images?.[0]
          ? <img src={`http://localhost:5000${room.images[0].url}`} alt={`Room ${room.roomNumber}`} loading="lazy" className="room-card__img" />
          : <div className="room-card__img-placeholder" aria-hidden="true">🏨</div>
        }
        <span className={`room-card__type-badge room-card__type-badge--${room.roomType}`}>
          {room.roomType}
        </span>
      </div>

      <div className="room-card__body">
        <h3 className="room-card__title">Room {room.roomNumber}</h3>

        <p className="room-card__meta">
          <span>👥 Up to {room.maxOccupancy}</span>
        </p>
       <span
            className={`absolute top-3 left-10 px-3 py-1 text-xs font-semibold rounded-full text-white capitalize shadow-md
              ${
                room.status === "available"
                  ? "bg-green-600"
                  : room.status === "booked"
                  ? "bg-blue-600"
                  : "bg-yellow-500"
              }`}
          >
            {room.status}
          </span>

        {room.amenities?.length > 0 && (
          <ul className="room-card__amenities">
            {room.amenities.slice(0, 3).map((a) => <li key={a}>{a}</li>)}
            {room.amenities.length > 3 && <li>+{room.amenities.length - 3} more</li>}
          </ul>
        )}

        <div className="room-card__pricing">
          <span className="room-card__price">
            ${room.pricePerNight}<small>/night</small>
          </span>
          {total && (
            <span className="room-card__total">≈ ${total} total</span>
          )}
        </div>

        <button className="btn btn--primary btn--full room-card__cta" tabIndex={-1}>
          View Details
        </button>
      </div>
    </article>
  );
};

// ── SkeletonCard ──────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="room-card room-card--skeleton" aria-hidden="true">
    <div className="room-card__img-wrap skeleton-block" />
    <div className="room-card__body">
      <div className="skeleton-line skeleton-line--title" />
      <div className="skeleton-line skeleton-line--short" />
      <div className="skeleton-line skeleton-line--med" />
    </div>
  </div>
);

export default RoomGalleryPage;
