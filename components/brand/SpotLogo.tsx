import Image from "next/image";

export function SpotLogo({
  size = 36,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src="/spot-logo.jpg"
      alt=""
      width={size}
      height={size}
      className={`shrink-0 object-contain ${className}`}
      aria-hidden
      priority
    />
  );
}
