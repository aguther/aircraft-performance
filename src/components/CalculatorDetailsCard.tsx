import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

export function CalculatorDetailsCard({
  children,
  description,
  title,
  wide = false,
}: {
  children: ReactNode;
  description: string;
  title: string;
  wide?: boolean;
}) {
  return (
    <details className={`card calculator-details-card${wide ? " takeoff-chart-card" : ""}`}>
      <summary>
        <span>
          <strong className="card-title">{title}</strong>
          <small>{description}</small>
        </span>
        <ChevronDown aria-hidden="true" />
      </summary>
      <div className="calculator-details-body">{children}</div>
    </details>
  );
}
