declare namespace G115B {
  interface Warning {
    text: string;
    danger: boolean;
  }

  interface Atmosphere {
    densityAltitudeFt: number;
    isaDeviationC: number;
    isaTemperatureC: number;
  }

  interface Core {
    KMH_PER_KT: number;
    KT_PER_KMH: number;
    FEET_PER_FLIGHT_LEVEL: number;
    PRESSURE_ALTITUDE_FEET_PER_HPA: number;
    round(value: number): number;
    formatSigned(value: number, digits: number): string;
    interpolate1D(breakpoints: number[], values: number[], input: number): number;
    findBracket(breakpoints: number[], input: number): { start: number; end: number };
    lookup2D(table: any, rowInput: number, columnInput: number): number;
    pressureAltitudeFromQnh(fieldElevationFt: number, qnhHpa: number): number;
    densityAltitude(pressureAltitudeFt: number, oatCelsius: number): Atmosphere;
    kilometersPerHourToKnots(speedKmh: number): number;
    knotsToKilometersPerHour(speedKt: number): number;
    flightLevelToFeet(flightLevel: number): number;
  }

  interface AtmosphereCardConfig {
    densityAltitudeFt: number;
    densityAltitudeWarn: boolean;
    isaDeviationText?: string;
    isaDeviationClass?: string;
  }

  interface MetricItemConfig {
    className?: string;
    labelClassName?: string;
    valueClassName?: string;
    subtextClassName?: string;
    label: string;
    value: string | number;
    unit?: string;
    subtext?: string;
    valueStyle?: Partial<CSSStyleDeclaration>;
  }

  interface PipelineStep {
    name: string;
    detail: string;
    value: string;
  }

  interface UI {
    el(tagName: string, options?: any, ...children: any[]): HTMLElement;
    applyTheme(themePreference: string): void;
    initTheme(): void;
    toggleTheme(): void;
    setupNavigationDropdown(): void;
    toggleMenu(): void;
    updateSliderLabel(rangeId: string, value: string | number, config?: any): void;
    syncSlider(inputId: string, rangeId: string, config?: any): void;
    syncInput(inputId: string, rangeId: string, config?: any): void;
    createCard(title: string, content: Node | string): HTMLElement;
    createDisclaimerCard(): HTMLElement;
    createWarnings(warnings?: Warning[]): HTMLElement | null;
    createAtmosphereCard(config: AtmosphereCardConfig): HTMLElement;
    createMetricItem(config: MetricItemConfig): HTMLElement;
    createGridCard(title: string, gridClassName: string, items: Array<Node | string>): HTMLElement;
    createConditionsCard(conditions: string[]): HTMLElement;
    createContextCard(config: { title?: string; atmosphere?: AtmosphereCardConfig; conditions?: string[]; warnings?: Warning[] }): HTMLElement;
    createPipelineCard(steps: PipelineStep[]): HTMLElement;
    replaceContent(target: Element, nodes: Array<Node | null | undefined | false>): void;
    resolveTheme(themePreference: string): "dark" | "light";
  }

  interface TakeoffInputs {
    pressureAltitudeFt: number;
    oatC: number;
    massKg: number;
    slopePercent: number;
    windKt: number;
    safetyMarginPercent: number;
  }

  interface TakeoffResult {
    warnings: Warning[];
    atmosphere: Atmosphere;
    groundRollByAtmosphereMeters: number;
    groundRollByMassMeters: number;
    groundRollBySlopeMeters: number;
    groundRollByWindMeters: number;
    groundRollMarginMeters: number;
    groundRollMeters: number;
    takeoffDistanceWithoutMarginMeters: number;
    takeoffDistanceMeters: number;
    rotateSpeedKmh: number;
    speedAt15mKmh: number;
    conditions: string[];
  }

  interface LandingInputs {
    pressureAltitudeFt: number;
    oatC: number;
    massKg: number;
    windKt: number;
    safetyMarginPercent: number;
  }

  interface LandingResult {
    warnings: Warning[];
    atmosphere: Atmosphere;
    landingRollByAtmosphereChartMeters: number;
    landingRollByAtmosphereMeters: number;
    landingRollByMassChartMeters: number;
    landingRollByMassMeters: number;
    landingRollByWindChartMeters: number;
    landingRollByWindMeters: number;
    landingRollMarginMeters: number;
    landingRollMeters: number;
    landingDistanceWithoutMarginMeters: number;
    landingDistanceMeters: number;
    approachSpeedKmh: number;
    referenceSpeedKmh: number;
    conditions: string[];
  }

  interface CruiseInputs {
    powerPercent: number;
    densityAltitudeFt: number;
  }

  interface CruiseResult {
    rpm: number;
    fuelFlowLitersPerHour: number;
    tasKmh: number;
    tasKt: number;
    nauticalMilesPerLiter: number;
    powerLabel: string;
  }

  interface ClimbRateInputs {
    massKg: number;
    referencePressureAltitudeFt: number;
    densityAltitudeFt: number;
  }

  interface ClimbRateResult {
    warnings: Warning[];
    climbSpeedKmh: number;
    climbRateFpm: number;
    climbRateMs: number;
    conditions: string[];
  }

  interface ClimbProfilePoint {
    timeMinutes: number;
    fuelLiters: number;
    distanceKm: number;
  }

  interface ClimbInputs {
    departureDensityAltitudeFt: number;
    destinationDensityAltitudeFt: number;
  }

  interface ClimbResult {
    error?: Warning;
    departureCumulative: ClimbProfilePoint;
    destinationCumulative: ClimbProfilePoint;
    climbTimeMinutes: number;
    climbFuelLiters: number;
    climbDistanceKm: number;
    climbDistanceNm: number;
    conditions: string[];
  }

  interface StallInputs {
    massKg: number;
    powerMode: "leerlauf" | "vollast";
    flapsDegrees: 0 | 12 | 40;
  }

  interface StallResult {
    stallSpeedKmh: number;
    stallSpeedKt: number;
    stallLabel: "VSO" | "VS1";
    conditions: string[];
  }

  interface WeightBalanceInputs {
    aircraftName: string;
    pilotMassKg: number;
    copilotMassKg: number;
    baggageMassKg: number;
    fuelLiters: number;
  }

  interface WeightBalanceResult {
    warnings: Warning[];
    emptyAircraft: { name: string; massKg: number; armM: number };
    fuelMassKg: number;
    totalMassKg: number;
    totalMomentKgM: number;
    cgArmM: number;
    withinEnvelope: boolean;
    stations: Array<{ label: string; massKg: number; armM: number; momentKgM: number }>;
    speeds: {
      rotateSpeedKmh: number;
      speedAt15mKmh: number;
      approachSpeedKmh: number;
      referenceSpeedKmh: number;
      stallIdleFlaps40Kmh: number;
    };
    conditions: string[];
  }

  interface Calculators {
    calculateTakeoff(inputs: TakeoffInputs): TakeoffResult;
    calculateLanding(inputs: LandingInputs): LandingResult;
    calculateCruise(inputs: CruiseInputs): CruiseResult;
    calculateClimbRate(inputs: ClimbRateInputs): ClimbRateResult;
    calculateClimb(inputs: ClimbInputs): ClimbResult;
    calculateStall(inputs: StallInputs): StallResult;
    calculateWeightBalance(inputs: WeightBalanceInputs): WeightBalanceResult;
  }

  interface AppContext {
    core: Core;
    ui: UI;
    data: any;
    calculators: Calculators;
  }
}

declare global {
  interface Window {
    G115B: G115B.AppContext;
    toggleTheme: () => void;
    toggleMenu: () => void;
    syncSlider: (inputId: string, rangeId: string, config?: any) => void;
    syncInput: (inputId: string, rangeId: string, config?: any) => void;
    setMode?: (mode: string) => void;
    setPAMode?: (mode: string) => void;
    setLeg?: (whichLeg: string, mode: string) => void;
    setPower?: (powerMode: "leerlauf" | "vollast") => void;
    setFlaps?: (flapsDegrees: 0 | 12 | 40) => void;
    setAircraft?: (aircraftName: string) => void;
    calcDA?: () => void;
    calcPAFromQNH?: () => void;
    calcLeg?: () => void;
  }
}

export {};
