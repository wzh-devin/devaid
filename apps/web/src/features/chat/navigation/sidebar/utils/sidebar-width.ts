const MIN_WIDTH = 224
const MAX_WIDTH = 480

export const clampSidebarWidth = (width: number, viewportWidth: number) =>
  Math.max(MIN_WIDTH, Math.min(width, getMaxSidebarWidth(viewportWidth)))

export const getMaxSidebarWidth = (viewportWidth: number) =>
  Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, viewportWidth * 0.4))

export const MIN_SIDEBAR_WIDTH = MIN_WIDTH
