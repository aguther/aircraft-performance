(function () {
  const core = {
    KMH_PER_KT: 1.852,
    KT_PER_KMH: 0.539957,
    FEET_PER_FLIGHT_LEVEL: 100,
    PRESSURE_ALTITUDE_FEET_PER_HPA: 27,

    round(value) {
      return Math.round(value);
    },

    formatSigned(value, digits) {
      return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}`;
    },

    interpolate1D(breakpoints, values, input) {
      if (input <= breakpoints[0]) return values[0];
      const lastIndex = breakpoints.length - 1;
      if (input >= breakpoints[lastIndex]) return values[lastIndex];

      for (let index = 0; index < lastIndex; index += 1) {
        const leftBreakpoint = breakpoints[index];
        const rightBreakpoint = breakpoints[index + 1];
        if (input >= leftBreakpoint && input <= rightBreakpoint) {
          const ratio = (input - leftBreakpoint) / (rightBreakpoint - leftBreakpoint);
          return values[index] + ratio * (values[index + 1] - values[index]);
        }
      }

      return values[lastIndex];
    },

    findBracket(breakpoints, input) {
      const lastIndex = breakpoints.length - 1;
      if (input <= breakpoints[0]) return { start: 0, end: 0 };
      if (input >= breakpoints[lastIndex]) return { start: lastIndex, end: lastIndex };

      for (let index = 0; index < lastIndex; index += 1) {
        if (input >= breakpoints[index] && input <= breakpoints[index + 1]) {
          return { start: index, end: index + 1 };
        }
      }

      return { start: lastIndex, end: lastIndex };
    },

    lookup2D(table, rowInput, columnInput) {
      const rowIndexPair = this.findBracket(table.rowBreakpoints, rowInput);
      const columnIndexPair = this.findBracket(table.columnBreakpoints, columnInput);

      const rowInterpolation =
        rowIndexPair.start === rowIndexPair.end
          ? 0
          : (rowInput - table.rowBreakpoints[rowIndexPair.start]) /
            (table.rowBreakpoints[rowIndexPair.end] - table.rowBreakpoints[rowIndexPair.start]);

      const columnInterpolation =
        columnIndexPair.start === columnIndexPair.end
          ? 0
          : (columnInput - table.columnBreakpoints[columnIndexPair.start]) /
            (table.columnBreakpoints[columnIndexPair.end] - table.columnBreakpoints[columnIndexPair.start]);

      const lowerRowValue =
        table.values[rowIndexPair.start][columnIndexPair.start] +
        columnInterpolation *
          (table.values[rowIndexPair.start][columnIndexPair.end] -
            table.values[rowIndexPair.start][columnIndexPair.start]);

      const upperRowValue =
        table.values[rowIndexPair.end][columnIndexPair.start] +
        columnInterpolation *
          (table.values[rowIndexPair.end][columnIndexPair.end] -
            table.values[rowIndexPair.end][columnIndexPair.start]);

      return lowerRowValue + rowInterpolation * (upperRowValue - lowerRowValue);
    },

    pressureAltitudeFromQnh(fieldElevationFt, qnhHpa) {
      return Math.round(fieldElevationFt + (1013.25 - qnhHpa) * this.PRESSURE_ALTITUDE_FEET_PER_HPA);
    },

    densityAltitude(pressureAltitudeFt, oatCelsius) {
      const isaTemperatureC = 15 - 1.98 * (pressureAltitudeFt / 1000);
      const isaDeviationC = oatCelsius - isaTemperatureC;
      return {
        densityAltitudeFt: Math.round(pressureAltitudeFt + 120 * isaDeviationC),
        isaDeviationC,
        isaTemperatureC,
      };
    },

    kilometersPerHourToKnots(speedKmh) {
      return speedKmh * this.KT_PER_KMH;
    },

    knotsToKilometersPerHour(speedKt) {
      return speedKt * this.KMH_PER_KT;
    },

    flightLevelToFeet(flightLevel) {
      return flightLevel * this.FEET_PER_FLIGHT_LEVEL;
    },
  };

  window.G115B = window.G115B || {};
  window.G115B.core = core;
})();
