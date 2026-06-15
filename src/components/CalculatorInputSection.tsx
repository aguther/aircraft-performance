import type { ReactNode } from "react";

export function CalculatorInputSection({
  children,
  description,
  icon,
  title,
}: {
  children: ReactNode;
  description?: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <section className="calculator-input-section">
      <header className="calculator-input-header">
        <span className="calculator-input-icon">{icon}</span>
        <span>
          <strong>{title}</strong>
          {description ? <small>{description}</small> : null}
        </span>
      </header>
      <div className="calculator-input-body">{children}</div>
    </section>
  );
}
