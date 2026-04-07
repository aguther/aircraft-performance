(function () {
  const { core, data } = window.G115B;

  function formatWindLabel(windKt) {
    const windKmh = core.knotsToKilometersPerHour(windKt);
    if (windKt === 0) {
      return "Kein Wind";
    }
    return `${Math.abs(windKt)} kt (${Math.abs(windKmh).toFixed(1)} km/h) ${windKt > 0 ? "HW" : "TW"}`;
  }

  function formatSlopeLabel(slopePercent) {
    if (slopePercent > 0) return `${slopePercent.toFixed(1)}% bergauf`;
    if (slopePercent < 0) return `${Math.abs(slopePercent).toFixed(1)}% bergab`;
    return "eben";
  }

  function createIsaDeviationClass(isaDeviationC) {
    if (Math.abs(isaDeviationC) < 0.1) return "";
    return isaDeviationC > 0 ? "warn" : "good";
  }

  function calculateTakeoff(inputs) {
    const pageData = data.takeoff;
    const windKmh = core.knotsToKilometersPerHour(inputs.windKt);
    const atmosphere = core.densityAltitude(inputs.pressureAltitudeFt, inputs.oatC);
    const rotateSpeedKmh = core.interpolate1D(pageData.rotateSpeedMassBreakpoints, pageData.rotateSpeedKmh, inputs.massKg);
    const speedAt15mKmh = core.interpolate1D(pageData.rotateSpeedMassBreakpoints, pageData.speedAt15mKmh, inputs.massKg);

    const step1GroundRollMeters = core.lookup2D(pageData.groundRollFromAtmosphere, inputs.pressureAltitudeFt, inputs.oatC);
    const step2GroundRollMeters = core.lookup2D(pageData.groundRollFromMass, step1GroundRollMeters, inputs.massKg);
    const step3GroundRollMeters = core.lookup2D(pageData.groundRollFromSlope, step2GroundRollMeters, inputs.slopePercent);
    const step4GroundRollMeters = core.lookup2D(pageData.groundRollFromWind, step3GroundRollMeters, windKmh);
    const groundRollWithMarginMeters = step4GroundRollMeters * (1 + inputs.safetyMarginPercent / 100);
    const takeoffDistanceMeters = core.lookup2D(pageData.takeoffDistanceOver15m, groundRollWithMarginMeters, 15);

    const warnings = [];
    if (inputs.massKg > 920) warnings.push({ text: "Masse ueberschreitet MTOW (920 kg).", danger: true });
    if (inputs.windKt < -5) warnings.push({ text: `Rueckenwind ${Math.abs(inputs.windKt)} kt ueberschreitet AFM-Grenzwert.`, danger: false });
    if (inputs.slopePercent < -2 || inputs.slopePercent > 2) warnings.push({ text: "Neigung ausserhalb Tabellenbereich (+/-2%).", danger: false });
    if (atmosphere.densityAltitudeFt > 8000) warnings.push({ text: `DA ${atmosphere.densityAltitudeFt.toLocaleString("de-DE")} ft ausserhalb nominalem Bereich.`, danger: true });
    else if (atmosphere.densityAltitudeFt > 5000) warnings.push({ text: `DA ${atmosphere.densityAltitudeFt.toLocaleString("de-DE")} ft: Gemisch verarmen (POH 4.11).`, danger: false });

    return {
      warnings,
      atmosphere,
      atmosphereDisplay: {
        densityAltitudeWarn: atmosphere.densityAltitudeFt > 5000,
        isaDeviationText: `${core.formatSigned(atmosphere.isaDeviationC, 1)} °C`,
        isaDeviationClass: createIsaDeviationClass(atmosphere.isaDeviationC),
      },
      steps: [
        { name: "Schritt 1 - Atmosphaere", detail: `PA ${inputs.pressureAltitudeFt.toLocaleString("de-DE")} ft · OAT ${inputs.oatC} °C`, value: `${core.round(step1GroundRollMeters)} m` },
        { name: "Schritt 2 - Masse", detail: `${core.round(step1GroundRollMeters)} m · ${inputs.massKg} kg`, value: `${core.round(step2GroundRollMeters)} m` },
        { name: "Schritt 3 - Slope", detail: `${core.round(step2GroundRollMeters)} m · ${formatSlopeLabel(inputs.slopePercent)}`, value: `${core.round(step3GroundRollMeters)} m` },
        { name: "Schritt 4 - Wind", detail: `${core.round(step3GroundRollMeters)} m · ${formatWindLabel(inputs.windKt)}`, value: `${core.round(step4GroundRollMeters)} m` },
        { name: `Zuschlag ${inputs.safetyMarginPercent}%`, detail: `${core.round(step4GroundRollMeters)} m × ${(1 + inputs.safetyMarginPercent / 100).toFixed(2)}`, value: `${core.round(groundRollWithMarginMeters)} m` },
        { name: "Schritt 5 - Hindernis 15 m", detail: `${core.round(groundRollWithMarginMeters)} m -> ueber 15 m`, value: `${core.round(takeoffDistanceMeters)} m` },
      ],
      results: { groundRollMeters: core.round(groundRollWithMarginMeters), takeoffDistanceMeters: core.round(takeoffDistanceMeters) },
      speeds: { rotateSpeedKmh, speedAt15mKmh },
      conditions: ["Vorderste Schwerpunktlage", "Vollgas", "Gemisch fuer groesste Leistung", "Klappen 12°", "Befestigte, trockene Startbahn"],
    };
  }

  function calculateLanding(inputs) {
    const pageData = data.landing;
    const windKmh = core.knotsToKilometersPerHour(inputs.windKt);
    const atmosphere = core.densityAltitude(inputs.pressureAltitudeFt, inputs.oatC);
    const approachSpeedKmh = core.interpolate1D(pageData.approachSpeedMassBreakpoints, pageData.approachSpeedKmh, inputs.massKg);
    const step1LandingRollMeters = core.lookup2D(pageData.landingRollFromAtmosphere, inputs.pressureAltitudeFt, inputs.oatC);
    const step2LandingRollMeters = core.lookup2D(pageData.landingRollFromMass, step1LandingRollMeters, inputs.massKg);
    const slopeCorrectionFactor = inputs.slopePercent >= 0 ? 1 - 0.04 * inputs.slopePercent : 1 + 0.03 * Math.abs(inputs.slopePercent);
    const step3LandingRollMeters = step2LandingRollMeters * slopeCorrectionFactor;
    const step4LandingRollMeters = core.lookup2D(pageData.landingRollFromWind, step3LandingRollMeters, windKmh);
    const landingRollWithMarginMeters = step4LandingRollMeters * (1 + inputs.safetyMarginPercent / 100);
    const landingDistanceMeters = core.lookup2D(pageData.landingDistanceOver15m, landingRollWithMarginMeters, 15);

    const warnings = [];
    if (inputs.massKg > 920) warnings.push({ text: "Masse ueberschreitet MTOW (920 kg).", danger: true });
    if (inputs.windKt < -5) warnings.push({ text: "Rueckenwind ueberschreitet AFM-Grenzwert.", danger: false });
    if (atmosphere.densityAltitudeFt > 8000) warnings.push({ text: `DA ${atmosphere.densityAltitudeFt.toLocaleString("de-DE")} ft ausserhalb nominalem Bereich.`, danger: true });
    else if (atmosphere.densityAltitudeFt > 5000) warnings.push({ text: `DA ${atmosphere.densityAltitudeFt.toLocaleString("de-DE")} ft: Gemisch verarmen (POH 4.11).`, danger: false });

    return {
      warnings,
      atmosphere,
      atmosphereDisplay: {
        densityAltitudeWarn: atmosphere.densityAltitudeFt > 5000,
        isaDeviationText: `${core.formatSigned(atmosphere.isaDeviationC, 1)} °C`,
        isaDeviationClass: createIsaDeviationClass(atmosphere.isaDeviationC),
      },
      steps: [
        { name: "Schritt 1 - Atmosphaere", detail: `PA ${inputs.pressureAltitudeFt.toLocaleString("de-DE")} ft · OAT ${inputs.oatC} °C`, value: `${core.round(step1LandingRollMeters)} m` },
        { name: "Schritt 2 - Masse", detail: `${core.round(step1LandingRollMeters)} m · ${inputs.massKg} kg`, value: `${core.round(step2LandingRollMeters)} m` },
        { name: "Schritt 3 - Slope", detail: `${core.round(step2LandingRollMeters)} m · ${formatSlopeLabel(inputs.slopePercent)}`, value: `${core.round(step3LandingRollMeters)} m` },
        { name: "Schritt 4 - Wind", detail: `${core.round(step3LandingRollMeters)} m · ${formatWindLabel(inputs.windKt)}`, value: `${core.round(step4LandingRollMeters)} m` },
        { name: `Zuschlag ${inputs.safetyMarginPercent}%`, detail: `${core.round(step4LandingRollMeters)} m × ${(1 + inputs.safetyMarginPercent / 100).toFixed(2)}`, value: `${core.round(landingRollWithMarginMeters)} m` },
        { name: "Schritt 5 - Hindernis 15 m", detail: `${core.round(landingRollWithMarginMeters)} m -> ueber 15 m`, value: `${core.round(landingDistanceMeters)} m` },
      ],
      results: { landingRollMeters: core.round(landingRollWithMarginMeters), landingDistanceMeters: core.round(landingDistanceMeters) },
      speeds: { approachSpeedKmh },
      conditions: ["Befestigte, trockene Bahn", "Leerlauf", "Klappen 40°", "Max. vordere Schwerpunktlage"],
    };
  }

  function calculateCruise(inputs) {
    const pageData = data.cruise;
    const rpm = core.lookup2D(pageData.rpmTable, inputs.powerPercent, inputs.densityAltitudeFt);
    const fuelFlowLitersPerHour = core.interpolate1D(pageData.fuelFlowPowerBreakpoints, pageData.fuelFlowLitersPerHour, Math.min(inputs.powerPercent, 75));
    const tasKmh = core.lookup2D(pageData.tasTable, inputs.powerPercent, inputs.densityAltitudeFt);
    const tasKt = core.kilometersPerHourToKnots(tasKmh);

    return {
      rpm,
      fuelFlowLitersPerHour,
      tasKmh,
      tasKt,
      nauticalMilesPerLiter: tasKt / fuelFlowLitersPerHour,
      displayPowerLabel: inputs.powerPercent >= 100 ? "Vollgas" : `${inputs.powerPercent}%`,
    };
  }

  function calculateClimbRate(inputs) {
    const pageData = data.climbRate;
    const climbSpeedKmh = core.lookup2D(pageData.climbSpeedTable, inputs.massKg, inputs.referencePressureAltitudeFt);
    const climbRateFpm = Math.max(0, core.lookup2D(pageData.rateOfClimbTable, inputs.massKg, inputs.densityAltitudeFt));
    return {
      warnings: climbRateFpm < 50 ? [{ text: "Steigrate sehr gering - Diagrammgrenze erreicht.", danger: false }] : [],
      climbSpeedKmh,
      climbRateFpm,
      climbRateMs: climbRateFpm * 0.00508,
      conditions: ["Vollgas", "Gemisch fuer groesste Leistung", "Klappen 0°", "V = VY", "Mittlere Schwerpunktlage"],
    };
  }

  function calculateClimbProfilePoint(densityAltitudeFt) {
    const climbProfile = data.climb.cumulativeClimbPerformance;
    if (densityAltitudeFt <= 0) return { timeMinutes: 0, fuelLiters: 0, distanceKm: 0 };
    const lastEntry = climbProfile[climbProfile.length - 1];
    if (densityAltitudeFt >= lastEntry[0]) return { timeMinutes: lastEntry[1], fuelLiters: lastEntry[2], distanceKm: lastEntry[3] };

    for (let index = 0; index < climbProfile.length - 1; index += 1) {
      const [leftDa, leftTime, leftFuel, leftDistance] = climbProfile[index];
      const [rightDa, rightTime, rightFuel, rightDistance] = climbProfile[index + 1];
      if (densityAltitudeFt >= leftDa && densityAltitudeFt <= rightDa) {
        const ratio = (densityAltitudeFt - leftDa) / (rightDa - leftDa);
        return {
          timeMinutes: leftTime + ratio * (rightTime - leftTime),
          fuelLiters: leftFuel + ratio * (rightFuel - leftFuel),
          distanceKm: leftDistance + ratio * (rightDistance - leftDistance),
        };
      }
    }
    return { timeMinutes: 0, fuelLiters: 0, distanceKm: 0 };
  }

  function calculateClimb(inputs) {
    if (inputs.destinationDensityAltitudeFt <= inputs.departureDensityAltitudeFt) {
      return { error: { text: "Ziel-Dichtehoehe muss groesser als Start-Dichtehoehe sein.", danger: true } };
    }

    const departureCumulative = calculateClimbProfilePoint(inputs.departureDensityAltitudeFt);
    const destinationCumulative = calculateClimbProfilePoint(inputs.destinationDensityAltitudeFt);
    const climbDistanceKm = destinationCumulative.distanceKm - departureCumulative.distanceKm;

    return {
      departureCumulative,
      destinationCumulative,
      climbTimeMinutes: destinationCumulative.timeMinutes - departureCumulative.timeMinutes,
      climbFuelLiters: destinationCumulative.fuelLiters - departureCumulative.fuelLiters,
      climbDistanceKm,
      climbDistanceNm: climbDistanceKm / core.KMH_PER_KT,
      conditions: ["Vollgas", "Gemisch fuer groesste Leistung", "Klappen 0°", "V = VY", "Standardatmosphaere", "Max. Abfluggewicht · vorderste SL"],
    };
  }

  function calculateRange(inputs) {
    const rangeKm = core.lookup2D(data.range.rangeTable, inputs.powerPercent, inputs.densityAltitudeFt);
    const warnings = [];
    if (inputs.densityAltitudeFt > 20000) warnings.push({ text: "DA ueber 20.000 ft - ausserhalb Diagrammbereich.", danger: true });
    if (inputs.powerPercent >= 75 && inputs.densityAltitudeFt > 10000) warnings.push({ text: "75% Leistung: Diagrammlinie endet bei DA 10.000 ft.", danger: false });
    return {
      warnings,
      rangeKm,
      rangeNm: rangeKm / core.KMH_PER_KT,
      note: "Die Reichweite beinhaltet die Kraftstoffmenge fuer Warmlaufen, Takeoff, Steigflug und die 45 min. Reserve fuer maximale Reichweite.",
    };
  }

  function calculateEndurance(inputs) {
    const pageData = data.endurance;
    const fuelFlowLitersPerHour = core.interpolate1D(pageData.fuelFlowPowerBreakpoints, pageData.fuelFlowLitersPerHour, inputs.powerPercent);
    const reserveFuelLiters = fuelFlowLitersPerHour * pageData.reserveHours;
    const enduranceHoursTotal = inputs.fuelLiters / fuelFlowLitersPerHour;
    const enduranceHoursWithReserve = Math.max(0, enduranceHoursTotal - pageData.reserveHours);
    const usableFuelLiters = Math.max(0, inputs.fuelLiters - reserveFuelLiters);
    const warnings = [];
    if (inputs.fuelLiters > pageData.maximumUsableFuelLiters) warnings.push({ text: `Kraftstoffmenge ueberschreitet max. ausfliegbare Menge (${pageData.maximumUsableFuelLiters} l).`, danger: true });
    if (inputs.fuelLiters < reserveFuelLiters) warnings.push({ text: `Kraftstoff reicht nicht fuer 45 min Reserve (${reserveFuelLiters.toFixed(1)} l benoetigt).`, danger: true });
    return {
      warnings,
      fuelFlowLitersPerHour,
      reserveFuelLiters,
      enduranceHoursTotal,
      enduranceHoursWithReserve,
      usableFuelLiters,
    };
  }

  function calculateStall(inputs) {
    const speedSeries = (() => {
      const speeds = data.stall.speedsKmh;
      if (inputs.powerMode === "vollast") {
        if (inputs.flapsDegrees === 0) return speeds.fullPower.flaps0;
        if (inputs.flapsDegrees === 12) return speeds.fullPower.flaps12;
        return speeds.fullPower.flaps40;
      }
      if (inputs.flapsDegrees === 0) return speeds.idle.flaps0;
      if (inputs.flapsDegrees === 12) return speeds.idle.flaps12;
      return speeds.idle.flaps40;
    })();

    const stallSpeedKmh = core.interpolate1D(data.stall.massBreakpoints, speedSeries, inputs.massKg);
    return {
      stallSpeedKmh,
      stallSpeedKt: core.kilometersPerHourToKnots(stallSpeedKmh),
      stallLabel: inputs.flapsDegrees === 40 ? "VSO" : "VS1",
      conditions: ["Lastvielfaches n = 1", "Gerade Fluglage", "IAS-Angaben", "Ablesewert aus POH Bild 5.3.4"],
    };
  }

  window.G115B = window.G115B || {};
  window.G115B.calculators = {
    calculateTakeoff,
    calculateLanding,
    calculateCruise,
    calculateClimbRate,
    calculateClimb,
    calculateRange,
    calculateEndurance,
    calculateStall,
  };
})();
