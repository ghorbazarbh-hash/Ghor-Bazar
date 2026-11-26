// Tiny file database: one JSON file, written atomically (temp file + rename), with a daily rolling backup.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { seed, withDefaults } from '../src/lib/logic.js'

export const DATA_DIR = path.resolve(process.env.DATA_DIR || './data')
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads')
const BACKUP_DIR = path.join(DATA_DIR, 'backups')
const FILE = path.join(DATA_DIR, 'store.json')

fs.mkdirSync(UPLOAD_DIR, { recursive: true })
fs.mkdirSync(BACKUP_DIR, { recursive: true })

// ---- secret used to sign login tokens (kept on disk so logins survive restarts)
const SECRET_FILE = path.join(DATA_DIR, 'secret.key')
export const SECRET = process.env.SESSION_SECRET || (() => {
  try { return fs.readFileSync(SECRET_FILE, 'utf8').trim() } catch { /* first run */ }
  const s = crypto.randomBytes(48).toString('hex')
  fs.writeFileSync(SECRET_FILE, s, { mode: 0o600 })
  return s
})()

// ---- state
let state
try {
  const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'))
  state = { rev: raw.rev || 1, at: raw.at || new Date().toISOString(), db: withDefaults(raw.db || {}), users: raw.users || [], admin: raw.admin || null }
} catch {
  state = { rev: 1, at: new Date().toISOString(), db: seed(), users: [], admin: null }
}
export const getState = () => state

let lastBackupDay = ''
function save() {
  const tmp = FILE + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(state))
  fs.renameSync(tmp, FILE)
  const day = new Date().toISOString().slice(0, 10)
  if (day !== lastBackupDay) {
    lastBackupDay = day
    try {
      fs.copyFileSync(FILE, path.join(BACKUP_DIR, `store-${day}.json`))
      const old = fs.readdirSync(BACKUP_DIR).filter((f) => f.startsWith('store-')).sort().slice(0, -14)
      old.forEach((f) => fs.unlinkSync(path.join(BACKUP_DIR, f)))
    } catch { /* backups are best effort */ }
  }
}

// run fn(state); bump revision and persist
export function commit(fn) {
  const res = fn ? fn(state) : undefined
  state.rev += 1
  state.at = new Date().toISOString()
  save()
  return res
}
if (!fs.existsSync(FILE)) save()
