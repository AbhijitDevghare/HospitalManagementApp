// filepath: d:\HotelManagementSystem\Frontend\src\pages\InvoicePage.jsx
// src/pages/InvoicePage.jsx
// Guest: view invoice for a specific booking via /bookings/:bookingId/invoice
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate }   from 'react-router-dom';
import {
  getInvoiceByBookingId,
  clearCurrentInvoice,
  selectCurrentInvoice,
  selectInvoiceLoading,
  selectInvoiceError,
} from '../store/slices/invoiceSlice';

const fmt     = (d) => d ? new Date(d).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : '—';
const fmtAmt  = (n) => `$${Number(n ?? 0).toFixed(2)}`;

const S = {
  page:    { minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Segoe UI',sans-serif", color: '#1e293b' },
  hero:    { background: 'linear-gradient(135deg,#1e293b,#334155)', color: '#fff', padding: '2rem 2rem 1.75rem' },
  inner:   { maxWidth: '760px', margin: '0 auto' },
  backBtn: { display:'inline-flex', alignItems:'center', gap:'6px', background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.2)', color:'#fff', borderRadius:'8px', padding:'6px 14px', fontSize:'0.82rem', fontWeight:600, cursor:'pointer', marginBottom:'1rem' },
  heroTop: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'0.75rem' },
  heroTitle:{ fontSize:'1.5rem', fontWeight:800, margin:'0 0 0.2rem' },
  heroSub:  { fontSize:'0.78rem', color:'#94a3b8', fontFamily:'monospace', margin:0 },
  paidBadge:(paid) => ({ display:'inline-block', padding:'5px 16px', borderRadius:'999px', fontSize:'0.78rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', background: paid ? '#f0fdf4' : '#fef2f2', color: paid ? '#16a34a' : '#dc2626', border:`1px solid ${paid ? '#bbf7d0' : '#fecaca'}` }),
  body:     { maxWidth:'760px', margin:'0 auto', padding:'2rem 1.5rem' },
  card:     { background:'#fff', borderRadius:'16px', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', overflow:'hidden', marginBottom:'1.25rem' },
  cHead:    { padding:'1rem 1.5rem', borderBottom:'1px solid #f1f5f9', fontSize:'0.75rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.08em', color:'#94a3b8' },
  cBody:    { padding:'1.25rem 1.5rem' },
  infoGrid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' },
  infoItem: { display:'flex', flexDirection:'column', gap:'3px' },
  infoLbl:  { fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'#94a3b8' },
  infoVal:  { fontSize:'0.92rem', fontWeight:600, color:'#1e293b' },
  table:    { width:'100%', borderCollapse:'collapse', fontSize:'0.875rem' },
  td:       { padding:'8px 0', color:'#475569', borderBottom:'1px solid #f8fafc' },
  tdR:      { padding:'8px 0', color:'#475569', textAlign:'right', borderBottom:'1px solid #f8fafc' },
  totalTd:  { padding:'11px 0 4px', fontWeight:800, fontSize:'1rem', color:'#1e293b' },
  totalTdR: { padding:'11px 0 4px', fontWeight:800, fontSize:'1.15rem', color:'#6366f1', textAlign:'right' },
  printBtn: { display:'inline-flex', alignItems:'center', gap:'6px', padding:'10px 20px', background:'linear-gradient(135deg,#6366f1,#818cf8)', color:'#fff', border:'none', borderRadius:'10px', fontWeight:700, fontSize:'0.875rem', cursor:'pointer' },
  center:   { textAlign:'center', padding:'5rem 2rem', color:'#94a3b8' },
  spinner:  { width:'38px', height:'38px', margin:'0 auto 1rem', border:'3px solid #e2e8f0', borderTop:'3px solid #6366f1', borderRadius:'50%', animation:'spin 0.8s linear infinite' },
  errorBox: { background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'12px', padding:'1.25rem', color:'#dc2626', margin:'2rem auto', maxWidth:'760px', fontSize:'0.875rem' },
};

const InvoicePage = () => {
  const { bookingId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const invoice  = useSelector(selectCurrentInvoice);
  const loading  = useSelector(selectInvoiceLoading);
  const error    = useSelector(selectInvoiceError);

  useEffect(() => {
    dispatch(getInvoiceByBookingId(bookingId));
    return () => dispatch(clearCurrentInvoice());
  }, [dispatch, bookingId]);

  if (loading) return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
      <div style={S.center}><div style={S.spinner}/><p>Loading invoice…</p></div>
    </>
  );

  if (error) return (
    <div style={S.errorBox}>
      {error.includes('403') || error.toLowerCase().includes('access')
        ? '🔒 Access Denied — this invoice does not belong to your account.'
        : `⚠️ ${error}`}
    </div>
  );

  if (!invoice) return null;

  const paid         = invoice.isPaid;
  const roomCharges  = Number(invoice.roomCharges  ?? 0);
  const svcCharges   = Number(invoice.serviceCharges ?? 0);
  const taxes        = Number(invoice.taxes        ?? 0);
  const totalBill    = Number(invoice.totalBill    ?? roomCharges + svcCharges + taxes);

  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}} @media print{.no-print{display:none!important;}}`}</style>
      <div style={S.page}>

        {/* Hero */}
        <div style={S.hero}>
          <div style={S.inner}>
            <button className="no-print" style={S.backBtn} onClick={() => navigate(`/bookings/${bookingId}`)}>← Back to Booking</button>
            <div style={S.heroTop}>
              <div>
                <h1 style={S.heroTitle}>🧾 Invoice</h1>
                <p style={S.heroSub}>#{invoice._id ?? invoice.id}</p>
              </div>
              <span style={S.paidBadge(paid)}>{paid ? '✅ Paid' : '❌ Unpaid'}</span>
            </div>
          </div>
        </div>

        <div style={S.body}>

          {/* Meta info */}
          <div style={S.card}>
            <div style={S.cHead}>📋 Invoice Details</div>
            <div style={S.cBody}>
              <div style={S.infoGrid}>
                {[
                  ['Invoice Date',   fmt(invoice.invoiceDate ?? invoice.createdAt)],
                  ['Booking ID',     invoice.booking?._id ?? invoice.bookingId ?? '—'],
                  ['Guest',          invoice.user?.name ?? invoice.guestName ?? '—'],
                  ['Room',           invoice.booking?.room?.roomNumber ? `Room ${invoice.booking.room.roomNumber}` : '—'],
                  ['Check-in',       fmt(invoice.booking?.checkInDate)],
                  ['Check-out',      fmt(invoice.booking?.checkOutDate)],
                ].map(([lbl, val]) => (
                  <div key={lbl} style={S.infoItem}>
                    <span style={S.infoLbl}>{lbl}</span>
                    <span style={S.infoVal}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cost breakdown */}
          <div style={S.card}>
            <div style={S.cHead}>💳 Cost Breakdown</div>
            <div style={S.cBody}>
              <table style={S.table}>
                <tbody>
                  <tr><td style={S.td}>Room Charges</td><td style={S.tdR}>{fmtAmt(roomCharges)}</td></tr>
                  {svcCharges > 0 && <tr><td style={S.td}>Service Charges</td><td style={S.tdR}>{fmtAmt(svcCharges)}</td></tr>}
                  <tr><td style={S.td}>Taxes (12%)</td><td style={S.tdR}>{fmtAmt(taxes)}</td></tr>
                  <tr>
                    <td style={S.totalTd}><strong>Total Bill</strong></td>
                    <td style={S.totalTdR}><strong>{fmtAmt(totalBill)}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Print button */}
          <div className="no-print" style={{ textAlign:'right' }}>
            <button style={S.printBtn} onClick={() => window.print()}>🖨️ Print / Save PDF</button>
          </div>
        </div>
      </div>
    </>
  );
};

export default InvoicePage;
