export const AUCTION_CONFIG = {
  MIN_BID_AMOUNT: 5,
  MAX_BID_AMOUNT: 10000,
  PRESET_AMOUNTS: [5, 10, 15, 20, 50] as const,
  DEVICE_ID_KEY: 'laddu_device_id',
  DISPLAY_NAME_KEY: 'laddu_display_name'
} as const

export const STORAGE_KEYS = {
  DEVICE_ID: AUCTION_CONFIG.DEVICE_ID_KEY,
  DISPLAY_NAME: AUCTION_CONFIG.DISPLAY_NAME_KEY
} as const
