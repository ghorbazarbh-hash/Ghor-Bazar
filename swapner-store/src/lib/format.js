// ---------- number / money ----------
export const money = (n) =>
  '৳ ' + Number(n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const tk = (n) => '৳' + Number(n || 0).toLocaleString('en-BD', { maximumFractionDigits: 2 })
export const moneyShort = (n) => 'BDT ' + Number(n || 0).toLocaleString('en-BD', { maximumFractionDigits: 0 })
// storefront uses Bangla digits
export const taka = (n) => '৳' + Number(n || 0).toLocaleString('bn-BD', { maximumFractionDigits: 2 })
export const bn = (n) => Number(n || 0).toLocaleString('bn-BD')

// ---------- dates ----------
export const nowISO = () => new Date().toISOString()
export const fmtDate = (iso) => {
  if (!iso) return '-'
  const d = new Date(iso)
  if (isNaN(d)) return String(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
export const fmtDateTime = (iso) => {
  if (!iso) return '-'
  const d = new Date(iso)
  if (isNaN(d)) return String(iso)
  return (
    d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  )
}

export const RANGES = ['Today', 'Yesterday', 'This Week', 'This Month', 'This Year', 'All']
export const REPORT_RANGES = [['Today', 'আজ'], ['Yesterday', 'গতকাল'], ['This Week', 'এই সপ্তাহ'], ['Last Week', 'গত সপ্তাহ'], ['This Month', 'এই মাস'], ['Last Month', 'গত মাস'], ['This Year', 'এই বছর'], ['All', 'সব সময়'], ['Custom', 'নিজের তারিখ']]
const DAY = 864e5
export function rangeBounds(r) {
  const now = new Date()
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  switch (r) {
    case 'Today':
      return [t, new Date(t.getTime() + DAY)]
    case 'Yesterday':
      return [new Date(t.getTime() - DAY), t]
    case 'This Week': {
      // week starts on Saturday (Bangladesh)
      const back = (t.getDay() + 1) % 7
      const s = new Date(t.getTime() - back * DAY)
      return [s, new Date(s.getTime() + 7 * DAY)]
    }
    case 'Last Week': {
      const back = (t.getDay() + 1) % 7
      const s = new Date(t.getTime() - back * DAY - 7 * DAY)
      return [s, new Date(s.getTime() + 7 * DAY)]
    }
    case 'This Month':
      return [new Date(now.getFullYear(), now.getMonth(), 1), new Date(now.getFullYear(), now.getMonth() + 1, 1)]
    case 'Last Month':
      return [new Date(now.getFullYear(), now.getMonth() - 1, 1), new Date(now.getFullYear(), now.getMonth(), 1)]
    case 'This Year':
      return [new Date(now.getFullYear(), 0, 1), new Date(now.getFullYear() + 1, 0, 1)]
    default:
      return null
  }
}
export function inRange(iso, b) {
  if (!b) return true
  const t = new Date(iso).getTime()
  return t >= b[0].getTime() && t < b[1].getTime()
}
export const dayKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// ---------- files ----------
export function download(text, name, mime = 'text/plain') {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type: mime }))
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
const csvCell = (v) => '"' + String(v ?? '').replaceAll('"', '""') + '"'
export function downloadCSV(name, header, rows) {
  const csv = '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n')
  download(csv, name, 'text/csv;charset=utf-8')
}

// Resize an uploaded image and return a compressed data URL (keeps localStorage small)
export function fileToDataUrl(file, maxW = 900, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = () => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width)
        const c = document.createElement('canvas')
        c.width = Math.round(img.width * scale)
        c.height = Math.round(img.height * scale)
        const ctx = c.getContext('2d')
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, c.width, c.height)
        ctx.drawImage(img, 0, 0, c.width, c.height)
        resolve(c.toDataURL('image/jpeg', quality))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}
