(function () {
  // Tabellenkonvention:
  // - rowBreakpoints definieren die Zeilenachse.
  // - columnBreakpoints definieren die Spaltenachse.
  // - values[rowIndex][columnIndex] gehoert immer zur jeweiligen Zeile/Spalte.
  // - Kommentare ueber values zeigen die Spaltenreihenfolge, Kommentare vor jeder Zeile den Zeilenkopf.
  const data = {
    takeoff: {
      source: "POH 5.3.7",

      groundRollFromAtmosphere: {
        rowBreakpoints: [-1000, 0, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000], // pressure altitude ft
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
          /* 104 m */ [ 94, 104, 117],
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
          /* 155 m */   [227, 187, 155, 126,  99,  76,  55],
          /* 209 m */   [298, 251, 209, 167, 131, 100,  74],
          /* 256 m */   [371, 310, 256, 207, 164, 124,  93],
          /* 304 m */   [441, 369, 304, 248, 192, 147, 112],
          /* 354 m */   [517, 430, 354, 286, 225, 169, 127],
          /* 405 m */   [589, 490, 405, 327, 257, 193, 145],
          /* 453 m */   [661, 552, 453, 364, 286, 214, 158],
          /* 502 m */   [733, 610, 502, 405, 316, 242, 174],
          /* 555 m */   [807, 671, 555, 445, 345, 265, 193],
        ], // corrected ground roll m
      },

      takeoffDistanceOver15m: {
        rowBreakpoints: [52, 154, 175, 249, 348, 449, 545, 645, 742, 843], // ground roll incl. margin m
        columnBreakpoints: [0, 15], // obstacle height m
        values: [
          // obstacle m:  0    15
          /*  52 m */  [ 52,   94],
          /* 154 m */  [154,  277],
          /* 175 m */  [175,  321],
          /* 249 m */  [249,  460],
          /* 348 m */  [348,  632],
          /* 449 m */  [449,  814],
          /* 545 m */  [545,  996],
          /* 645 m */  [645, 1183],
          /* 742 m */  [742, 1359],
          /* 843 m */  [843, 1538],
        ], // takeoff distance m
      },

      rotateSpeedMassBreakpoints: [770, 820, 870, 920], // mass kg
      rotateSpeedKmh: [89, 91, 92, 96], // km/h
      speedAt15mKmh: [113, 117, 120, 124], // km/h
    },

    landing: {
      source: "POH 5.3.15",

      landingRollFromAtmosphere: {
        rowBreakpoints: [-1000, 0, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000], // pressure altitude ft
        columnBreakpoints: [-20, 40], // OAT C
        values: [
          // OAT C:       -20   40
          /* -1000 ft */ [115, 158],
          /*     0 ft */ [123, 169],
          /*  1000 ft */ [131, 180],
          /*  2000 ft */ [140, 192],
          /*  3000 ft */ [150, 206],
          /*  4000 ft */ [161, 221],
          /*  5000 ft */ [173, 237],
          /*  6000 ft */ [185, 255],
          /*  7000 ft */ [199, 273],
          /*  8000 ft */ [213, 293],
        ], // landing roll m
      },

      landingRollFromMass: {
        rowBreakpoints: [115, 140, 165, 190, 215, 240, 265, 290], // prior landing roll m
        columnBreakpoints: [700, 750, 820, 870, 920], // mass kg
        values: [
          // mass kg:  700  750  820  870  920
          /* 115 m */ [ 88,  93, 103, 113, 123],
          /* 140 m */ [108, 114, 127, 140, 153],
          /* 165 m */ [128, 135, 151, 166, 181],
          /* 190 m */ [148, 156, 175, 192, 210],
          /* 215 m */ [168, 177, 198, 218, 238],
          /* 240 m */ [188, 198, 222, 245, 267],
          /* 265 m */ [208, 219, 246, 271, 296],
          /* 290 m */ [228, 241, 270, 298, 325],
        ], // corrected landing roll m
      },

      landingRollFromWind: {
        rowBreakpoints: [130, 162, 196, 231, 268, 304, 339, 374], // prior landing roll m
        columnBreakpoints: [-20, -10, 0, 10, 20, 30, 40], // wind km/h (negative = tailwind)
        values: [
          // Hinweis: Der Datenbestand enthaelt hier aktuell 6 Werte pro Zeile bei 7 definierten Spalten.
          // wind km/h:  -20  -10    0   10   20   30   40
          /* 130 m */   [168, 148, 130, 113,  97,  83],
          /* 162 m */   [210, 185, 162, 141, 121, 103],
          /* 196 m */   [255, 224, 196, 171, 147, 125],
          /* 231 m */   [300, 264, 231, 201, 173, 148],
          /* 268 m */   [348, 306, 268, 234, 201, 172],
          /* 304 m */   [395, 347, 304, 265, 228, 195],
          /* 339 m */   [440, 387, 339, 296, 255, 218],
          /* 374 m */   [485, 427, 374, 326, 281, 240],
        ], // corrected landing roll m
      },

      landingDistanceOver15m: {
        rowBreakpoints: [88, 113, 140, 172, 210, 250, 295, 340, 390, 440], // landing roll incl. margin m
        columnBreakpoints: [0, 15], // obstacle height m
        values: [
          // obstacle m:  0   15
          /*  88 m */  [ 88, 160],
          /* 113 m */  [113, 206],
          /* 140 m */  [140, 255],
          /* 172 m */  [172, 313],
          /* 210 m */  [210, 382],
          /* 250 m */  [250, 455],
          /* 295 m */  [295, 537],
          /* 340 m */  [340, 619],
          /* 390 m */  [390, 710],
          /* 440 m */  [440, 801],
        ], // landing distance m
      },

      approachSpeedMassBreakpoints: [700, 750, 800, 850, 920], // mass kg
      approachSpeedKmh: [107, 111, 115, 118, 123], // km/h
    },

    cruise: {
      source: "POH 5.3.10-12",

      rpmTable: {
        rowBreakpoints: [45, 55, 65, 75, 100], // power percent
        columnBreakpoints: [0, 2000, 4000, 6000, 8000, 10000, 12000, 14000, 16000, 18000, 20000], // density altitude ft
        values: [
          // DA ft:         0  2000  4000  6000  8000 10000 12000 14000 16000 18000 20000
          /*  45%    */ [2150, 2175, 2200, 2225, 2250, 2280, 2310, 2340, 2370, 2400, 2430],
          /*  55%    */ [2280, 2310, 2340, 2370, 2400, 2430, 2460, 2490, 2520, 2550, 2580],
          /*  65%    */ [2400, 2430, 2460, 2490, 2520, 2550, 2580, 2610, 2640, 2670, 2695],
          /*  75%    */ [2530, 2555, 2580, 2600, 2625, 2650, 2670, 2690, 2700, 2700, 2700],
          /* Vollgas */ [2700, 2700, 2700, 2700, 2700, 2700, 2700, 2700, 2700, 2700, 2700],
        ], // RPM
      },

      fuelFlowPowerBreakpoints: [45, 55, 65, 75], // power percent
      fuelFlowLitersPerHour: [20.4, 24.2, 28.8, 33.3], // l/h

      tasTable: {
        rowBreakpoints: [45, 55, 65, 75, 100], // power percent
        columnBreakpoints: [0, 2000, 4000, 6000, 8000, 10000, 12000, 14000, 16000, 18000, 20000], // density altitude ft
        values: [
          // DA ft:        0  2000  4000  6000  8000 10000 12000 14000 16000 18000 20000
          /*  45%    */ [173,  175,  177,  179,  181,  183,  185,  187,  189,  191,  193],
          /*  55%    */ [188,  191,  193,  196,  198,  201,  203,  206,  208,  211,  213],
          /*  65%    */ [202,  205,  208,  211,  214,  217,  220,  223,  225,  228,  231],
          /*  75%    */ [215,  218,  221,  224,  227,  230,  233,  236,  238,  240,  242],
          /* Vollgas */ [235,  238,  240,  242,  244,  246,  247,  248,  249,  250,  250],
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
          /* 750 kg */ [135,  119,  107],
          /* 835 kg */ [143,  124,  115],
          /* 920 kg */ [150,  131,  120],
        ], // climb speed km/h
      },

      rateOfClimbTable: {
        rowBreakpoints: [750, 835, 920], // mass kg
        columnBreakpoints: [0, 2000, 4000, 6000, 8000, 10000, 12000, 14000, 16000, 18000, 20000], // density altitude ft
        values: [
          // DA ft:        0  2000  4000  6000  8000 10000 12000 14000 16000 18000 20000
          /* 750 kg */ [1470, 1340, 1200, 1055,  905,  755,  600,  440,  275,   90,    0],
          /* 835 kg */ [1360, 1225, 1085,  940,  790,  635,  475,  310,  140,    0,    0],
          /* 920 kg */ [1250, 1115,  970,  820,  670,  515,  355,  190,   25,    0,    0],
        ], // ft/min
      },
    },

    climb: {
      source: "POH 5.3.9",
      cumulativeClimbPerformance: [
        // DA[ft], t[min], fuel[l], d[km]
        [       0,    0.0,     0.0,   0.0],
        [    1000,    0.9,     0.7,   2.5],
        [    2000,    2.0,     1.4,   5.5],
        [    3000,    3.0,     2.1,   7.4],
        [    4000,    4.1,     2.9,   9.5],
        [    5000,    5.1,     3.5,  11.4],
        [    6000,    6.2,     4.2,  13.5],
        [    7000,    7.5,     5.2,  17.5],
        [    8000,    9.0,     6.5,  22.2],
        [    9000,   10.6,     7.5,  25.5],
        [   10000,   12.5,     8.8,  29.0],
        [   11000,   14.5,    10.0,  32.8],
        [   12000,   17.0,    11.5,  37.0],
        [   13000,   19.5,    13.0,  41.5],
        [   14000,   22.5,    14.5,  46.0],
        [   15000,   26.0,    16.2,  51.0],
        [   16000,   29.0,    18.0,  57.0],
        [   17000,   33.0,    20.0,  63.0],
        [   18000,   37.0,    22.0,  70.0],
      ],
    },

    range: {
      source: "POH 5.3.13",

      rangeTable: {
        rowBreakpoints: [45, 55, 65, 75], // power percent
        columnBreakpoints: [0, 2000, 4000, 6000, 8000, 10000, 12000, 16000, 20000], // density altitude ft
        values: [
          // DA ft:    0  2000  4000  6000  8000 10000 12000 16000 20000
          /* 45% */ [785,  793,  800,  808,  816,  824,  831,  843,  853],
          /* 55% */ [710,  718,  727,  736,  745,  754,  762,  774,  783],
          /* 65% */ [635,  643,  652,  660,  669,  677,  684,  694,  702],
          /* 75% */ [575,  583,  591,  599,  608,  616,  616,  616,  616],
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
          flaps0:     [79,  87], // km/h
          flaps12:    [74,  81], // km/h
          flaps40:    [73,  79], // km/h
        },
        idle: {
          // mass kg: 750  920
          flaps0:     [89,  97], // km/h
          flaps12:    [86,  94], // km/h
          flaps40:    [82,  91], // km/h
        },
      },
    },
  };

  window.G115B = window.G115B || {};
  window.G115B.data = data;
})();
