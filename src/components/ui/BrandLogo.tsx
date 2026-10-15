import { BrandLogo as GenBrandLogo } from "@gen/ui";

/** Logotipo "›genwork" (BrandLogo de @gen/ui con el producto fijo). */
export function BrandLogo({ className }: { className?: string }) {
  return <GenBrandLogo product="work" className={className} />;
}
