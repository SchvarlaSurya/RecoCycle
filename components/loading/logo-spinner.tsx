'use client'

interface LogoSpinnerProps {
  size?: number
  theme?: 'light' | 'dark'
}

export function LogoSpinner({ size = 80, theme = 'light' }: LogoSpinnerProps) {
  const stroke = theme === 'dark' ? '#ECFDF5' : '#0F172A'
  const accent = theme === 'dark' ? '#6EE7B7' : '#059669'
  const accentSoft = theme === 'dark' ? '#A7F3D0' : '#10B981'

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Outer pulse ring */}
      <span
        className="absolute inset-0 rounded-full border-2 border-emerald-500/30"
        style={{ animation: 'ping 2s cubic-bezier(0,0,0.2,1) infinite' }}
      />

      {/* Rotating logo container */}
      <div
        style={{
          animation: 'spin-logo 2.5s linear infinite',
        }}
        className="relative z-10 flex items-center justify-center"
      >
        {/* Actual RecoCycle logo SVG */}
        <svg
          viewBox="0 0 64 64"
          className="h-full w-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="rc-loader-wheel" x1="12" y1="14" x2="43" y2="43" gradientUnits="userSpaceOnUse">
              <stop stopColor={accentSoft} />
              <stop offset="1" stopColor={accent} />
            </linearGradient>
          </defs>

          <path d="M31.5 12.5a17 17 0 0 1 13.2 6.2" stroke={stroke} strokeWidth="2.8" strokeLinecap="round" opacity="0.3" />
          <path d="M44.7 18.7l.7 7.4-7.1-2.1 2.2-1.4a13.5 13.5 0 0 0-8.6-3.3c-6.8 0-12.5 5.2-13.2 12h-3.8c.8-8.9 8.3-15.8 17-15.8 4.3 0 8.1 1.4 11.1 3.8l1.7-.6Z" fill="url(#rc-loader-wheel)" />
          <path d="M49.8 34.2a17 17 0 0 1-8.4 12.2" stroke={stroke} strokeWidth="2.8" strokeLinecap="round" opacity="0.3" />
          <path d="M41.4 46.4l-6.7-3.2 5.5-5 0 2.6a13.5 13.5 0 0 0 6-9.4c.7-6.8-3.7-13.2-10.3-15.2l.9-3.7c8.6 2.7 14.3 11.2 13.4 20-.4 4.3-2.2 7.9-4.9 10.7l.4 1.9Z" fill="url(#rc-loader-wheel)" />
          <path d="M14.6 37.7a17 17 0 0 1 6-13.5" stroke={stroke} strokeWidth="2.8" strokeLinecap="round" opacity="0.3" />
          <path d="M20.6 24.2l6 4.3-6.2 4.1.2-2.6a13.5 13.5 0 0 0 2.8 17.3c5.3 4.4 13 4.8 18.6 1.3l2 3.3c-7.2 4.6-16.8 4.2-23.4-1.2-3.2-2.6-5.3-5.9-6.3-9.7l-1.7-1.1Z" fill="url(#rc-loader-wheel)" />

          <circle cx="47.5" cy="44.5" r="8.5" stroke={stroke} strokeWidth="2.8" opacity="0.9" />
          <circle cx="47.5" cy="44.5" r="2.3" fill={accentSoft} />

          <path d="M31.8 31.5l8.7 0.6 6.2 12.4" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M32 31.5l-4.4 12.9h11.2" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M35.1 25.8l-3.3 5.7" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
          <path d="M39.7 28.4h5.9l3-3.1" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M27.8 44.4l-5.9 0.1" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  )
}