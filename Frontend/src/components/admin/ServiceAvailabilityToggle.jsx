// src/components/admin/ServiceAvailabilityToggle.jsx
import React, { useState } from 'react';
import { useDispatch }      from 'react-redux';
import { toggleServiceAvailability } from '../../store/slices/servicesSlice';

const ServiceAvailabilityToggle = ({ service, onToggled }) => {
  const dispatch   = useDispatch();
  const [busy, setBusy] = useState(false);
  const isAvailable = service?.isAvailable !== false;

  const handleToggle = async () => {
    setBusy(true);
    const result = await dispatch(
      toggleServiceAvailability(service._id ?? service.id)
    );
    setBusy(false);
    if (toggleServiceAvailability.fulfilled.match(result) && onToggled) {
      onToggled(result.payload);
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isAvailable}
      aria-label={`${service?.name}: ${isAvailable ? 'Available' : 'Unavailable'}. Click to toggle.`}
      className={`sat-track ${isAvailable ? 'sat-track--on' : 'sat-track--off'}`}
      onClick={handleToggle}
      disabled={busy}
    >
      <span className="sat-thumb">
        {busy
          ? <span className="hms-spinner hms-spinner--sm sat-spinner" aria-hidden="true" />
          : isAvailable ? '✓' : '✕'}
      </span>
      <span className="sat-label">
        {isAvailable ? 'Available' : 'Unavailable'}
      </span>
    </button>
  );
};

export default ServiceAvailabilityToggle;
