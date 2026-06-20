/** Keep in sync with styles/_variables.scss */

export const BREAKPOINT_XS = 400
export const BREAKPOINT_SM = 640
export const BREAKPOINT_MD = 768
export const BREAKPOINT_LG = 960
export const BREAKPOINT_XL = 1280

export const BREAKPOINT_MOBILE_MAX = BREAKPOINT_MD - 1

export const MEDIA_MOBILE = `(max-width: ${BREAKPOINT_MOBILE_MAX}px)` as const
export const MEDIA_TABLET_UP = `(min-width: ${BREAKPOINT_MD}px)` as const
export const MEDIA_SM_DOWN = `(max-width: ${BREAKPOINT_SM}px)` as const
export const MEDIA_LG_DOWN = `(max-width: ${BREAKPOINT_LG}px)` as const
