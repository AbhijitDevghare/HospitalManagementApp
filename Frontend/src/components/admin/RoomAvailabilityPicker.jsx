// src/components/admin/RoomAvailabilityPicker.jsx
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchAvailableRooms,
  selectAvailableRooms,
  selectRoomLoading,
} from '../../store/slices/roomSlice';

const TYPE_ICONS = { single: '🛏️', double: '🛏️🛏️', suite: '👑', deluxe: '✨', family: '👨‍👩‍👧' };

const S = {
  wrap:        { position: 'relative' },
  // Filter bar
  filterBar:   { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.875rem', flexWrap: 'wrap' },
  filterBtn:   (active) => ({
    padding: '5px 14px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
    border: `1.5px solid ${active ? '#6366f1' : '#e2e8f0'}`,
    background: active ? '#eef2ff' : '#fff',
    color: active ? '#6366f1' : '#64748b',
    transition: 'all 0.15s',
  }),
  countBadge:  { marginLeft: 'auto', fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 },
  // Scroll container — key improvement
  scroll:      {
    maxHeight: '460px',
    overflowY: 'auto',
    overflowX: 'hidden',
    paddingRight: '6px',
    scrollbarWidth: 'thin',
    scrollbarColor: '#c7d2fe #f1f5f9',
  },
  // Single-column list
  list:        { display: 'flex', flexDirection: 'column', gap: '0.625rem', listStyle: 'none', margin: 0, padding: 0 },
  // Card — horizontal layout
  card:        (selected, disabled) => ({
    width: '100%', textAlign: 'left', border: `1.5px solid ${selected ? '#6366f1' : '#e2e8f0'}`,
    padding: 0, cursor: disabled ? 'not-allowed' : 'pointer',
    borderRadius: '12px', overflow: 'hidden', background: selected ? '#fafafe' : '#fff',
    boxShadow: selected ? '0 0 0 1.5px #6366f1, 0 3px 12px rgba(99,102,241,0.12)' : '0 1px 3px rgba(0,0,0,0.06)',
    opacity: disabled ? 0.5 : 1,
    transition: 'border-color 0.15s, box-shadow 0.15s',
    display: 'flex',
    position: 'relative',
  }),
  // Left image strip
  imgWrap:     { position: 'relative', flexShrink: 0, width: '110px', minHeight: '88px', background: 'linear-gradient(135deg,#e0e7ff,#c7d2fe)', overflow: 'hidden' },
  img:         { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  imgPH:       { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', minHeight: '88px' },
  // Status pill
  statusPill:  (color, bg) => ({
    position: 'absolute', bottom: '6px', left: '6px',
    background: bg, color, fontSize: '0.6rem', fontWeight: 700,
    padding: '2px 7px', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.05em',
    whiteSpace: 'nowrap',
  }),
  // Selected checkmark over image
  selCheck:    { position: 'absolute', top: '6px', right: '6px', width: '20px', height: '20px', borderRadius: '50%', background: '#6366f1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 900, boxShadow: '0 2px 6px rgba(99,102,241,0.5)' },
  // Card body
  body:        { flex: 1, padding: '0.75rem 0.9rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '3px', minWidth: 0 },
  topRow:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  roomNum:     { fontWeight: 800, fontSize: '0.9rem', color: '#1e293b' },
  price:       { fontWeight: 700, fontSize: '0.88rem', color: '#6366f1', whiteSpace: 'nowrap' },
  typeBadge:   { display: 'inline-block', fontSize: '0.62rem', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: '#f1f5f9', color: '#475569', textTransform: 'capitalize' },
  metaRow:     { display: 'flex', gap: '10px', fontSize: '0.72rem', color: '#94a3b8', alignItems: 'center', flexWrap: 'wrap' },
  amenities:   { fontSize: '0.68rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  blockMsg:    { fontSize: '0.7rem', color: '#ef4444', fontWeight: 600 },
  // Empty / loading
  placeholder: { textAlign: 'center', padding: '2.5rem 1rem', color: '#94a3b8', fontSize: '0.875rem', background: '#f8fafc', borderRadius: '12px', border: '1.5px dashed #e2e8f0' },
  placeholderIcon: { fontSize: '2rem', marginBottom: '0.5rem' },
  // Selected summary strip
  summary:     { marginTop: '0.75rem', background: 'linear-gradient(135deg,#eef2ff,#f0fdf4)', border: '1.5px solid #c7d2fe', borderRadius: '10px', padding: '0.6rem 0.875rem', fontSize: '0.8rem', fontWeight: 600, color: '#4338ca', display: 'flex', alignItems: 'center', gap: '8px' },
  fieldErr:    { fontSize: '0.72rem', color: '#ef4444', marginTop: '6px' },
};

const STATUS_CFG = {
  available:   { label: 'Available',   bg: '#dcfce7', color: '#16a34a' },
  booked:      { label: 'Booked',      bg: '#fef9c3', color: '#a16207' },
  maintenance: { label: 'Maintenance', bg: '#fee2e2', color: '#dc2626' },
};

const RoomAvailabilityPicker = ({ checkIn, checkOut, value, onChange, error }) => {
  const dispatch = useDispatch();
  const rooms    = useSelector(selectAvailableRooms);
  const loading  = useSelector(selectRoomLoading);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (checkIn && checkOut && checkIn < checkOut) {
      dispatch(fetchAvailableRooms({ checkInDate: checkIn, checkOutDate: checkOut }));
    }
  }, [dispatch, checkIn, checkOut]);

  const allRooms = Array.isArray(rooms) ? rooms : [];

  // Guard states
  if (!checkIn || !checkOut) return (
    <div style={S.placeholder}><div style={S.placeholderIcon}>📅</div>Select check-in and check-out dates first.</div>
  );
  if (checkIn >= checkOut) return (
    <div style={S.placeholder}><div style={S.placeholderIcon}>⚠️</div>Check-out must be after check-in.</div>
  );
  if (loading) return (
    <div style={S.placeholder}>
      <div style={{ ...S.placeholderIcon, fontSize: '1rem' }}>
        <span style={{ display: 'inline-block', width: '22px', height: '22px', border: '2.5px solid #e2e8f0', borderTop: '2.5px solid #6366f1', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      </div>
      Checking room availability…
    </div>
  );
  if (allRooms.length === 0) return (
    <div style={S.placeholder}><div style={S.placeholderIcon}>😔</div>No rooms found for these dates.</div>
  );

  // Filter types
  const types       = ['all', ...new Set(allRooms.map((r) => r.type ?? r.roomType).filter(Boolean))];
  const filtered    = filter === 'all' ? allRooms : allRooms.filter((r) => (r.type ?? r.roomType) === filter);
  const availCount  = allRooms.filter((r) => r.status === 'available').length;

  return (
    <div style={S.wrap}>
      {/* ── Filter tabs ── */}
      <div style={S.filterBar}>
        {types.map((t) => (
          <button key={t} type="button" style={S.filterBtn(filter === t)} onClick={() => setFilter(t)}>
            {t === 'all' ? 'All types' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
        <span style={S.countBadge}>{availCount} available</span>
      </div>

      {/* ── Scrollable grid ── */}
      <div style={S.scroll}>
        <ul style={S.list} role="radiogroup" aria-label="Select a room">
          {filtered.map((room) => {
            const id            = room._id ?? room.id;
            const isMaintenance = room.status === 'maintenance';
            const isBooked      = room.status === 'booked';
            const isDisabled    = isMaintenance || isBooked;
            const isSelected    = (value?._id ?? value?.id) === id;
            const st            = STATUS_CFG[room.status] ?? STATUS_CFG.available;
            const imgSrc        = room.images?.[0]?.url
              ? `http://localhost:5000${room.images[0].url}`
              : room.images?.[0] ?? null;

            return (
              <li key={id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-disabled={isDisabled}
                  disabled={isDisabled}
                  onClick={() => !isDisabled && onChange(room)}
                  style={S.card(isSelected, isDisabled)}
                >
                  {/* Image / placeholder */}
                  <div style={S.imgWrap}>
                    {imgSrc
                      ? <img src={imgSrc} alt={`Room ${room.roomNumber}`} style={S.img} loading="lazy" />
                      : <div style={S.imgPH}>{TYPE_ICONS[room.type ?? room.roomType] ?? '🏨'}</div>
                    }
                    {/* Status pill */}
                    <span style={S.statusPill(st.color, st.bg)}>{st.label}</span>
                    {/* Selected check */}
                    {isSelected && <span style={S.selCheck}>✓</span>}
                  </div>

                  {/* Body */}
                  <div style={S.body}>
                    <div style={S.topRow}>
                      <span style={S.roomNum}>Room {room.roomNumber}</span>
                      <span style={S.price}>${room.pricePerNight}<small style={{ fontWeight: 500, fontSize: '0.65rem', color: '#94a3b8' }}>/night</small></span>
                    </div>
                    <div style={S.typeBadge}>{room.type ?? room.roomType}</div>
                    <div style={S.metaRow}>
                      {room.floor        && <span>🏢 Fl. {room.floor}</span>}
                      {room.maxOccupancy && <span>👥 {room.maxOccupancy}</span>}
                    </div>
                    {room.amenities?.length > 0 && (
                      <div style={S.amenities}>
                        {room.amenities.slice(0, 3).join(' · ')}{room.amenities.length > 3 ? ` +${room.amenities.length - 3}` : ''}
                      </div>
                    )}
                    {isMaintenance && <div style={S.blockMsg}>🔧 Under maintenance</div>}
                    {isBooked      && <div style={S.blockMsg}>🔒 Booked for these dates</div>}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* ── Selected summary ── */}
      {value && (
        <div style={S.summary}>
          ✅ Room {value.roomNumber} selected &nbsp;·&nbsp;
          {TYPE_ICONS[value.type ?? value.roomType] ?? ''} {value.type ?? value.roomType} &nbsp;·&nbsp;
          ${value.pricePerNight}/night
        </div>
      )}

      {error && <p style={S.fieldErr}>{error}</p>}
    </div>
  );
};

export default RoomAvailabilityPicker;
