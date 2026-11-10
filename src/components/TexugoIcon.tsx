import React from 'react'

interface TexugoIconProps {
  className?: string
  size?: number
}

export const TexugoIcon: React.FC<TexugoIconProps> = ({ className = 'w-6 h-6', size = 24 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Container Shield / Squircle */}
      <rect
        x="16"
        y="16"
        width="480"
        height="480"
        rx="90"
        fill="#12161f"
        stroke="#3dd6c6"
        strokeWidth="10"
      />
      <rect
        x="24"
        y="24"
        width="464"
        height="464"
        rx="82"
        fill="none"
        stroke="#20c997"
        strokeWidth="3"
        strokeOpacity="0.4"
      />

      {/* Ears */}
      {/* Left Ear */}
      <polygon points="120,160 90,80 180,120" fill="#1c222e" />
      <polygon points="115,145 100,95 160,125" fill="#e1e4ea" />
      <polygon points="120,135 110,105 150,125" fill="#3dd6c6" fillOpacity="0.8" />

      {/* Right Ear */}
      <polygon points="392,160 422,80 332,120" fill="#1c222e" />
      <polygon points="397,145 412,95 352,125" fill="#e1e4ea" />
      <polygon points="392,135 402,105 362,125" fill="#3dd6c6" fillOpacity="0.8" />

      {/* Main Head Base (white cheeks & jaw) */}
      <polygon
        points="256,120 350,170 390,260 360,360 280,420 256,430 180,420 152,360 122,260 162,170"
        fill="#f0f4f8"
      />

      {/* Eye Band Left (dark) */}
      <polygon points="230,125 200,135 140,240 160,320 225,330 225,230" fill="#181d27" />

      {/* Eye Band Right (dark) */}
      <polygon points="282,125 312,135 372,240 352,320 287,330 287,230" fill="#181d27" />

      {/* Center White Stripe */}
      <polygon
        points="256,115 226,130 220,220 215,330 235,380 256,385 277,380 297,330 292,220 286,130"
        fill="#ffffff"
      />

      {/* Left Eye (glowing cyan tech eye) */}
      <polygon points="170,245 210,235 205,255 175,260" fill="#3dd6c6" />
      <polygon points="185,242 205,238 200,250 188,252" fill="#ffffff" />

      {/* Right Eye (glowing cyan tech eye) */}
      <polygon points="342,245 302,235 307,255 337,260" fill="#3dd6c6" />
      <polygon points="327,242 307,238 312,250 324,252" fill="#ffffff" />

      {/* Snout shadow */}
      <polygon points="235,370 256,360 277,370 285,410 256,425 227,410" fill="#e1e6ee" />

      {/* Nose */}
      <polygon points="232,372 280,372 268,395 256,402 244,395" fill="#12161f" />
      <line x1="242" y1="375" x2="270" y2="375" stroke="#3dd6c6" strokeWidth="3" strokeLinecap="round" />

      {/* Mouth */}
      <line x1="256" y1="402" x2="256" y2="416" stroke="#12161f" strokeWidth="3" strokeLinecap="round" />
      <line x1="244" y1="416" x2="268" y2="416" stroke="#12161f" strokeWidth="3" strokeLinecap="round" />

      {/* Tech accents */}
      <line x1="135" y1="290" x2="150" y2="310" stroke="#3dd6c6" strokeWidth="3" strokeOpacity="0.7" strokeLinecap="round" />
      <line x1="377" y1="290" x2="362" y2="310" stroke="#3dd6c6" strokeWidth="3" strokeOpacity="0.7" strokeLinecap="round" />
    </svg>
  )
}
