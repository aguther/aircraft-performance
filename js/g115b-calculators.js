(function () {
  const { core, data } = window.G115B;
  const VREF_STALL_FACTOR = 1.3;

  function stallIdleFlaps40Kmh(massKg) {
    return core.interpolate1D(data.stall.massBreakpoints, data.stall.speedsKmh.idle.flaps40, massKg);
  }

  function vrefKmh(massKg) {
    return stallIdleFlaps40Kmh(massKg) * VREF_STALL_FACTOR;
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
    const groundRollMarginMeters = step4GroundRollMeters * (inputs.safetyMarginPercent / 100);
    const groundRollWithMarginMeters = step4GroundRollMeters + groundRollMarginMeters;
    const takeoffDistanceWithoutMarginMeters = core.interpolate1D(
      pageData.takeoffDistanceOver15m.groundRollBreakpoints,
      pageData.takeoffDistanceOver15m.takeoffDistanceMeters,
      step4GroundRollMeters
    );
    const takeoffDistanceMeters = takeoffDistanceWithoutMarginMeters + groundRollMarginMeters;

    const warnings = [];
    if (inputs.massKg > 920) warnings.push({ text: "Masse überschreitet MTOW", danger: true });
    if (inputs.massKg < 750) warnings.push({ text: "Masse ausserhalb Diagrammbereich", danger: false });
    if (inputs.pressureAltitudeFt < -1000 || inputs.pressureAltitudeFt > 8000) warnings.push({ text: "Druckhöhe ausserhalb Diagrammbereich", danger: false });
    if (inputs.oatC < -20 || inputs.oatC > 40) warnings.push({ text: "OAT ausserhalb Diagrammbereich", danger: false });
    if (inputs.windKt < -5) warnings.push({ text: `Rückenwind ${Math.abs(inputs.windKt)} kt überschreitet AFM-Grenzwert`, danger: false });
    if (windKmh < -20 || windKmh > 40) warnings.push({ text: "Wind ausserhalb Diagrammbereich", danger: false });
    if (inputs.slopePercent < -2 || inputs.slopePercent > 2) warnings.push({ text: "Neigung ausserhalb Diagrammbereich", danger: false });
    const obstacleChartBreakpoints = pageData.takeoffDistanceOver15m.groundRollBreakpoints;
    const obstacleChartMaximumRollMeters = obstacleChartBreakpoints[obstacleChartBreakpoints.length - 1];
    if (step4GroundRollMeters > obstacleChartMaximumRollMeters) warnings.push({ text: "Startrollstrecke ausserhalb Hindernis-Diagrammbereich", danger: true });
    if (atmosphere.densityAltitudeFt > 8000) warnings.push({ text: `Dichtehöhe ausserhalb nominalem Bereich`, danger: true });
    else if (atmosphere.densityAltitudeFt > 5000) warnings.push({ text: `Dichtehöhe ${atmosphere.densityAltitudeFt.toLocaleString("de-DE")} ft: Gemisch verarmen (POH 4.11).`, danger: false });

    return {
      warnings,
      atmosphere,
      groundRollByAtmosphereMeters: step1GroundRollMeters,
      groundRollByMassMeters: step2GroundRollMeters,
      groundRollBySlopeMeters: step3GroundRollMeters,
      groundRollByWindMeters: step4GroundRollMeters,
      groundRollMarginMeters,
      groundRollMeters: core.round(groundRollWithMarginMeters),
      takeoffDistanceWithoutMarginMeters,
      takeoffDistanceMeters: core.round(takeoffDistanceMeters),
      rotateSpeedKmh,
      speedAt15mKmh,
      conditions: ["Vorderste Schwerpunktlage", "Vollgas", "Gemisch für größte Leistung", "Klappen 12°", "Befestigte, trockene Startbahn"],
    };
  }

  function calculateLanding(inputs) {
    const pageData = data.landing;
    const windKmh = core.knotsToKilometersPerHour(inputs.windKt);
    const atmosphere = core.densityAltitude(inputs.pressureAltitudeFt, inputs.oatC);
    const approachSpeedKmh = core.interpolate1D(pageData.approachSpeedMassBreakpoints, pageData.approachSpeedKmh, inputs.massKg);
    const referenceSpeedKmh = vrefKmh(inputs.massKg);
    const publishedLandingRoll = (chartRollMeters) => core.interpolate1D(
      pageData.publishedLandingRoll.chartRollBreakpoints,
      pageData.publishedLandingRoll.landingRollMeters,
      chartRollMeters
    );
    const step1LandingRollChartMeters = core.lookup2D(pageData.landingRollFromAtmosphere, inputs.pressureAltitudeFt, inputs.oatC);
    const step2LandingRollChartMeters = core.lookup2D(pageData.landingRollFromMass, step1LandingRollChartMeters, inputs.massKg);
    const windCorrection = windKmh < 0
      ? pageData.landingRollFromTailwind
      : pageData.landingRollFromHeadwind;
    const step3LandingRollChartMeters = Math.max(0, core.lookup2D(windCorrection, step2LandingRollChartMeters, windKmh));
    const step1LandingRollMeters = publishedLandingRoll(step1LandingRollChartMeters);
    const step2LandingRollMeters = publishedLandingRoll(step2LandingRollChartMeters);
    const step3LandingRollMeters = publishedLandingRoll(step3LandingRollChartMeters);
    const landingRollMarginMeters = step3LandingRollMeters * (inputs.safetyMarginPercent / 100);
    const landingRollWithMarginMeters = step3LandingRollMeters + landingRollMarginMeters;
    const landingDistanceWithoutMarginMeters = core.interpolate1D(
      pageData.landingDistanceOver15m.landingRollBreakpoints,
      pageData.landingDistanceOver15m.landingDistanceMeters,
      step3LandingRollChartMeters
    );
    const landingDistanceMeters = landingDistanceWithoutMarginMeters + landingRollMarginMeters;

    const warnings = [];
    if (inputs.massKg > 920) warnings.push({ text: "Masse überschreitet MTOW (920 kg).", danger: true });
    if (inputs.massKg < 700) warnings.push({ text: "Masse ausserhalb Diagrammbereich (700-920 kg).", danger: false });
    if (inputs.pressureAltitudeFt < 0 || inputs.pressureAltitudeFt > 8000) warnings.push({ text: "Druckhöhe ausserhalb Diagrammbereich (SL bis 8000 ft).", danger: false });
    if (inputs.oatC < -20 || inputs.oatC > 40) warnings.push({ text: "OAT ausserhalb Diagrammbereich (-20 bis +40 °C).", danger: false });
    if (inputs.windKt < -5) warnings.push({ text: "Rückenwind überschreitet AFM-Grenzwert.", danger: false });
    if (windKmh < -20 || windKmh > 40) warnings.push({ text: "Wind ausserhalb Diagrammbereich (20 km/h Rückenwind bis 40 km/h Gegenwind).", danger: false });
    const obstacleChartMaximumRollMeters = pageData.landingDistanceOver15m.maximumDigitizedLandingRollMeters;
    if (step3LandingRollChartMeters > obstacleChartMaximumRollMeters) warnings.push({ text: "Landerollstrecke ausserhalb Hindernis-Diagrammbereich.", danger: true });
    if (atmosphere.densityAltitudeFt > 8000) warnings.push({ text: `DA ${atmosphere.densityAltitudeFt.toLocaleString("de-DE")} ft ausserhalb nominalem Bereich.`, danger: true });
    else if (atmosphere.densityAltitudeFt > 5000) warnings.push({ text: `DA ${atmosphere.densityAltitudeFt.toLocaleString("de-DE")} ft: Gemisch verarmen (POH 4.11).`, danger: false });

    return {
      warnings,
      atmosphere,
      landingRollByAtmosphereChartMeters: step1LandingRollChartMeters,
      landingRollByAtmosphereMeters: step1LandingRollMeters,
      landingRollByMassChartMeters: step2LandingRollChartMeters,
      landingRollByMassMeters: step2LandingRollMeters,
      landingRollByWindChartMeters: step3LandingRollChartMeters,
      landingRollByWindMeters: step3LandingRollMeters,
      landingRollMarginMeters,
      landingRollMeters: core.round(landingRollWithMarginMeters),
      landingDistanceWithoutMarginMeters,
      landingDistanceMeters: core.round(landingDistanceMeters),
      approachSpeedKmh,
      referenceSpeedKmh,
      conditions: ["Befestigte, ebene, trockene Landebahn", "Leerlauf", "Klappen 40°", "Max. vordere Schwerpunktlage"],
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
      powerLabel: inputs.powerPercent >= 100 ? "Vollgas" : `${inputs.powerPercent}%`,
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
      conditions: ["Vollgas", "Gemisch für größte Leistung", "Klappen 0°", "V = VY", "Mittlere Schwerpunktlage"],
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
      return { error: { text: "Ziel-Dichtehöhe muss größer als Start-Dichtehöhe sein.", danger: true } };
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
      conditions: ["Vollgas", "Gemisch für größte Leistung", "Klappen 0°", "V = VY", "Standardatmosphäre", "Max. Abfluggewicht · vorderste SL"],
    };
  }

  function calculateRange(inputs) {
    const rangeKm = core.lookup2D(data.range.rangeTable, inputs.powerPercent, inputs.densityAltitudeFt);
    const warnings = [];
    if (inputs.densityAltitudeFt > 20000) warnings.push({ text: "DA über 20.000 ft - außerhalb Diagrammbereich.", danger: true });
    if (inputs.powerPercent >= 75 && inputs.densityAltitudeFt > 10000) warnings.push({ text: "75% Leistung: Diagrammlinie endet bei DA 10.000 ft.", danger: false });
    return {
      warnings,
      rangeKm,
      rangeNm: rangeKm / core.KMH_PER_KT,
      note: "Die Reichweite beinhaltet die Kraftstoffmenge für Warmlaufen, Takeoff, Steigflug und die 45 min. Reserve für maximale Reichweite.",
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
    if (inputs.fuelLiters > pageData.maximumUsableFuelLiters) warnings.push({ text: `Kraftstoffmenge überschreitet max. ausfliegbare Menge (${pageData.maximumUsableFuelLiters} l).`, danger: true });
    if (inputs.fuelLiters < reserveFuelLiters) warnings.push({ text: `Kraftstoff reicht nicht für 45 min Reserve (${reserveFuelLiters.toFixed(1)} l benötigt).`, danger: true });
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

  function isPointInPolygon(point, polygon) {
    const epsilon = 1e-9;

    function isPointOnSegment(segmentStart, segmentEnd) {
      const cross =
        (point.momentKgM - segmentStart.momentKgM) * (segmentEnd.massKg - segmentStart.massKg) -
        (point.massKg - segmentStart.massKg) * (segmentEnd.momentKgM - segmentStart.momentKgM);
      if (Math.abs(cross) > epsilon) return false;

      const withinMoment =
        point.momentKgM >= Math.min(segmentStart.momentKgM, segmentEnd.momentKgM) - epsilon &&
        point.momentKgM <= Math.max(segmentStart.momentKgM, segmentEnd.momentKgM) + epsilon;
      const withinMass =
        point.massKg >= Math.min(segmentStart.massKg, segmentEnd.massKg) - epsilon &&
        point.massKg <= Math.max(segmentStart.massKg, segmentEnd.massKg) + epsilon;

      return withinMoment && withinMass;
    }

    let inside = false;
    for (let index = 0, previousIndex = polygon.length - 1; index < polygon.length; previousIndex = index, index += 1) {
      const current = polygon[index];
      const previous = polygon[previousIndex];

      if (isPointOnSegment(current, previous)) {
        return true;
      }

      const intersects =
        current.massKg > point.massKg !== previous.massKg > point.massKg &&
        point.momentKgM <
          ((previous.momentKgM - current.momentKgM) * (point.massKg - current.massKg)) /
            (previous.massKg - current.massKg) +
            current.momentKgM;

      if (intersects) inside = !inside;
    }

    return inside;
  }

  function calculateWeightBalance(inputs) {
    const pageData = data.weightBalance;
    const emptyAircraft =
      pageData.emptyAircraft.find((aircraft) => aircraft.name === inputs.aircraftName) ||
      pageData.emptyAircraft[0];
    const pilotMassKg = Math.max(0, inputs.pilotMassKg);
    const copilotMassKg = Math.max(0, inputs.copilotMassKg);
    const baggageMassKg = Math.max(0, inputs.baggageMassKg);
    const fuelLiters = Math.max(0, inputs.fuelLiters);
    const fuelMassKg = fuelLiters * pageData.fuelDensityKgPerLiter;
    const emptyMomentKgM = emptyAircraft.massKg * emptyAircraft.armM;
    const pilotMomentKgM = pilotMassKg * pageData.stations.pilot.armM;
    const copilotMomentKgM = copilotMassKg * pageData.stations.copilot.armM;
    const baggageMomentKgM = baggageMassKg * pageData.stations.baggage.armM;
    const fuelMomentKgM = fuelMassKg * pageData.stations.fuel.armM;
    const totalMassKg = emptyAircraft.massKg + pilotMassKg + copilotMassKg + baggageMassKg + fuelMassKg;
    const totalMomentKgM = emptyMomentKgM + pilotMomentKgM + copilotMomentKgM + baggageMomentKgM + fuelMomentKgM;
    const cgArmM = totalMomentKgM / totalMassKg;
    const withinEnvelope = isPointInPolygon(
      { massKg: totalMassKg, momentKgM: totalMomentKgM },
      pageData.envelope
    );
    const warnings = [];

    if (totalMassKg > 920) warnings.push({ text: "Masse überschreitet MTOW (920 kg).", danger: true });
    if (!withinEnvelope) warnings.push({ text: "Schwerpunkt/Moment liegt außerhalb des Envelope.", danger: true });
    if (fuelLiters > pageData.maximumUsableFuelLiters) {
      warnings.push({
        text: `Kraftstoffmenge überschreitet max. ausfliegbare Menge (${pageData.maximumUsableFuelLiters} l).`,
        danger: true,
      });
    }

    return {
      warnings,
      emptyAircraft,
      fuelMassKg,
      totalMassKg,
      totalMomentKgM,
      cgArmM,
      withinEnvelope,
      stations: [
        { label: `Leergewicht ${emptyAircraft.name}`, massKg: emptyAircraft.massKg, armM: emptyAircraft.armM, momentKgM: emptyMomentKgM },
        { label: pageData.stations.pilot.label, massKg: pilotMassKg, armM: pageData.stations.pilot.armM, momentKgM: pilotMomentKgM },
        { label: pageData.stations.copilot.label, massKg: copilotMassKg, armM: pageData.stations.copilot.armM, momentKgM: copilotMomentKgM },
        { label: pageData.stations.baggage.label, massKg: baggageMassKg, armM: pageData.stations.baggage.armM, momentKgM: baggageMomentKgM },
        { label: pageData.stations.fuel.label, massKg: fuelMassKg, armM: pageData.stations.fuel.armM, momentKgM: fuelMomentKgM },
      ],
      speeds: {
        rotateSpeedKmh: core.interpolate1D(data.takeoff.rotateSpeedMassBreakpoints, data.takeoff.rotateSpeedKmh, totalMassKg),
        speedAt15mKmh: core.interpolate1D(data.takeoff.rotateSpeedMassBreakpoints, data.takeoff.speedAt15mKmh, totalMassKg),
        approachSpeedKmh: core.interpolate1D(data.landing.approachSpeedMassBreakpoints, data.landing.approachSpeedKmh, totalMassKg),
        stallIdleFlaps40Kmh: stallIdleFlaps40Kmh(totalMassKg),
        referenceSpeedKmh: vrefKmh(totalMassKg),
      },
      conditions: [
        `Kraftstoff ${pageData.fuelDensityKgPerLiter.toLocaleString("de-DE")} kg/l`,
        "Moment = Masse x Arm",
        "Geschwindigkeiten nach aktueller Masse interpoliert",
      ],
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
    calculateWeightBalance,
  };
})();
