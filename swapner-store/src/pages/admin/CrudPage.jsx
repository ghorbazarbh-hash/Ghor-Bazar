import { useState } from 'react'
import { useStore, uid } from '../../lib/store'
import { FormModal } from '../../components/ui'

/**
 * Generic list + add/edit/delete page used by categories, brands, units, banners,
 * coupons, customers, suppliers, expense categories...
 */
export default function CrudPage({
  title, collection, addLabel = '+ Add', columns, fields, defaults = {}, searchKeys = [],
  extraActions, canDelete = true, sortFn, intro, beforeSave, onDelete, headerExtra, reverse = false,
}) {
  const { db, update, notify } = useStore()
  const [edit, setEdit] = useState(null)
  const [q, setQ] = useState('')

  let rows = db[collection].slice()
  if (sortFn) rows.sort(sortFn)
  if (reverse) rows.reverse()
  if (q.trim() && searchKeys.length) {
    const t = q.toLowerCase()
    rows = rows.filter((r) => searchKeys.some((k) => String(r[k] ?? '').toLowerCase().includes(t)))
  }

  const save = (data) => {
    const payload = beforeSave ? beforeSave(data, db) : data
    if (payload === false) return
    update((d) => {
      if (edit.row) d[collection] = d[collection].map((r) => (r.id === edit.row.id ? { ...r, ...payload } : r))
      else d[collection].push({ ...defaults, ...payload, id: uid() })
    })
    notify(edit.row ? 'আপডেট হয়েছে' : 'যোগ হয়েছে')
    setEdit(null)
  }
  const del = (r) => {
    if (!confirm('মুছে ফেলবেন?')) return
    update((d) => { d[collection] = d[collection].filter((x) => x.id !== r.id); if (onDelete) onDelete(d, r) })
    notify('মুছে ফেলা হয়েছে')
  }

  return (
    <>
      <div className="pagehead">
        <h2>{title}</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {headerExtra}
          <button className="btn" onClick={() => setEdit({ row: null })}>{addLabel}</button>
        </div>
      </div>
      {intro && <div className="notice box">{intro}</div>}
      <div className="tablecard">
        {searchKeys.length > 0 && (
          <div className="toolbar"><input placeholder="Search..." value={q} onChange={(e) => setQ(e.target.value)} /></div>
        )}
        <table>
          <thead>
            <tr>{columns.map((c) => <th key={c.label}>{c.label}</th>)}<th>Actions</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                {columns.map((c) => <td key={c.label}>{c.render ? c.render(r, db) : (r[c.key] ?? '-')}</td>)}
                <td>
                  {extraActions && extraActions(r)}
                  <button className="mini" onClick={() => setEdit({ row: r })}>Edit</button>{' '}
                  {canDelete && <button className="mini del" onClick={() => del(r)}>Delete</button>}
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={columns.length + 1} className="empty">কিছু পাওয়া যায়নি</td></tr>}
          </tbody>
        </table>
      </div>
      {edit && (
        <FormModal
          title={(edit.row ? 'Edit ' : 'Add ') + title.split('/')[0].trim()}
          fields={fields}
          initial={edit.row ? { ...edit.row } : { ...defaults }}
          onSave={save}
          onClose={() => setEdit(null)}
        />
      )}
    </>
  )
}
