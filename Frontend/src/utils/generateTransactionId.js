// src/utils/generateTransactionId.js
// ─────────────────────────────────────────────────────────────────────────────
// Generates a client-side transaction reference in the format:
//   HMS-{METHOD}-{YYYYMMDD}-{8 random hex chars}
// e.g. HMS-CC-20241201-A3F9B21C
//
// This is a display / tracking reference only. The backend assigns its own
// canonical transaction ID; the client-generated value is passed as
// transactionId in the processPayment body and stored alongside it.
// ─────────────────────────────────────────────────────────────────────────────
export const generateTransactionId = (paymentMethod = 'PAY') => {
  const methodCode = paymentMethod
    .replace(/_/g, '')
    .slice(0, 4)
    .toUpperCase();

  const date = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, '');

  const random = Math.floor(Math.random() * 0xffffffff)
    .toString(16)
    .toUpperCase()
    .padStart(8, '0');

  return `HMS-${methodCode}-${date}-${random}`;
};
