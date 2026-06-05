/** Circular puddle mark — primary brand color #6488ea */
export function SpotLogo({
  size = 40,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <circle cx="32" cy="32" r="32" fill="#6488ea" />
      <path
        d="M18 34c2-8 10-12 18-10 9 2 12 11 8 18-3 6-12 9-20 6-8-3-10-9-6-14Z"
        fill="#7d9aef"
      />
      <path
        d="M22 32c1-5 7-8 13-6 6 2 8 8 5 12-2 4-8 6-13 4-5-2-7-6-5-10Z"
        fill="#a8bdf5"
      />
      <ellipse cx="26" cy="28" rx="5" ry="2.5" fill="#d4e0fc" opacity="0.85" />
    </svg>
  );
}
