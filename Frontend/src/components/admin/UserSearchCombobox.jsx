// src/components/admin/UserSearchCombobox.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector }                        from 'react-redux';
import { searchUsers, selectUserSearchResults, selectUsersLoading }
  from '../../store/slices/userSlice';

const GUEST_MODE_SENTINEL = '__new_guest__';

const UserSearchCombobox = ({ value, onChange, error }) => {
  const dispatch = useDispatch();
  const results  = useSelector(selectUserSearchResults);
  const loading  = useSelector(selectUsersLoading);

  const [query,      setQuery]      = useState('');
  const [open,       setOpen]       = useState(false);
  const [guestMode,  setGuestMode]  = useState(false);
  const [guestData,  setGuestData]  = useState({ name: '', email: '', phone: '' });

  const inputRef    = useRef(null);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const h = (e) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        inputRef.current    && !inputRef.current.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleQueryChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    setOpen(true);
    clearTimeout(debounceRef.current);
    if (q.trim().length >= 2) {
      debounceRef.current = setTimeout(() => {
        dispatch(searchUsers({ query: q.trim() }));
      }, 300);
    }
  };

  const selectUser = useCallback((user) => {
    setGuestMode(false);
    setQuery(user.name ?? user.email ?? '');
    setOpen(false);
    onChange({ type: 'existing', user });
  }, [onChange]);

  const enterGuestMode = () => {
    setGuestMode(true);
    setOpen(false);
    setQuery('New guest…');
    onChange({ type: 'new', guestData });
  };

  const handleGuestField = (e) => {
    const updated = { ...guestData, [e.target.name]: e.target.value };
    setGuestData(updated);
    onChange({ type: 'new', guestData: updated });
  };

  const clearSelection = () => {
    setQuery('');
    setGuestMode(false);
    setGuestData({ name: '', email: '', phone: '' });
    onChange(null);
    inputRef.current?.focus();
  };

  const users = Array.isArray(results) ? results : [];
  const hasSelection = Boolean(value);

  return (
    <div className="usc-wrap">
      {/* Search input */}
      <div className={`usc-input-wrap ${error ? 'usc-input-wrap--error' : ''}`}>
        <span className="usc-input-icon">👤</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleQueryChange}
          onFocus={() => { if (!guestMode && query.length >= 2) setOpen(true); }}
          placeholder="Search by name or email…"
          className="usc-input"
          aria-label="Search for guest"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls="usc-dropdown"
          autoComplete="off"
          readOnly={guestMode && hasSelection}
        />
        {loading && <span className="hms-spinner hms-spinner--sm usc-spin" aria-hidden="true" />}
        {(query || guestMode) && (
          <button type="button" className="usc-clear" onClick={clearSelection}
            aria-label="Clear selection">✕</button>
        )}
      </div>

      {/* Dropdown */}
      {open && !guestMode && (
        <ul id="usc-dropdown" ref={dropdownRef} className="usc-dropdown" role="listbox">
          {users.length === 0 && !loading && query.length >= 2 && (
            <li className="usc-dropdown__empty">No users found for "{query}"</li>
          )}
          {users.length === 0 && query.length < 2 && (
            <li className="usc-dropdown__empty">Type at least 2 characters to search</li>
          )}
          {users.map((u) => (
            <li key={u._id ?? u.id} role="option"
              className="usc-dropdown__item"
              onMouseDown={() => selectUser(u)}>
              <span className="usc-dropdown__avatar">
                {(u.name ?? u.email ?? '?')[0].toUpperCase()}
              </span>
              <span className="usc-dropdown__info">
                <span className="usc-dropdown__name">{u.name ?? '—'}</span>
                <span className="usc-dropdown__email">{u.email}</span>
              </span>
              {u.role && (
                <span className="badge badge--role capitalize">{u.role}</span>
              )}
            </li>
          ))}
          {/* New guest option always shown */}
          <li className="usc-dropdown__new" onMouseDown={enterGuestMode}
            role="option" aria-label="Enter new guest details">
            <span>➕</span>
            <span>Enter new guest details instead</span>
          </li>
        </ul>
      )}

      {/* New guest fields — shown inline once chosen */}
      {guestMode && (
        <div className="usc-guest-fields animate-fade-in">
          <p className="usc-guest-fields__label">
            🆕 New guest — details will be stored with the booking
          </p>
          <div className="rfm-grid-2">
            <div className="form-group">
              <label htmlFor="usc-guest-name">Full Name <span className="rfm-req">*</span></label>
              <input id="usc-guest-name" name="name" type="text"
                value={guestData.name} onChange={handleGuestField}
                placeholder="Jane Smith" />
            </div>
            <div className="form-group">
              <label htmlFor="usc-guest-email">Email <span className="rfm-req">*</span></label>
              <input id="usc-guest-email" name="email" type="email"
                value={guestData.email} onChange={handleGuestField}
                placeholder="jane@example.com" />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="usc-guest-phone">
              Phone <span className="form-group__optional">(optional)</span>
            </label>
            <input id="usc-guest-phone" name="phone" type="tel"
              value={guestData.phone} onChange={handleGuestField}
              placeholder="+1 555 000 0000" />
          </div>
        </div>
      )}

      {/* Selected existing user chip */}
      {!guestMode && value?.type === 'existing' && (
        <div className="usc-chip animate-fade-in">
          <span className="usc-chip__avatar">
            {(value.user.name ?? value.user.email ?? '?')[0].toUpperCase()}
          </span>
          <span className="usc-chip__name">{value.user.name}</span>
          <span className="usc-chip__email">{value.user.email}</span>
          {value.user.role && (
            <span className="badge badge--role capitalize">{value.user.role}</span>
          )}
        </div>
      )}

      {error && <p className="form-group__error-msg">{error}</p>}
    </div>
  );
};

export default UserSearchCombobox;
