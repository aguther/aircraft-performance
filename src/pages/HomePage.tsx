import type { AircraftDefinition } from "../app/aircraft";
import { Link } from "react-router-dom";
import {
  calculatorRegistry,
  type CalculatorDefinition,
} from "../app/calculators";

type HomePageProps = {
  aircraft: AircraftDefinition;
};

type CalculatorGroupProps = {
  title: string;
  description: string;
  calculators: CalculatorDefinition[];
};

function CalculatorGroup({
  title,
  description,
  calculators,
}: CalculatorGroupProps) {
  return (
    <section className="idx-group">
      <div className="idx-group-head">
        <div className="idx-section">{title}</div>
        <div className="idx-group-copy">{description}</div>
      </div>
      <div className="idx-grid">
        {calculators.map((calculator) => {
          const content = (
            <>
            <div className="idx-icon">{calculator.icon}</div>
            <div className="idx-left">
              <div className="idx-tag">{calculator.tag}</div>
              <div className="idx-title">{calculator.title}</div>
              <div className="idx-desc">{calculator.description}</div>
              <div className="idx-meta">{calculator.source}</div>
            </div>
            <div className="idx-arrow">→</div>
            </>
          );

          return (
            <Link className="idx-card" to={calculator.href} key={calculator.href}>
              {content}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function HomePage({ aircraft }: HomePageProps) {
  const availableCalculators = calculatorRegistry.filter((calculator) =>
    aircraft.capabilities.includes(calculator.capability),
  );

  return (
    <main className="idx-shell">
      <CalculatorGroup
        title="Flugplanung"
        description="Rechner für Beladung, Flugleistung und Streckenplanung."
        calculators={availableCalculators.filter(
          (calculator) => calculator.group === "planning",
        )}
      />
      <CalculatorGroup
        title="Information & Referenz"
        description="Ergänzende Leistungswerte außerhalb der normalen Flugplanung."
        calculators={availableCalculators.filter(
          (calculator) => calculator.group === "reference",
        )}
      />
    </main>
  );
}
