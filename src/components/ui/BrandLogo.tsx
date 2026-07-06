export function BrandLogo({ className }: { className?: string }) {
  return (
    <span className={`brand-logo ${className ?? ""}`}>
      <span className="brand-gen">›gen</span>
      <span className="brand-work">work</span>
    </span>
  );
}
