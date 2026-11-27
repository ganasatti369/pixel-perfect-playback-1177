import { Link } from "@tanstack/react-router";
export function AgriMark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="36"
      height="36"
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <path d="M20 34V17" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M20 23C8 24 3 14 4 7c11-1 18 6 16 16Z" fill="currentColor" />
      <path d="M21 17C20 7 28 2 37 3c1 9-6 16-16 14Z" fill="currentColor" />
      <path
        d="m9 12 10 10M31 8l-9 9"
        stroke="var(--primary-foreground)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path d="M6 35h28" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}
export function Brand() {
  return (
    <Link to="/" className="brand">
      <span className="brand-mark">
        <AgriMark />
      </span>
      <span className="brand-name">
        AgriCare<span className="brand-ai">AI</span>
      </span>
    </Link>
  );
}
