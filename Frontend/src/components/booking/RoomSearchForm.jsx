// src/components/booking/RoomSearchForm.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Step 1 of the Booking & Payment workflow.
// Renders a search form, dispatches fetchAvailableRooms, and displays the
// results as selectable cards. Calls onSelectRoom({ room, checkInDate,
// checkOutDate }) when the user clicks "Book Now" on a result.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchAvailableRooms,
  selectAvailableRooms,
  selectRoomLoading,
  selectRoomError,
  clearRoomError,
  clearAvailableRooms,
} from '../../store/slices/roomSlice';

// ── Date helpers ──────────────────────────────────────────────────────────────
const toDateStr = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

const ROOM_TYPES = ['', 'single', 'double', 'suite', 'deluxe', 'penthouse'];

// ─────────────────────────────────────────────────────────────────────────────
const RoomSearchForm = ({ onSelectRoom }) => {
  const dispatch       = useDispatch();
  const availableRooms = useSelector((s) => {
    const v = selectAvailableRooms(s);
    return Array.isArray(v) ? v : [];
  });
  const loading        = useSelector(selectRoomLoading);
  const error          = useSelector(selectRoomError);

  const [filters, setFilters] = useState({
    checkInDate:  toDateStr(0),
    checkOutDate: toDateStr(1),
    roomType:     '',
    minPrice:     '',
    maxPrice:     '',
    maxOccupancy: '',
  });
  const [searched, setSearched] = useState(false);

  // ── Derived — number of nights between the chosen dates ──────────────────
  const nights = (() => {
    const diff = Math.round(
      (new Date(filters.checkOutDate) - new Date(filters.checkInDate)) /
        (1000 * 60 * 60 * 24)
    );
    return diff > 0 ? diff : 0;
  })();

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleChange = (e) => {
    dispatch(clearRoomError());
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    dispatch(clearAvailableRooms());
    dispatch(fetchAvailableRooms(filters));
    setSearched(true);
  };

  const handleReset = () => {
    setFilters({
      checkInDate:  toDateStr(0),
      checkOutDate: toDateStr(1),
      roomType:     '',
      minPrice:     '',
      maxPrice:     '',
      maxOccupancy: '',
    });
    dispatch(clearAvailableRooms());
    dispatch(clearRoomError());
    setSearched(false);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="room-search">

      {/* ── Search Form ───────────────────────────────────────────────── */}
      <form className="room-search__form" onSubmit={handleSearch} noValidate>
        <h2 className="room-search__title">Find Available Rooms</h2>

        {/* Dates row */}
        <div className="room-search__dates">
          <div className="form-group">
            <label htmlFor="rs-checkIn">Check-in</label>
            <input
              id="rs-checkIn"
              type="date"
              name="checkInDate"
              value={filters.checkInDate}
              min={toDateStr(0)}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="rs-checkOut">Check-out</label>
            <input
              id="rs-checkOut"
              type="date"
              name="checkOutDate"
              value={filters.checkOutDate}
              min={filters.checkInDate || toDateStr(1)}
              onChange={handleChange}
              required
            />
          </div>

          {nights > 0 && (
            <span className="room-search__nights">
              {nights} night{nights !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Optional filters row */}
        <div className="room-search__filters">
          <div className="form-group">
            <label htmlFor="rs-roomType">Room Type</label>
            <select
              id="rs-roomType"
              name="roomType"
              value={filters.roomType}
              onChange={handleChange}
            >
              {ROOM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Any'}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="rs-minPrice">Min $</label>
            <input
              id="rs-minPrice"
              type="number"
              name="minPrice"
              min="0"
              value={filters.minPrice}
              onChange={handleChange}
              placeholder="0"
            />
          </div>

          <div className="form-group">
            <label htmlFor="rs-maxPrice">Max $</label>
            <input
              id="rs-maxPrice"
              type="number"
              name="maxPrice"
              min="0"
              value={filters.maxPrice}
              onChange={handleChange}
              placeholder="Any"
            />
          </div>

          <div className="form-group">
            <label htmlFor="rs-occupancy">Guests</label>
            <input
              id="rs-occupancy"
              type="number"
              name="maxOccupancy"
              min="1"
              value={filters.maxOccupancy}
              onChange={handleChange}
              placeholder="Any"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="form-error" role="alert">{error}</p>
        )}

        <div className="room-search__actions">
          <button
            type="submit"
            className="btn btn--primary"
            disabled={loading || !filters.checkInDate || !filters.checkOutDate}
          >
            {loading ? 'Searching…' : 'Search Rooms'}
          </button>

          {searched && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={handleReset}
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {/* ── Results ───────────────────────────────────────────────────── */}
      {searched && !loading && (
        <section className="room-search__results" aria-live="polite">
          <h3 className="room-search__results-heading">
            {availableRooms.length > 0
              ? `${availableRooms.length} room${availableRooms.length !== 1 ? 's' : ''} available`
              : 'No rooms match your search. Try adjusting the filters.'}
          </h3>

          <div className="room-cards">
            {availableRooms.map((room) => (
              <RoomCard
                key={room._id ?? room.id}
                room={room}
                nights={nights}
                checkInDate={filters.checkInDate}
                checkOutDate={filters.checkOutDate}
                onSelect={onSelectRoom}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

// ── RoomCard (file-private sub-component) ─────────────────────────────────────
const RoomCard = ({ room, nights, checkInDate, checkOutDate, onSelect }) => {
  const estimate = nights > 0 ? (room.pricePerNight * nights).toFixed(2) : null;

  return (
    <article className="room-card">
      {room.images?.[0] && (
        <img
          className="room-card__image"
          src={room.images[0]}
          alt={`Room ${room.roomNumber}`}
          loading="lazy"
        />
      )}

      <div className="room-card__body">
        <div className="room-card__header">
          <h4 className="room-card__title">
            Room {room.roomNumber}
            <span className="room-card__type">{room.roomType}</span>
          </h4>
          <span className={`badge badge--${room.status}`}>{room.status}</span>
        </div>

        <p className="room-card__occupancy">
          Up to {room.maxOccupancy} guest{room.maxOccupancy !== 1 ? 's' : ''}
        </p>

        {room.description && (
          <p className="room-card__description">{room.description}</p>
        )}

        {room.amenities?.length > 0 && (
          <ul className="room-card__amenities">
            {room.amenities.slice(0, 5).map((a) => (
              <li key={a}>{a}</li>
            ))}
            {room.amenities.length > 5 && (
              <li>+{room.amenities.length - 5} more</li>
            )}
          </ul>
        )}

        <div className="room-card__pricing">
          <span className="room-card__price">
            ${room.pricePerNight}
            <small>/night</small>
          </span>
          {estimate && (
            <span className="room-card__total">
              ≈ ${estimate} total
            </span>
          )}
        </div>

        <button
          className="btn btn--primary room-card__cta"
          onClick={() => onSelect({ room, checkInDate, checkOutDate })}
        >
          Book Now
        </button>
      </div>
    </article>
  );
};

export default RoomSearchForm;
