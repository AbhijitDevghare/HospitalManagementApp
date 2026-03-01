import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  createRoom, updateRoom,
  selectRoomLoading, selectRoomError, clearRoomError,
} from '../../store/slices/roomSlice';

const ROOM_TYPES = ['single', 'double', 'suite', 'deluxe', 'penthouse', 'family'];
const MAX_IMAGES = 8;
const MAX_MB = 5;

const toBase64 = (file) =>
  new Promise((res) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.readAsDataURL(file);
  });

const RoomFormModal = ({ room, onClose, onSuccess }) => {
  const dispatch = useDispatch();
  const loading = useSelector(selectRoomLoading);
  const apiError = useSelector(selectRoomError);
  const isEdit = Boolean(room);

  /* ── form state ── */
  const [f, setF] = useState({
    roomNumber: room?.roomNumber ?? '',
    roomType: room?.roomType ?? 'single',
    pricePerNight: room?.pricePerNight ?? '',
    maxOccupancy: room?.maxOccupancy ?? 1,
    description: room?.description ?? '',
    floor: room?.floor ?? '',
  });

  const [amenityInput, setAmenityInput] = useState('');
  const [amenities, setAmenities] = useState(
    Array.isArray(room?.amenities) ? room.amenities : []
  );
  const [existingImgs, setExistingImgs] = useState(
    Array.isArray(room?.images) ? room.images : []
  );
  const [newFiles, setNewFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [localErr, setLocalErr] = useState('');
  const [uploadWarn, setUploadWarn] = useState('');

  const closeRef = useRef(null);
  const dropRef = useRef(null);
  const fileInput = useRef(null);

  /* ── Effects ── */
  useEffect(() => { closeRef.current?.focus(); }, []);
  
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  useEffect(() => () => dispatch(clearRoomError()), [dispatch]);

  const change = (e) => {
    setF((p) => ({ ...p, [e.target.name]: e.target.value }));
    setLocalErr('');
    dispatch(clearRoomError());
  };

  /* ── Amenities ── */
  const addAmenity = () => {
    const v = amenityInput.trim();
    if (v && !amenities.includes(v)) setAmenities((p) => [...p, v]);
    setAmenityInput('');
  };

  const removeAmenity = (a) => setAmenities((p) => p.filter((x) => x !== a));

  /* ── Images ── */
  const processFiles = useCallback(async (files) => {
    const total = existingImgs.length + newFiles.length + files.length;
    if (total > MAX_IMAGES) {
      setUploadWarn(`Maximum ${MAX_IMAGES} images allowed.`);
      return;
    }
    const oversized = files.filter((f) => f.size > MAX_MB * 1024 * 1024);
    if (oversized.length) {
      setUploadWarn(`Each image must be under ${MAX_MB} MB.`);
      return;
    }
    setUploadWarn('');
    const b64s = await Promise.all(files.map(toBase64));
    setNewFiles((p) => [...p, ...files]);
    setPreviews((p) => [...p, ...b64s]);
  }, [existingImgs.length, newFiles.length]);

  const handleFileChange = (e) => {
    processFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  const removeNew = (idx) => {
    setNewFiles((p) => p.filter((_, i) => i !== idx));
    setPreviews((p) => p.filter((_, i) => i !== idx));
  };

  const removeExisting = (url) => setExistingImgs((p) => p.filter((u) => u !== url));

  const onDrop = (e) => {
    e.preventDefault();
    dropRef.current?.classList.remove('rfm-dropzone--over');
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    processFiles(files);
  };

  /* ── Submission ── */
  const validate = () => {
    if (!f.roomNumber.toString().trim()) return 'Room number is required.';
    if (!f.pricePerNight || Number(f.pricePerNight) <= 0) return 'Price per night must be > 0.';
    if (!f.maxOccupancy || Number(f.maxOccupancy) < 1) return 'Max occupancy must be ≥ 1.';
    if (!isEdit && newFiles.length === 0) return 'Please upload at least one room image.';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setLocalErr(err); return; }

    const fd = new FormData();
    console.log("F",f)
    // Core fields
    fd.append("roomNumber", f.roomNumber);
    fd.append("roomType", f.roomType);
    fd.append("pricePerNight", f.pricePerNight);
    fd.append("maxOccupancy", f.maxOccupancy);

    // Optional fields: Ensure floor '0' is not ignored
    if (f.description?.trim()) fd.append("description", f.description.trim());
    if (f.floor !== '' && f.floor !== undefined) fd.append("floor", f.floor);

    // Arrays
    amenities.forEach((a) => fd.append("amenities", a));

    if (isEdit) {
      existingImgs.forEach((url) => fd.append("keepImages", url));
    }
    // console.log("PRINITN IMAGE")
    newFiles.forEach((file) => fd.append("images", file));
    // fd.getAll("images").forEach(file => console.log(file));
    const action = isEdit
      ? updateRoom({ id: room._id ?? room.id, formData: fd })
      : createRoom(fd);

    const result = await dispatch(action);

    if (createRoom.fulfilled.match(result) || updateRoom.fulfilled.match(result)) {
      onSuccess(result.payload);
    }
  };

  const totalImgCount = existingImgs.length + newFiles.length;

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal rfm-modal" role="dialog" aria-modal="true" aria-labelledby="rfm-title">
        <header className="modal__header">
          <h2 id="rfm-title" className="modal__title">
            {isEdit ? '✏️ Edit Room' : '🏨 Add New Room'}
          </h2>
          <button ref={closeRef} className="modal__close" onClick={onClose} aria-label="Close">✕</button>
        </header>

        <form onSubmit={handleSubmit} noValidate className="rfm-body">
          <div className="rfm-grid-2">
            <div className="form-group">
              <label htmlFor="rfm-num">Room Number <span className="rfm-req">*</span></label>
              <input id="rfm-num" name="roomNumber" type="text" value={f.roomNumber} onChange={change} placeholder="e.g. 101" />
            </div>
            <div className="form-group">
              <label htmlFor="rfm-type">Room Type</label>
              <select id="rfm-type" name="roomType" value={f.roomType} onChange={change}>
                {ROOM_TYPES.map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="rfm-grid-2">
            <div className="form-group">
              <label htmlFor="rfm-price">Price / Night (USD) <span className="rfm-req">*</span></label>
              <input id="rfm-price" name="pricePerNight" type="number" min="1" step="0.01" value={f.pricePerNight} onChange={change} />
            </div>
            <div className="form-group">
              <label htmlFor="rfm-occ">Max Occupancy <span className="rfm-req">*</span></label>
              <input id="rfm-occ" name="maxOccupancy" type="number" min="1" max="20" value={f.maxOccupancy} onChange={change} />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="rfm-floor">Floor <span className="form-group__optional">(optional)</span></label>
            <input id="rfm-floor" name="floor" type="number" value={f.floor} onChange={change} placeholder="1" />
          </div>

          <div className="form-group">
            <label htmlFor="rfm-desc">Description</label>
            <textarea id="rfm-desc" name="description" rows={3} className="rfm-textarea" value={f.description} onChange={change} />
          </div>

          <div className="form-group">
            <label>Amenities</label>
            <div className="rfm-tag-row">
              <input 
                className="rfm-tag-row__input" 
                type="text" 
                value={amenityInput} 
                onChange={(e) => setAmenityInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAmenity(); } }}
                placeholder="e.g. WiFi"
              />
              <button type="button" className="btn btn--ghost btn--sm" onClick={addAmenity}>Add</button>
            </div>
            <ul className="rfm-tags">
              {amenities.map((a) => (
                <li key={a} className="rfm-tag">
                  {a} <button type="button" onClick={() => removeAmenity(a)}>×</button>
                </li>
              ))}
            </ul>
          </div>

          <div className="form-group">
            <label>Images ({totalImgCount}/{MAX_IMAGES})</label>
            {totalImgCount < MAX_IMAGES && (
              <div 
                ref={dropRef} 
                className="rfm-dropzone" 
                onClick={() => fileInput.current?.click()}
                onDragOver={(e) => { e.preventDefault(); dropRef.current?.classList.add('rfm-dropzone--over'); }}
                onDragLeave={() => dropRef.current?.classList.remove('rfm-dropzone--over')}
                onDrop={onDrop}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInput.current?.click()}
                role="button"
                tabIndex={0}
              >
                <span className="rfm-dropzone__label">Click or drag images here</span>
                <input ref={fileInput} type="file" accept="image/*" multiple className="sr-only" onChange={handleFileChange} />
              </div>
            )}
            
            {uploadWarn && <p className="form-error">⚠ {uploadWarn}</p>}

            <div className="rfm-img-grid">
              {existingImgs.map((url) => (
                <div key={url} className="rfm-img-thumb">
                  <img src={url} alt="room" />
                  <button type="button" className="rfm-img-thumb__remove" onClick={() => removeExisting(url)}>×</button>
                </div>
              ))}
              {previews.map((src, i) => (
                <div key={i} className="rfm-img-thumb rfm-img-thumb--new">
                  <img src={src} alt="new" />
                  <button type="button" className="rfm-img-thumb__remove" onClick={() => removeNew(i)}>×</button>
                  <span className="rfm-img-thumb__badge">New</span>
                </div>
              ))}
            </div>
          </div>

          {(localErr || apiError) && (
            <p className="rfm-error" role="alert">
              ⚠ {localErr || apiError}
            </p>
          )}

          <footer className="modal__footer">
            <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn--primary" disabled={loading}>
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Room'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default RoomFormModal;