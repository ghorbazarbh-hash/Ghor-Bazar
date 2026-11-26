import { download } from './format'

export function downloadBackup(db) {
  const stamp = new Date().toISOString().slice(0, 10)
  download(JSON.stringify(db, null, 2), `swapner-ghor-bazar-backup-${stamp}.json`, 'application/json')
}
