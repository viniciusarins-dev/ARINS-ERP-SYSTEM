import type { SVGProps } from "react";

/** Estrela de 4 pontas — o "glifo" da marca, herdado da estética Y2K. */
export function Sparkle(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 1.5c.7 5.4 5.1 9.8 10.5 10.5-5.4.7-9.8 5.1-10.5 10.5C11.3 17.1 6.9 12.7 1.5 12 6.9 11.3 11.3 6.9 12 1.5Z" />
    </svg>
  );
}
