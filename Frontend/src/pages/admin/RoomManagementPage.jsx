// src/pages/admin/RoomManagementPage.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector }                from 'react-redux';
import {
  fetchAllRooms, deleteRoom,
  selectRooms, selectRoomLoading, selectRoomError, clearRoomError,
} from '../../store/slices/roomSlice';
import RoomFormModal      from '../../components/admin/RoomFormModal';
import RoomStatusToggle   from '../../components/admin/RoomStatusToggle';
import AvailabilityChecker from '../../components/admin/AvailabilityChecker';

// ── helpers ───────────────────────────────────────────────────────────────────
const STATUS_BADGE = {
  available:   'badge--success',
  booked:      'badge--info',
  maintenance: 'badge--warning',
};

const fmt = (n) => `$${Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

// ── Delete confirm modal ──────────────────────────────────────────────────────
const DeleteConfirm = ({ room, onConfirm, onCancel, busy }) => (
  <div className="modal-backdrop"
    onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
    <div className="modal modal--sm" role="dialog" aria-modal="true">
      <header className="modal__header">
        <h2 className="modal__title">🗑️ Delete Room</h2>
        <button className="modal__close" onClick={onCancel}>✕</button>
      </header>
      <div className="modal__body">
        <p className="text-sm text-slate-700">
          Permanently delete <strong>Room {room.roomNumber}</strong>?
        </p>
        <div className="alert alert--error">
          <span className="alert__icon">⚠️</span>
          <span>
            The room record <em>and all uploaded image files</em> will be
            removed from the server. This cannot be undone.
          </span>
        </div>
      </div>
      <footer className="modal__footer">
        <button className="btn btn--ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button className="btn btn--danger" onClick={onConfirm}
          disabled={busy} aria-busy={busy}>
          {busy
            ? <><span className="hms-spinner hms-spinner--sm" aria-hidden="true" /> Deleting…</>
            : 'Yes, Delete Permanently'}
        </button>
      </footer>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
const RoomManagementPage = () => {
  const dispatch  = useDispatch();
  const rooms     = useSelector(selectRooms);
  const loading   = useSelector(selectRoomLoading);
  const error     = useSelector(selectRoomError);

  /* ── local UI state ── */
  const [search,      setSearch]      = useState('');
  const [typeFilter,  setTypeFilter]  = useState('');
  const [statusFilter,setStatusFilter]= useState('');
  const [formRoom,    setFormRoom]    = useState(undefined); // undefined=closed, null=add, obj=edit
  const [deleteTarget,setDeleteTarget]= useState(null);
  const [deleting,    setDeleting]    = useState(false);
  const [toast,       setToast]       = useState(null);
  const [expandedId,  setExpandedId]  = useState(null);   // row with avail checker open

  useEffect(() => {
    dispatch(fetchAllRooms());
  }, [dispatch]);

  const pushToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  /* ── delete flow ── */
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await dispatch(deleteRoom(deleteTarget._id ?? deleteTarget.id));
    setDeleting(false);
    setDeleteTarget(null);
    if (deleteRoom.fulfilled.match(result)) {
      /* success fires only after backend confirms record + images are gone */
      pushToast(`Room ${deleteTarget.roomNumber} deleted and images unlinked.`);
    }
    /* error surfaces via selectRoomError */
  }, [dispatch, deleteTarget]);

  /* ── in-place status update from RoomStatusToggle ── */
  const handleStatusUpdated = useCallback((updatedRoom) => {
    pushToast(`Room ${updatedRoom.roomNumber} status → ${updatedRoom.status}.`);
    /* roomSlice already patched the room in state.rooms via updateRoomStatus.fulfilled */
  }, []);


  

  /* ── derived data ── */
  const allRooms = Array.isArray(rooms) ? rooms : [];
  const types    = [...new Set(allRooms.map((r) => r.roomType).filter(Boolean))];

  const filtered = allRooms.filter((r) => {
    if (typeFilter   && r.roomType !== typeFilter)   return false;
    if (statusFilter && r.status   !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !String(r.roomNumber ?? '').toLowerCase().includes(q) &&
        !(r.roomType ?? '').toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  const counts = {
    available:   allRooms.filter((r) => r.status === 'available').length,
    booked:      allRooms.filter((r) => r.status === 'booked').length,
    maintenance: allRooms.filter((r) => r.status === 'maintenance').length,
  };

  return (
    <main className="admin-page" aria-labelledby="rmp-title">

      {/* ── Toast ── */}
      {toast && (
        <div className={`toast toast--${toast.type} fixed top-4 right-4 z-50 w-80`}
          role="status" aria-live="polite">
          <span className="toast__body">{toast.msg}</span>
          <button className="toast__close" onClick={() => setToast(null)}
            aria-label="Dismiss">✕</button>
        </div>
      )}

      {/* ── Header ── */}
      <div className="admin-page__header">
        <h1 id="rmp-title" className="admin-page__title">🏨 Room Management</h1>
        <div className="action-group">
          <button className="btn btn--ghost btn--sm"
            onClick={() => dispatch(fetchAllRooms())} disabled={loading}>
            {loading ? '…' : '↺ Refresh'}
          </button>
          <button className="btn btn--primary" onClick={() => setFormRoom(null)}>
            + Add Room
          </button>
        </div>
      </div>

      {/* ── API Error banner ── */}
      {error && (
        <div className="alert alert--error" role="alert">
          <span className="alert__icon">⚠️</span>
          <span>
            {error.includes('429') || error.toLowerCase().includes('too many')
              ? 'Rate limit reached — please wait before uploading more images.'
              : error}
          </span>
          <button className="alert__close"
            onClick={() => dispatch(clearRoomError())}
            aria-label="Dismiss">✕</button>
        </div>
      )}

      {/* ── Stats bar ── */}
      <div className="stats-bar">
        <div className="stat-card stat-card--neutral">
          <span className="stat-card__icon">🏨</span>
          <span className="stat-card__value">{allRooms.length}</span>
          <span className="stat-card__label">Total Rooms</span>
        </div>
        <div className="stat-card stat-card--success">
          <span className="stat-card__icon">✅</span>
          <span className="stat-card__value">{counts.available}</span>
          <span className="stat-card__label">Available</span>
        </div>
        <div className="stat-card stat-card--info">
          <span className="stat-card__icon">📅</span>
          <span className="stat-card__value">{counts.booked}</span>
          <span className="stat-card__label">Booked</span>
        </div>
        <div className="stat-card stat-card--warning">
          <span className="stat-card__icon">🔧</span>
          <span className="stat-card__value">{counts.maintenance}</span>
          <span className="stat-card__label">Maintenance</span>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="filter-bar">
        <input type="search" value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search room number or type…"
          className="w-48" aria-label="Search rooms" />

        <div className="form-group form-group--inline">
          <label htmlFor="rmp-type">Type</label>
          <select id="rmp-type" value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All types</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group form-group--inline">
          <label htmlFor="rmp-status">Status</label>
          <select id="rmp-status" value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="available">Available</option>
            <option value="booked">Booked</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>

        {(search || typeFilter || statusFilter) && (
          <button className="btn btn--ghost btn--sm"
            onClick={() => { setSearch(''); setTypeFilter(''); setStatusFilter(''); }}>
            Clear
          </button>
        )}
        <span className="filter-bar__count">
          {filtered.length} room{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Room table ── */}
      {filtered.length === 0 && !loading
        ? <p className="page-empty">No rooms match the current filters.</p>
        : (
          <div className="table-wrapper">
            <table className="data-table data-table--full" aria-label="Rooms">
              <thead>
                <tr>
                  <th>Room</th>
                  <th>Type</th>
                  <th>Price / Night</th>
                  <th>Occupancy</th>
                  <th>Status</th>
                  <th>Availability Check</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((room) => {
                  const id  = room._id ?? room.id;
                  const img = room.images?.[0];

                  return (
                    <React.Fragment key={id}>
                      <tr className={
                        room.status === 'maintenance'
                          ? 'data-table__row--alert'
                          : room.status === 'booked'
                            ? 'data-table__row--in-progress'
                            : ''
                      }>
                        {/* Room cell */}
                        <td>
                          <div className="rmp-room-cell">
                            {img
                              ? <img src={img} alt={`Room ${room.roomNumber}`}
                                  className="rmp-room-thumb" />
                              : <div className="rmp-room-thumb--placeholder">🛏️</div>}
                            <div>
                              <p className="font-semibold text-slate-800">
                                Room {room.roomNumber}
                              </p>
                              {room.floor != null && (
                                <p className="text-xs text-slate-400">
                                  Floor {room.floor}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Type */}
                        <td>
                          <span className="badge badge--type capitalize">
                            {room.roomType ?? '—'}
                          </span>
                        </td>

                        {/* Price */}
                        <td className="font-mono font-semibold text-brand-700">
                          {fmt(room.pricePerNight)}
                        </td>

                        {/* Occupancy */}
                        <td className="text-slate-600 text-sm">
                          👤 {room.maxOccupancy ?? '—'}
                        </td>

                        {/* Status toggle */}
                        <td>
                          <RoomStatusToggle
                            room={room}
                            onUpdated={handleStatusUpdated}
                          />
                        </td>

                        {/* Availability checker toggle */}
                        <td>
                          <AvailabilityChecker room={room} />
                        </td>

                        {/* Actions */}
                        <td>
                          <div className="action-group">
                            <button className="btn btn--ghost btn--sm"
                              onClick={() => setFormRoom(room)}
                              aria-label={`Edit room ${room.roomNumber}`}>
                              ✏️ Edit
                            </button>
                            <button className="btn btn--danger btn--sm"
                              onClick={() => setDeleteTarget(room)}
                              disabled={room.status === 'booked'}
                              title={room.status === 'booked'
                                ? 'Cannot delete a booked room'
                                : 'Delete room and images'}
                              aria-label={`Delete room ${room.roomNumber}`}>
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Amenities sub-row */}
                      {Array.isArray(room.amenities) && room.amenities.length > 0 && (
                        <tr className="bg-slate-50/50">
                          <td colSpan={7} className="px-4 py-1.5">
                            <ul className="room-card__amenities">
                              {room.amenities.map((a) => (
                                <li key={a}>{a}</li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      {/* ── Add / Edit modal ── */}
      {formRoom !== undefined && (
        <RoomFormModal
          room={formRoom}
          onClose={() => setFormRoom(undefined)}
          onSuccess={(saved) => {
            setFormRoom(undefined);
            dispatch(fetchAllRooms());
            pushToast(
              formRoom
                ? `Room ${saved.roomNumber} updated.`
                : `Room ${saved.roomNumber} created.`
            );
          }}
        />
      )}

      {/* ── Delete confirm ── */}
      {deleteTarget && (
        <DeleteConfirm
          room={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          busy={deleting}
        />
      )}
    </main>
  );
};

export default RoomManagementPage;
