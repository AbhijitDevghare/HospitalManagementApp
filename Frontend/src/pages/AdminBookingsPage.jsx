// filepath: d:\HotelManagementSystem\Frontend\src\pages\AdminBookingsPage.jsx
// src/pages/AdminBookingsPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Admin view — shows ALL bookings across all users.
// Same design as BookingPage but uses fetchAllBookings and surfaces guest info.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector }   from 'react-redux';
import { useNavigate }                from 'react-router-dom';
import {
  fetchAllBookings,
  selectAllBookings,
  selectBookingLoading,
  selectBookingError,
} from '../store/slices/bookingSlice';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (d) => d
  ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
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

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  page:      { minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Segoe UI', sans-serif", color: '#1e293b' },
  hero:      { background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', color: '#fff', padding: '2.5rem 2rem 2rem' },
  heroInner: { maxWidth: '1100px', margin: '0 auto' },
  heroTitle: { fontSize: '1.8rem', fontWeight: 800, margin: '0 0 0.3rem' },
  heroSub:   { fontSize: '0.9rem', color: '#94a3b8', margin: 0 },
  body:      { maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' },
  tabs:      { display: 'flex', gap: '6px', marginBottom: '1.5rem', flexWrap: 'wrap' },
  tab: (active) => ({
    padding: '6px 16px', borderRadius: '999px', border: '1.5px solid',
    borderColor: active ? '#6366f1' : '#e2e8f0',
    background:  active ? '#eef2ff' : '#fff',
    color:       active ? '#6366f1' : '#64748b',
    fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
  }),
  grid: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  card: { background: '#fff', borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden', display: 'flex', transition: 'box-shadow 0.2s' },
  cardAccent: (color) => ({ width: '5px', flexShrink: 0, background: color }),
  cardBody: { flex: 1, padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' },
  cardLeft:  { flex: 1, minWidth: '200px' },
  cardTitle: { fontSize: '1rem', fontWeight: 700, margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  statusBadge: (s) => ({
    fontSize: '0.7rem', fontWeight: 700, padding: '2px 10px', borderRadius: '999px', border: '1px solid',
    borderColor: getStatus(s).border, background: getStatus(s).bg, color: getStatus(s).color,
    textTransform: 'uppercase', letterSpacing: '0.05em',
  }),
  payBadge: (paid) => ({
    fontSize: '0.7rem', fontWeight: 700, padding: '2px 10px', borderRadius: '999px', border: '1px solid',
    borderColor: paid ? '#bbf7d0' : '#fde68a',
    background:  paid ? '#f0fdf4' : '#fffbeb',
    color:       paid ? '#16a34a' : '#d97706',
    textTransform: 'uppercase', letterSpacing: '0.05em',
  }),
  guestRow: { fontSize: '0.8rem', color: '#6366f1', fontWeight: 600, margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: '6px' },
  cardMeta:  { fontSize: '0.82rem', color: '#64748b', display: 'flex', flexWrap: 'wrap', gap: '12px', margin: '0.2rem 0 0' },
  metaItem:  { display: 'flex', alignItems: 'center', gap: '4px' },
  cardRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 },
  totalAmt:  { fontSize: '1.15rem', fontWeight: 800, color: '#6366f1' },
  viewBtn:   { padding: '7px 16px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, color: '#475569', cursor: 'pointer' },
  center:    { textAlign: 'center', padding: '4rem 2rem', color: '#94a3b8' },
  emptyIcon: { fontSize: '3rem', marginBottom: '1rem' },
  emptyTitle:{ fontSize: '1.1rem', fontWeight: 700, color: '#475569', margin: '0 0 0.4rem' },
  emptyText: { fontSize: '0.875rem', margin: 0 },
  spinner:   { width: '36px', height: '36px', margin: '0 auto 1rem', border: '3px solid #e2e8f0', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  errorBox:  { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '1rem 1.25rem', color: '#dc2626', fontSize: '0.875rem', marginBottom: '1.5rem' },
  statsRow:  { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: '1rem', marginBottom: '1.5rem' },
  statCard:  { background: '#fff', borderRadius: '12px', padding: '1rem 1.25rem', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' },
  statVal:   { fontSize: '1.5rem', fontWeight: 800, color: '#6366f1', margin: 0 },
  statLabel: { fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
  // Search bar
  searchWrap: { marginBottom: '1.25rem' },
  searchInput: { width: '100%', padding: '10px 16px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.875rem', color: '#1e293b', outline: 'none', boxSizing: 'border-box' },
};

const FILTERS = ['All', 'Confirmed', 'Pending', 'Completed', 'Cancelled'];

// ─────────────────────────────────────────────────────────────────────────────
const AdminBookingsPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const bookings = useSelector(selectAllBookings);
  const loading  = useSelector(selectBookingLoading);
  const error    = useSelector(selectBookingError);
  const [filter, setFilter]   = useState('All');
  const [search, setSearch]   = useState('');

  useEffect(() => { dispatch(fetchAllBookings()); }, [dispatch]);

  const filtered = (bookings ?? []).filter((b) => {
    const matchFilter = filter === 'All' || b.status?.toLowerCase() === filter.toLowerCase();
    const q = search.toLowerCase();
    const matchSearch = !q
      || (b.room?.roomNumber ?? b.roomNumber ?? '').toString().includes(q)
      || (b.user?.name  ?? '').toLowerCase().includes(q)
      || (b.user?.email ?? '').toLowerCase().includes(q)
      || (b._id ?? b.id ?? '').toString().toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  // Stats
  const total     = bookings?.length ?? 0;
  const confirmed = bookings?.filter((b) => b.status?.toLowerCase() === 'confirmed').length ?? 0;
  const pending   = bookings?.filter((b) => b.status?.toLowerCase() === 'pending').length   ?? 0;
  const revenue   = bookings?.reduce((s, b) => s + Number(b.totalAmount ?? 0), 0) ?? 0;

  return (
    <>
      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>

      <div style={S.page}>

        {/* ── Hero ── */}
        <div style={S.hero}>
          <div style={S.heroInner}>
            <h1 style={S.heroTitle}>📋 All Bookings</h1>
            <p style={S.heroSub}>Admin view — manage every reservation across all guests</p>
          </div>
        </div>

        <div style={S.body}>

          {/* ── Error ── */}
          {error && <div style={S.errorBox}>⚠️ {error}</div>}

          {/* ── Stats ── */}
          {!loading && total > 0 && (
            <div style={S.statsRow}>
              {[
                { label: 'Total Bookings', val: total,     icon: '📋' },
                { label: 'Confirmed',      val: confirmed, icon: '✅' },
                { label: 'Pending',        val: pending,   icon: '⏳' },
                { label: 'Total Revenue',  val: `$${revenue.toLocaleString()}`, icon: '💰' },
              ].map(({ label, val, icon }) => (
                <div key={label} style={S.statCard}>
                  <p style={S.statVal}>{icon} {val}</p>
                  <p style={S.statLabel}>{label}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── Search ── */}
          {!loading && total > 0 && (
            <div style={S.searchWrap}>
              <input
                style={S.searchInput}
                placeholder="🔍  Search by guest name, email, room number or booking ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}

          {/* ── Filter tabs ── */}
          {!loading && total > 0 && (
            <div style={S.tabs}>
              {FILTERS.map((f) => (
                <button key={f} style={S.tab(filter === f)} onClick={() => setFilter(f)}>{f}</button>
              ))}
            </div>
          )}

          {/* ── Loading ── */}
          {loading && (
            <div style={S.center}>
              <div style={S.spinner} />
              <p>Loading all bookings…</p>
            </div>
          )}

          {/* ── Empty ── */}
          {!loading && filtered.length === 0 && (
            <div style={S.center}>
              <div style={S.emptyIcon}>📭</div>
              <p style={S.emptyTitle}>
                {filter === 'All' && !search ? 'No bookings found' : 'No matching bookings'}
              </p>
              <p style={S.emptyText}>Try adjusting your search or filter.</p>
            </div>
          )}

          {/* ── Booking cards ── */}
          {!loading && filtered.length > 0 && (
            <div style={S.grid}>
              {filtered.map((b) => {
                const nights   = calcNights(b.checkInDate, b.checkOutDate);
                const s        = getStatus(b.status);
                const id       = b._id ?? b.id;
                const isPaid   = b.paymentStatus?.toLowerCase() === 'paid' || b.paymentStatus?.toLowerCase() === 'success';
                const guest    = b.user?.name ?? b.guestName ?? '—';
                const email    = b.user?.email ?? '';
                return (
                  <div key={id} style={S.card}>
                    <div style={S.cardAccent(s.color)} />
                    <div style={S.cardBody}>
                      <div style={S.cardLeft}>

                        {/* Guest row — admin only */}
                        <div style={S.guestRow}>
                          👤 {guest}
                          {email && <span style={{ color: '#94a3b8', fontWeight: 400 }}>· {email}</span>}
                        </div>

                        <div style={S.cardTitle}>
                          Room {b.room?.roomNumber ?? b.roomNumber ?? '—'}
                          {b.room?.roomType && (
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>
                              · {b.room.roomType}
                            </span>
                          )}
                          <span style={S.statusBadge(b.status)}>{s.label}</span>
                          <span style={S.payBadge(isPaid)}>
                            {isPaid ? '✅ Paid' : '⏳ Pending'}
                          </span>
                        </div>

                        <div style={S.cardMeta}>
                          <span style={S.metaItem}>📅 {fmt(b.checkInDate)} → {fmt(b.checkOutDate)}</span>
                          {nights > 0 && (
                            <span style={S.metaItem}>🌙 {nights} night{nights !== 1 ? 's' : ''}</span>
                          )}
                          {b.numberOfGuests && (
                            <span style={S.metaItem}>👥 {b.numberOfGuests} guest{b.numberOfGuests !== 1 ? 's' : ''}</span>
                          )}
                          <span style={S.metaItem}>🆔 #{id.toString().slice(-8).toUpperCase()}</span>
                        </div>
                      </div>

                      <div style={S.cardRight}>
                        {b.totalAmount && (
                          <span style={S.totalAmt}>${Number(b.totalAmount).toLocaleString()}</span>
                        )}
                        <button style={S.viewBtn} onClick={() => navigate(`/bookings/${id}`)}>
                          View Details →
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AdminBookingsPage;
