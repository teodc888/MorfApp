export const STITCH = {
  bg: '#FAF9F6',
  surface: '#FFFFFF',
  primary: '#EF4444',
  secondary: '#22C55E',
  tertiary: '#F97316',
  text: '#1A1B22',
  muted: '#584237',
  border: '#E5E7EB',
  radius: '16px',
  radiusLg: '24px',
  shadow: '0px 4px 12px rgba(67,20,7,0.08)',
  shadowLg: '0px 12px 32px rgba(67,20,7,0.12)',
} as const

export const stitchCardStyle = {
  backgroundColor: STITCH.surface,
  border: `1px solid ${STITCH.border}`,
  borderRadius: STITCH.radius,
  boxShadow: STITCH.shadow,
} as const
