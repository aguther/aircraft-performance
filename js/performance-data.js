(function () {
  // Tabellenkonvention:
  // - rowBreakpoints definieren die Zeilenachse.
  // - columnBreakpoints definieren die Spaltenachse.
  // - values[rowIndex][columnIndex] gehört immer zur jeweiligen Zeile/Spalte.
  // - Kommentare über values zeigen die Spaltenreihenfolge, Kommentare vor jeder Zeile den Zeilenkopf.
  const data = {
    takeoff: {
      source: "POH 5.3.7",
      digitization: "Bild 5.3.7 Startstrecke, Ausgabe 1, August 1992",

      groundRollFromAtmosphere: {
        rowBreakpoints: [
          -1000, 0, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000,
        ], // pressure altitude ft
        columnBreakpoints: [-20, 40], // OAT C
        values: [
          // OAT C:       -20   40
          /* -1000 ft */ [190, 262],
          /*     0 ft */ [205, 282],
          /*  1000 ft */ [221, 301],
          /*  2000 ft */ [236, 323],
          /*  3000 ft */ [255, 346],
          /*  4000 ft */ [274, 374],
          /*  5000 ft */ [296, 401],
          /*  6000 ft */ [318, 428],
          /*  7000 ft */ [342, 458],
          /*  8000 ft */ [369, 498],
        ], // ground roll m
      },

      groundRollFromMass: {
        rowBreakpoints: [205, 255, 303, 353, 408, 462, 512, 561], // prior ground roll m
        columnBreakpoints: [750, 770, 820, 870, 920], // mass kg
        values: [
          // mass kg:  750  770  820  870  920
          /* 205 m */ [140, 146, 165, 185, 205],
          /* 255 m */ [174, 183, 205, 230, 255],
          /* 303 m */ [203, 215, 245, 275, 303],
          /* 353 m */ [240, 252, 284, 317, 353],
          /* 408 m */ [274, 288, 323, 364, 408],
          /* 462 m */ [305, 321, 362, 410, 462],
          /* 512 m */ [340, 355, 400, 452, 512],
          /* 561 m */ [374, 392, 441, 498, 561],
        ], // corrected ground roll m
      },

      groundRollFromSlope: {
        rowBreakpoints: [104, 153, 204, 256, 304, 353, 404, 452, 506, 556], // prior ground roll m
        columnBreakpoints: [-2, 0, 2], // slope percent
        values: [
          // slope %:   -2    0    2
          /* 104 m */ [94, 104, 117],
          /* 153 m */ [140, 153, 175],
          /* 204 m */ [185, 204, 231],
          /* 256 m */ [227, 256, 288],
          /* 304 m */ [274, 304, 343],
          /* 353 m */ [319, 353, 402],
          /* 404 m */ [363, 404, 453],
          /* 452 m */ [408, 452, 511],
          /* 506 m */ [453, 506, 570],
          /* 556 m */ [499, 556, 622],
        ], // corrected ground roll m
      },

      groundRollFromWind: {
        rowBreakpoints: [155, 209, 256, 304, 354, 405, 453, 502, 555], // prior ground roll m
        columnBreakpoints: [-20, -10, 0, 10, 20, 30, 40], // wind km/h (negative = tailwind)
        values: [
          // wind km/h:  -20  -10    0   10   20   30   40
          /* 155 m */ [227, 187, 155, 123, 96, 76, 55],
          /* 209 m */ [298, 251, 209, 164, 128, 100, 74],
          /* 256 m */ [371, 310, 256, 204, 161, 124, 93],
          /* 304 m */ [441, 369, 304, 245, 189, 147, 112],
          /* 354 m */ [517, 430, 354, 283, 222, 169, 127],
          /* 405 m */ [589, 490, 405, 324, 254, 193, 145],
          /* 453 m */ [661, 552, 453, 361, 283, 214, 158],
          /* 502 m */ [733, 610, 502, 402, 313, 242, 174],
          /* 555 m */ [807, 671, 555, 442, 342, 265, 193],
        ], // corrected ground roll m
      },

      takeoffDistanceOver15m: {
        groundRollBreakpoints: [52, 154, 168, 175, 249, 348, 449, 545, 645, 742, 843], // ground roll m
        takeoffDistanceMeters: [94, 277, 320, 321, 460, 632, 814, 996, 1183, 1359, 1538], // fixed 15 m obstacle
      },

      rotateSpeedMassBreakpoints: [770, 820, 870, 920], // mass kg
      rotateSpeedKmh: [89, 91, 92, 96], // km/h
      speedAt15mKmh: [113, 117, 120, 124], // km/h
    },

    landing: {
      source: "POH 5.3.15",
      digitization: "Bild 5.3.15 Landestrecke, Ausgabe 1, August 1992",

      landingRollFromAtmosphere: {
        rowBreakpoints: [
          0, 2000, 4000, 6000, 8000,
        ], // pressure altitude ft
        columnBreakpoints: [-20, -10, 0, 10, 20, 30, 40], // OAT C
        values: [
          // OAT C:       -20  -10    0   10   20   30   40
          /*     0 ft */ [176, 181, 186, 192, 198, 205, 212],
          /*  2000 ft */ [187, 192, 198, 204, 212, 220, 228],
          /*  4000 ft */ [201, 208, 215, 222, 230, 239, 247],
          /*  6000 ft */ [214, 222, 230, 241, 250, 262, 273],
          /*  8000 ft */ [233, 242, 251, 261, 273, 287, 303],
        ], // landing roll m
      },

      landingRollFromMass: {
        rowBreakpoints: [0, 190, 257, 310, 400], // prior landing roll m at 920 kg
        columnBreakpoints: [700, 920], // mass kg; diagram correction lines are straight
        values: [
          // mass kg: 700  920
          /*   0 m */ [0, 0],
          /* 190 m */ [94, 190],
          /* 257 m */ [131, 257],
          /* 310 m */ [163, 310],
          /* 400 m */ [220, 400],
        ], // corrected landing roll m
      },

      landingRollFromTailwind: {
        rowBreakpoints: [0, 92, 129, 161, 220, 254, 307, 400], // prior landing roll m
        columnBreakpoints: [-20, 0], // tailwind km/h
        values: [
          // wind km/h: -20    0
          /*   0 m */ [0, 0],
          /*  92 m */ [164, 92],
          /* 129 m */ [209, 129],
          /* 161 m */ [255, 161],
          /* 220 m */ [323, 220],
          /* 254 m */ [362, 254],
          /* 307 m */ [431, 307],
          /* 400 m */ [550, 400],
        ], // corrected landing roll m
      },

      landingRollFromHeadwind: {
        rowBreakpoints: [0, 130, 174, 220, 266, 307, 400], // prior landing roll m
        columnBreakpoints: [0, 40], // headwind km/h
        values: [
          // wind km/h:   0   40
          /*   0 m */ [0, -48],
          /* 130 m */ [130, 17],
          /* 174 m */ [174, 39],
          /* 220 m */ [220, 58],
          /* 266 m */ [266, 85],
          /* 307 m */ [307, 114],
          /* 400 m */ [400, 190],
        ], // corrected landing roll m
      },

      landingDistanceOver15m: {
        landingRollBreakpoints: [-32, 85, 127, 172, 256, 330, 400], // chart roll coordinate; lowest line enters through bottom edge
        landingDistanceMeters: [192, 346, 425, 500, 654, 788, 915], // fixed 15 m obstacle; includes the printed POH example
        maximumDigitizedLandingRollMeters: 330,
      },

      publishedLandingRoll: {
        chartRollBreakpoints: [0, 101, 127, 195, 298, 400],
        landingRollMeters: [0, 150, 175, 250, 350, 450],
      },

      approachSpeedMassBreakpoints: [700, 750, 800, 850, 920], // mass kg
      approachSpeedKmh: [107, 111, 115, 118, 123], // km/h
    },

    cruise: {
      source: "POH 5.3.10-12",

      rpmTable: {
        rowBreakpoints: [45, 55, 65, 75, 100], // power percent
        columnBreakpoints: [
          0, 2000, 4000, 6000, 8000, 10000, 12000, 14000, 16000, 18000, 20000,
        ], // density altitude ft
        values: [
          // DA ft:         0  2000  4000  6000  8000 10000 12000 14000 16000 18000 20000
          // Digitised from the printed curves in POH Bild 5.3.11.
          /*  45%    */ [2143, 2176, 2209, 2242, 2275, 2308, 2341, 2374, 2407, 2440, 2473],
          /*  55%    */ [2270, 2312, 2353, 2395, 2436, 2478, 2520, 2562, 2604, 2646, 2688],
          /*  65%    */ [2397, 2445, 2492, 2539, 2585, 2630, 2677, 2700, 2700, 2700, 2700],
          /*  75%    */ [2518, 2573, 2622, 2671, 2700, 2700, 2700, 2700, 2700, 2700, 2700],
          /* Vollgas */ [
            2700, 2700, 2700, 2700, 2700, 2700, 2700, 2700, 2700, 2700, 2700,
          ],
        ], // RPM
      },

      fuelFlowPowerBreakpoints: [45, 55, 65, 75], // power percent
      fuelFlowLitersPerHour: [20.4, 24.2, 28.8, 33.3], // l/h

      tasTable: {
        rowBreakpoints: [45, 55, 65, 75, 100], // power percent
        columnBreakpoints: [
          0, 2000, 4000, 6000, 8000, 10000, 12000, 14000, 16000, 18000, 20000,
        ], // density altitude ft
        values: [
          // DA ft:        0  2000  4000  6000  8000 10000 12000 14000 16000 18000 20000
          // Digitised from POH Bild 5.3.12; cross-validated via km/L chart (Bild 5.3.10).
          // DA computed with formula, not from left chart (POH instruction).
          /*  45%    */ [173, 175, 177, 179, 181, 183, 185, 187, 189, 191, 193],
          /*  55%    */ [190, 193, 195, 198, 200, 203, 205, 208, 210, 213, 215],
          /*  65%    */ [203, 206, 209, 212, 215, 218, 221, 224, 226, 229, 232],
          /*  75%    */ [215, 218, 221, 224, 227, 230, 233, 236, 238, 240, 242],
          /* Vollgas */ [235, 238, 240, 242, 244, 246, 247, 248, 249, 250, 250],
        ], // TAS km/h
      },
    },

    climbRate: {
      source: "POH 5.3.8",

      climbSpeedTable: {
        rowBreakpoints: [750, 835, 920], // mass kg
        columnBreakpoints: [0, 8000, 16000], // pressure altitude ft
        values: [
          // PA ft:       0  8000 16000
          /* 750 kg */ [135, 119, 107],
          /* 835 kg */ [143, 124, 115],
          /* 920 kg */ [150, 131, 120],
        ], // climb speed km/h
      },

      rateOfClimbTable: {
        rowBreakpoints: [750, 835, 920], // mass kg
        columnBreakpoints: [
          0, 2000, 4000, 6000, 8000, 10000, 12000, 14000, 16000, 18000, 20000,
        ], // density altitude ft
        values: [
          // DA ft:        0  2000  4000  6000  8000 10000 12000 14000 16000 18000 20000
          /* 750 kg */ [
            1693, 1505, 1336, 1167, 1011, 860, 719, 579, 448, 322, 196,
          ],
          /* 835 kg */ [
            1456, 1285, 1128, 974, 833, 697, 564, 438, 318, 203, 88,
          ],
          /* 920 kg */ [1252, 1097, 951, 813, 679, 556, 428, 315, 203, 101, 0],
        ], // ft/min
      },
    },

    climb: {
      source: "POH 5.3.9",
      chartAxes: {
        densityAltitudeFt: {
          values: [0, 2000, 4000, 6000, 8000, 10000, 12000, 14000, 16000, 18000, 20000],
          pixels: [879, 824, 770, 716, 662, 608, 554, 499, 445, 391, 337],
        },
        timeMinutes: {
          values: [0, 5, 10, 15, 20, 25, 30, 35, 40],
          pixels: [170, 242, 315, 388, 460, 533, 605, 678, 750],
        },
        fuelLiters: {
          values: [0, 2, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22],
          pixels: [170, 205, 210.5, 245, 287, 333, 383, 436, 493, 553, 615, 681, 750],
        },
        distanceKm: {
          values: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
          pixels: [170, 227, 286, 346, 404.5, 465.5, 525.5, 587.5, 647.5, 709.5, 750],
        },
      },
      chartCurve: {
        densityAltitudeFt: [0, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 11000, 12000, 13000, 14000, 15000, 16000, 17000, 18000, 18300],
        pixels: [170, 182, 199, 213, 226, 243, 262, 280, 300, 327, 355, 382, 415, 448, 489, 542, 585, 655, 724, 750],
      },
    },

    range: {
      source: "POH 5.3.13",

      rangeTable: {
        rowBreakpoints: [45, 55, 65, 75], // power percent
        columnBreakpoints: [
          0, 2000, 4000, 6000, 8000, 10000, 12000, 16000, 20000,
        ], // density altitude ft
        values: [
          // DA ft:    0  2000  4000  6000  8000 10000 12000 16000 20000
          /* 45% */ [785, 793, 800, 808, 816, 824, 831, 843, 853],
          /* 55% */ [710, 718, 727, 736, 745, 754, 762, 774, 783],
          /* 65% */ [635, 643, 652, 660, 669, 677, 684, 694, 702],
          /* 75% */ [575, 583, 591, 599, 608, 616, 616, 616, 616],
        ], // km
      },
    },

    endurance: {
      source: "POH 5.3.14",
      fuelFlowPowerBreakpoints: [45, 55, 65, 75], // power percent
      fuelFlowLitersPerHour: [20.4, 24.2, 28.8, 33.3], // l/h
      reserveHours: 0.75,
      maximumUsableFuelLiters: 107,
    },

    stall: {
      source: "POH 5.3.4",
      massBreakpoints: [750, 920], // mass kg
      speedsKmh: {
        fullPower: {
          // mass kg: 750  920
          flaps0: [79, 87], // km/h
          flaps12: [74, 81], // km/h
          flaps40: [73, 79], // km/h
        },
        idle: {
          // mass kg: 750  920
          flaps0: [89, 97], // km/h
          flaps12: [86, 94], // km/h
          flaps40: [82, 91], // km/h
        },
      },
    },

    weightBalance: {
      source: "Vereinsdaten",
      fuelDensityKgPerLiter: 0.72,
      maximumUsableFuelLiters: 107,
      envelope: [
        { momentKgM: 150.0, massKg: 750.0 },
        { momentKgM: 167.0, massKg: 840.0 },
        { momentKgM: 234.0, massKg: 920.0 },
        { momentKgM: 274.0, massKg: 920.0 },
        { momentKgM: 223.0, massKg: 750.0 },
      ],
      stations: {
        pilot: { label: "Pilot", armM: 0.25 },
        copilot: { label: "Co-Pilot", armM: 0.25 },
        baggage: { label: "Gepäck", armM: 0.9 },
        fuel: { label: "Kraftstoff", armM: 0.89 },
      },
      emptyAircraft: [
        { name: "D-EBFT", massKg: 668.6, armM: 0.217409 },
        { name: "D-ELWF", massKg: 665, armM: 0.205579 },
        { name: "D-ENZM", massKg: 673.286, armM: 0.2315 },
      ],
    },
  };

  window.G115B = window.G115B || {};
  window.G115B.data = data;
})();
