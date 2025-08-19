import { STORAGE_KEYS } from './constants'

export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return ''
  
  let id = localStorage.getItem(STORAGE_KEYS.DEVICE_ID)
  
  if (!id) {
    id = (crypto?.randomUUID?.() || Math.random().toString(36).slice(2)) + ''
    localStorage.setItem(STORAGE_KEYS.DEVICE_ID, id)
  }
  
  return id
}

export function getDisplayName(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(STORAGE_KEYS.DISPLAY_NAME) || ''
}

export function saveDisplayName(name: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEYS.DISPLAY_NAME, name)
}
