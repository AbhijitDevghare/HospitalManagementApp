// src/pages/BookingFormPage.jsx
import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import BookingForm from '../components/booking/BookingForm';

const BookingFormPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    room,
    checkInDate,
    checkOutDate,
    serviceCharges = 0, // ✅ preserve service charges
  } = location.state ?? {};

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
        initialServiceCharges={serviceCharges}  // ✅ pass it
        onSuccess={handleSuccess}
        onBack={() => navigate(-1)}
      />
    </main>
  );
};

export default BookingFormPage;