import { useState } from 'react'
import { fileToDataUrl } from '../lib/format'
import { useStore } from '../lib/store'

export function Modal({ title, onClose, children, wide }) {
  return (
    <div className="modalwrap show" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={'modal' + (wide ? ' modal-wide' : '')}>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  )
}

export function Thumb({ src, size = 40, fallback = '▣' }) {
  return src ? (
    <img src={src} alt="" style={{ width: size, height: size, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e9f1', display: 'block' }} />
  ) : (
    <div style={{ width: size, height: size, borderRadius: 8, background: '#eef1ff', color: '#6b7bd9', display: 'grid', placeItems: 'center', fontSize: size * 0.45 }}>{fallback}</div>
  )
}

export function ImageInput({ value, onChange, maxW = 900, hint }) {
  const { notify, uploadImage } = useStore()
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const pick = async (e) => {
    const f = e.target.files[0]
    e.target.value = ''
    if (!f) return
    setBusy(true)
    try { onChange(await uploadImage(await fileToDataUrl(f, maxW))) } catch (err) { notify(err.message || 'ছবি আপলোড হয়নি', 'error') }
    setBusy(false)
  }
  return (
    <div className="imgin">
      {value ? <img src={value} alt="" className="imgin-prev" /> : <div className="imgin-prev empty">ছবি নেই</div>}
      <div className="imgin-side">
        <label className="btn secondary small">
          {busy ? 'আপলোড হচ্ছে…' : 'ছবি আপলোড'}
          <input type="file" accept="image/*" hidden onChange={pick} disabled={busy} />
        </label>
        {value && <button type="button" className="btn danger small" onClick={() => onChange('')}>মুছুন</button>}
        <div className="imgin-url">
          <input placeholder="অথবা ছবির লিংক (URL) দিন" value={url} onChange={(e) => setUrl(e.target.value)} />
          <button type="button" className="btn secondary small" onClick={() => { if (url.trim()) { onChange(url.trim()); setUrl('') } }}>ব্যবহার</button>
        </div>
        {hint && <div className="hint">{hint}</div>}
      </div>
    </div>
  )
}

export function ImagesInput({ value = [], onChange, max = 4, maxW = 800 }) {
  const { notify, uploadImage } = useStore()
  const [busy, setBusy] = useState(false)
  const add = async (e) => {
    const files = [...e.target.files].slice(0, max - value.length)
    e.target.value = ''
    setBusy(true)
    const out = []
    for (const f of files) { try { out.push(await uploadImage(await fileToDataUrl(f, maxW, 0.78))) } catch (err) { notify(err.message || 'একটি ছবি আপলোড হয়নি', 'error') } }
    setBusy(false)
    onChange([...value, ...out])
  }
  return (
    <div className="imgs">
      {value.map((src, i) => (
        <div className="imgs-item" key={i}>
          <img src={src} alt="" />
          {i === 0 && <span className="imgs-main">মেইন</span>}
          <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))}>×</button>
        </div>
      ))}
      {value.length < max && (
        <label className="imgs-add">
          {busy ? '…' : '+ ছবি'}
          <input type="file" accept="image/*" multiple hidden onChange={add} disabled={busy} />
        </label>
      )}
    </div>
  )
}

export function Input({ f, value, onChange, db }) {
  const common = { name: f.name, value: value ?? '', placeholder: f.placeholder, onChange: (e) => onChange(e.target.value) }
  switch (f.type) {
    case 'textarea':
      return <textarea rows={f.rows || 3} {...common} />
    case 'number':
      return <input type="number" step={f.step ?? '0.01'} min={f.min ?? 0} {...common} />
    case 'select': {
      const opts = typeof f.options === 'function' ? f.options(db) : f.options
      return (
        <select {...common}>
          {f.allowEmpty !== false && <option value="">{f.emptyLabel || '— নির্বাচন করুন —'}</option>}
          {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )
    }
    case 'checkbox':
      return (
        <label className="chk">
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} /> {f.checkLabel || f.label}
        </label>
      )
    case 'image':
      return <ImageInput value={value} onChange={onChange} maxW={f.maxW} hint={f.hint} />
    case 'images':
      return <ImagesInput value={value || []} onChange={onChange} max={f.max} />
    case 'date':
      return <input type="date" {...common} />
    case 'password':
      return <input type="password" autoComplete="new-password" {...common} />
    default:
      return <input type="text" {...common} />
  }
}

export function FormModal({ title, fields, initial = {}, onSave, onClose, saveLabel = 'Save', wide }) {
  const { db, notify } = useStore()
  const [v, setV] = useState(() => ({ ...initial }))
  const set = (k, val) => setV((s) => ({ ...s, [k]: val }))
  const submit = (e) => {
    e.preventDefault()
    const out = { ...v }
    for (const f of fields) {
      if (f.show && !f.show(v)) continue
      const raw = v[f.name]
      if (f.required && (raw === '' || raw == null || (Array.isArray(raw) && !raw.length))) { notify(`"${f.label}" দিন`, 'error'); return }
      if (f.type === 'number') out[f.name] = raw === '' || raw == null ? 0 : +raw
    }
    onSave(out)
  }
  return (
    <Modal title={title} onClose={onClose} wide={wide}>
      <form className="formgrid" onSubmit={submit}>
        {fields.map((f) => {
          if (f.show && !f.show(v)) return null
          return (
            <label key={f.name} className={f.wide || ['textarea', 'image', 'images', 'checkbox'].includes(f.type) ? 'wide' : ''}>
              {f.type !== 'checkbox' && <span className="flabel">{f.label}{f.required && <b style={{ color: '#e74b5c' }}> *</b>}</span>}
              <Input f={f} value={v[f.name]} onChange={(val) => set(f.name, val)} db={db} />
              {f.hint && f.type !== 'image' && <span className="hint">{f.hint}</span>}
            </label>
          )
        })}
        <div className="modalfoot wide">
          <button className="btn secondary" type="button" onClick={onClose}>Cancel</button>
          <button className="btn" type="submit">{saveLabel}</button>
        </div>
      </form>
    </Modal>
  )
}

export function Toast() {
  const { toast } = useStore()
  if (!toast) return null
  return <div className={'toast ' + toast.type} key={toast.id}>{toast.msg}</div>
}

export const ORDER_STATUS = {
  pending: { label: 'পেন্ডিং', color: '#b7791f', bg: '#fff6e0' },
  confirmed: { label: 'কনফার্মড', color: '#2c45e8', bg: '#eef1ff' },
  shipped: { label: 'শিপড', color: '#0e7490', bg: '#e0f6fb' },
  delivered: { label: 'ডেলিভারড', color: '#167a4c', bg: '#eaf8f0' },
  cancelled: { label: 'বাতিল', color: '#bd3445', bg: '#fff0f1' },
}
export function StatusPill({ s }) {
  const m = ORDER_STATUS[s] || ORDER_STATUS.pending
  return <span className="pill" style={{ color: m.color, background: m.bg }}>{m.label}</span>
}
