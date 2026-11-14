// CorpBadge — consistent corp symbol badge with color/stripe support.

export { CorpBadge }
export default function CorpBadge({ sym, color, textColor, stripeColor, stripeTextColor, className = '' }) {
  const style = stripeColor
    ? {
        background: `linear-gradient(135deg, ${color} 50%, ${stripeColor} 50%)`,
        color: textColor || '#fff',
        WebkitBackgroundClip: undefined,
      }
    : { backgroundColor: color, color: textColor || '#fff' }

  return (
    <span
      className={`inline-block px-1.5 py-0.5 rounded font-bold text-xs leading-tight ${className}`}
      style={style}
    >
      {sym}
    </span>
  )
}
