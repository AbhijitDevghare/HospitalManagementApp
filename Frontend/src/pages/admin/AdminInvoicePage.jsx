// filepath: d:\HotelManagementSystem\Frontend\src\pages\admin\AdminInvoicePage.jsx
// src/pages/admin/AdminInvoicePage.jsx
// Admin: list all invoices, generate manually, mark as paid.
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector }    from 'react-redux';
import {
  getAllInvoices, generateInvoice, markInvoiceAsPaid,
  clearInvoiceError,
  selectInvoices, selectInvoiceLoading, selectInvoiceError,
} from '../../store/slices/invoiceSlice';

const fmtAmt = (n) => `$${Number(n ?? 0).toFixed(2)}`;
const fmt    = (d) => d ? new Date(d).toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' }) : '—';

const S = {
  page:     { minHeight:'100vh', background:'#f1f5f9', fontFamily:"'Segoe UI',sans-serif", color:'#1e293b' },
  hero:     { background:'linear-gradient(135deg,#1e293b,#334155)', color:'#fff', padding:'2rem 2rem 1.75rem' },
  inner:    { maxWidth:'1100px', margin:'0 auto' },
  heroTitle:{ fontSize:'1.6rem', fontWeight:800, margin:'0 0 0.2rem' },
  heroSub:  { fontSize:'0.875rem', color:'#94a3b8', margin:0 },
  body:     { maxWidth:'1100px', margin:'0 auto', padding:'2rem 1.5rem' },
  toolbar:  { display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'1.5rem', flexWrap:'wrap' },
  filterBtn:(a) => ({ padding:'6px 16px', borderRadius:'999px', border:'1.5px solid', borderColor: a?'#6366f1':'#e2e8f0', background: a?'#eef2ff':'#fff', color: a?'#6366f1':'#64748b', fontWeight:600, fontSize:'0.8rem', cursor:'pointer' }),
  genBtn:   { marginLeft:'auto', display:'inline-flex', alignItems:'center', gap:'6px', padding:'9px 18px', background:'linear-gradient(135deg,#6366f1,#818cf8)', color:'#fff', border:'none', borderRadius:'10px', fontWeight:700, fontSize:'0.875rem', cursor:'pointer' },
  card:     { background:'#fff', borderRadius:'16px', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', overflow:'hidden', marginBottom:'1.25rem' },
  table:    { width:'100%', borderCollapse:'collapse', fontSize:'0.875rem' },
  th:       { padding:'12px 16px', background:'#f8fafc', fontWeight:700, fontSize:'0.75rem', textTransform:'uppercase', letterSpacing:'0.06em', color:'#94a3b8', textAlign:'left', borderBottom:'1px solid #e2e8f0' },
  td:       { padding:'12px 16px', borderBottom:'1px solid #f8fafc', color:'#475569', verticalAlign:'middle' },
  paidBadge:(paid) => ({ display:'inline-block', padding:'3px 12px', borderRadius:'999px', fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', background: paid?'#f0fdf4':'#fef2f2', color: paid?'#16a34a':'#dc2626', border:`1px solid ${paid?'#bbf7d0':'#fecaca'}` }),
  markBtn:  { padding:'5px 12px', background:'#fff', border:'1.5px solid #bbf7d0', borderRadius:'8px', color:'#16a34a', fontWeight:600, fontSize:'0.75rem', cursor:'pointer' },
  markBtnDis:{ opacity:0.5, cursor:'not-allowed' },
  // Generate modal
  backdrop: { position:'fixed', inset:0, background:'rgba(15,23,42,0.5)', backdropFilter:'blur(3px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'1rem' },
  modal:    { background:'#fff', borderRadius:'20px', padding:'2rem', maxWidth:'420px', width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' },
  modalTitle:{ fontSize:'1.15rem', fontWeight:800, margin:'0 0 0.25rem' },
  modalSub: { fontSize:'0.82rem', color:'#94a3b8', margin:'0 0 1.25rem' },
  label:    { display:'block', fontSize:'0.8rem', fontWeight:600, color:'#475569', marginBottom:'4px' },
  input:    { width:'100%', padding:'10px 12px', border:'1.5px solid #e2e8f0', borderRadius:'10px', fontSize:'0.9rem', background:'#f8fafc', outline:'none', boxSizing:'border-box', marginBottom:'1rem' },
  modalFoot:{ display:'flex', gap:'0.75rem', marginTop:'0.5rem' },
  cancelBtn:{ flex:1, padding:'11px', background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:'10px', fontWeight:600, color:'#64748b', cursor:'pointer' },
  submitBtn:{ flex:2, padding:'11px', background:'linear-gradient(135deg,#6366f1,#818cf8)', border:'none', borderRadius:'10px', color:'#fff', fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px' },
  spinner:  { width:'14px', height:'14px', border:'2px solid rgba(255,255,255,0.3)', borderTop:'2px solid #fff', borderRadius:'50%', animation:'spin 0.7s linear infinite', display:'inline-block' },
  center:   { textAlign:'center', padding:'4rem', color:'#94a3b8' },
  bigSpinner:{ width:'36px', height:'36px', margin:'0 auto 1rem', border:'3px solid #e2e8f0', borderTop:'3px solid #6366f1', borderRadius:'50%', animation:'spin 0.8s linear infinite' },
  errorBox: { background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'12px', padding:'1rem 1.25rem', color:'#dc2626', fontSize:'0.875rem', marginBottom:'1.25rem', display:'flex', alignItems:'center', gap:'8px' },
  errClose: { marginLeft:'auto', background:'none', border:'none', color:'#dc2626', cursor:'pointer', fontWeight:700 },
};

const FILTERS = [
  { label:'All',    value: undefined },
  { label:'Paid',   value: true  },
  { label:'Unpaid', value: false },
];

const AdminInvoicePage = () => {
  const dispatch  = useDispatch();
  const invoices  = useSelector(selectInvoices);
  const loading   = useSelector(selectInvoiceLoading);
  const error     = useSelector(selectInvoiceError);

  const [isPaidFilter, setIsPaidFilter] = useState(undefined);
  const [showGen,      setShowGen]      = useState(false);
  const [bookingId,    setBookingId]    = useState('');
  const [svcCharges,   setSvcCharges]   = useState(0);
  const [genLoading,   setGenLoading]   = useState(false);
  const [markingId,    setMarkingId]    = useState(null);

  useEffect(() => {
    const filters = isPaidFilter !== undefined ? { isPaid: isPaidFilter } : {};
    dispatch(getAllInvoices(filters));
  }, [dispatch, isPaidFilter]);

  const handleGenerate = async () => {
    if (!bookingId.trim()) return;
    setGenLoading(true);
    await dispatch(generateInvoice({ bookingId: bookingId.trim(), serviceCharges: Number(svcCharges) || 0 }));
    setGenLoading(false);
    setShowGen(false);
    setBookingId('');
    setSvcCharges(0);
    dispatch(getAllInvoices(isPaidFilter !== undefined ? { isPaid: isPaidFilter } : {}));
  };

  const handleMarkPaid = async (invoiceId) => {
    setMarkingId(invoiceId);
    await dispatch(markInvoiceAsPaid(invoiceId));
    setMarkingId(null);
  };

  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
      <div style={S.page}>

        {/* Hero */}
        <div style={S.hero}>
          <div style={S.inner}>
            <h1 style={S.heroTitle}>🧾 Invoice Management</h1>
            <p style={S.heroSub}>Generate, review, and manage all guest invoices</p>
          </div>
        </div>

        <div style={S.body}>

          {error && (
            <div style={S.errorBox}>
              ⚠️ {error}
              <button style={S.errClose} onClick={() => dispatch(clearInvoiceError())}>✕</button>
            </div>
          )}

          {/* Toolbar */}
          <div style={S.toolbar}>
            {FILTERS.map(({ label, value }) => (
              <button key={label} style={S.filterBtn(isPaidFilter === value)} onClick={() => setIsPaidFilter(value)}>
                {label}
              </button>
            ))}
            <button style={S.genBtn} onClick={() => setShowGen(true)}>+ Generate Invoice</button>
          </div>

          {/* Table */}
          <div style={S.card}>
            {loading ? (
              <div style={S.center}><div style={S.bigSpinner}/><p>Loading invoices…</p></div>
            ) : invoices.length === 0 ? (
              <div style={S.center}><p style={{ fontSize:'2rem' }}>🧾</p><p>No invoices found.</p></div>
            ) : (
              <table style={S.table}>
                <thead>
                  <tr>
                    {['Invoice ID','Booking ID','Guest','Invoice Date','Room Charges','Service','Taxes','Total','Status','Action'].map((h) => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => {
                    const id = inv._id ?? inv.id;
                    return (
                      <tr key={id}>
                        <td style={S.td}><code style={{ fontSize:'0.72rem', color:'#94a3b8' }}>{String(id).slice(-8)}</code></td>
                        <td style={S.td}><code style={{ fontSize:'0.72rem', color:'#94a3b8' }}>{String(inv.booking?._id ?? inv.bookingId ?? '—').slice(-8)}</code></td>
                        <td style={S.td}>{inv.user?.name ?? inv.guestName ?? '—'}</td>
                        <td style={S.td}>{fmt(inv.invoiceDate ?? inv.createdAt)}</td>
                        <td style={S.td}>{fmtAmt(inv.roomCharges)}</td>
                        <td style={S.td}>{fmtAmt(inv.serviceCharges)}</td>
                        <td style={S.td}>{fmtAmt(inv.taxes)}</td>
                        <td style={{ ...S.td, fontWeight:700, color:'#6366f1' }}>{fmtAmt(inv.totalBill)}</td>
                        <td style={S.td}><span style={S.paidBadge(inv.isPaid)}>{inv.isPaid ? 'Paid' : 'Unpaid'}</span></td>
                        <td style={S.td}>
                          {!inv.isPaid && (
                            <button
                              style={{ ...S.markBtn, ...(markingId === id ? S.markBtnDis : {}) }}
                              onClick={() => handleMarkPaid(id)}
                              disabled={markingId === id}
                            >
                              {markingId === id ? '…' : '✅ Mark Paid'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Generate Invoice Modal */}
      {showGen && (
        <div style={S.backdrop} onClick={(e) => { if (e.target === e.currentTarget) setShowGen(false); }}>
          <div style={S.modal}>
            <h2 style={S.modalTitle}>🧾 Generate Invoice</h2>
            <p style={S.modalSub}>Manually create an invoice for a booking ID</p>
            <label style={S.label} htmlFor="gen-bid">Booking ID <span style={{ color:'#ef4444' }}>*</span></label>
            <input id="gen-bid" style={S.input} value={bookingId} onChange={(e) => setBookingId(e.target.value)} placeholder="Enter booking ObjectId…" />
            <label style={S.label} htmlFor="gen-svc">Service Charges ($)</label>
            <input id="gen-svc" style={S.input} type="number" min="0" value={svcCharges} onChange={(e) => setSvcCharges(e.target.value)} placeholder="0.00" />
            <div style={S.modalFoot}>
              <button style={S.cancelBtn} onClick={() => setShowGen(false)} disabled={genLoading}>Cancel</button>
              <button style={{ ...S.submitBtn, ...(genLoading ? { opacity:0.6, cursor:'not-allowed' } : {}) }} onClick={handleGenerate} disabled={genLoading}>
                {genLoading ? <><span style={S.spinner}/> Generating…</> : '✅ Generate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminInvoicePage;
