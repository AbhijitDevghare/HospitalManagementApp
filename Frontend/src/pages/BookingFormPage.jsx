// src/pages/BookingFormPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Page wrapper for BookingForm.
// Reads room + date context from router location.state (set by RoomDetailPage)
// and redirects to /payment with the created booking in location.state.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import BookingForm from '../components/booking/BookingForm';

const BookingFormPage = () => {
  const location = useLocation(); 
  const navigate = useNavigate();

  const { room, checkInDate, checkOutDate } = location.state ?? {};

  // Guard: if navigated directly without state, send back to gallery
  useEffect(() => {
    if (!room || !checkInDate || !checkOutDate) {
      navigate('/rooms', { replace: true });
    }
  }, [room, checkInDate, checkOutDate, navigate]);

  if (!room) return null;

  const handleSuccess = (booking) => {
    navigate('/payment', { state: { booking } });
  };

  return (
    <main className="booking-form-page">
      <BookingForm
        room={room}
        checkInDate={checkInDate}
        checkOutDate={checkOutDate}
        onSuccess={handleSuccess}
        onBack={() => navigate(-1)}
      />
    </main>
  );
};

export default BookingFormPage;
