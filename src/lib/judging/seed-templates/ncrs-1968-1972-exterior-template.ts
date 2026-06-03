import type { CategorySeed, GlobalTemplateSeed } from "@/lib/judging/seed-templates/judging-template-types";
import { ncrsDiscretionarySubcategory } from "@/lib/judging/seed-templates/judging-template-types";

function cat(name: string, max: number, items: CategorySeed["subcategories"]): CategorySeed {
  return { name, maxSectionPoints: max, subcategories: items };
}

/** NCRS 1968-1972 Corvette Exterior categories (variant groups split per validator). */
export const NCRS_EXTERIOR_CATEGORIES: CategorySeed[] = [
  cat("Body Color", 85, [ncrsDiscretionarySubcategory("Body color", 85, 85, null)]),
  cat("Body Paint", 85, [ncrsDiscretionarySubcategory("Body paint", 85, 45, 40)]),
  cat("Body Fit", 120, [
    ncrsDiscretionarySubcategory("Body, fiberglass & component fit", 120, 65, 55),
  ]),
  cat("Bumpers", 72, [
    ncrsDiscretionarySubcategory("Front bumper", 36, 20, 16),
    ncrsDiscretionarySubcategory("Rear bumpers", 36, 20, 16),
  ]),
  cat("Parking & Side Marker Lamps & Lenses", 20, [
    ncrsDiscretionarySubcategory("Parking lamps & lenses", 12, 6, 6),
    ncrsDiscretionarySubcategory("Side marker lamps", 8, 4, 4),
  ]),
  cat("Grilles, License Mount & Headlamp Shields", 40, [
    ncrsDiscretionarySubcategory("Front grilles & hardware", 21, 11, 10),
    ncrsDiscretionarySubcategory("Headlamp shields", 5, 3, 2),
    ncrsDiscretionarySubcategory("Front license recess", 9, 5, 4),
    ncrsDiscretionarySubcategory("License plate frame & 2 screws", 5, 3, 2),
  ]),
  cat("Headlamps & Bezels", 27, [
    ncrsDiscretionarySubcategory("Headlamp doors, bezels & nozzles", 11, 6, 5),
    ncrsDiscretionarySubcategory("Headlamps", 16, 12, 4),
  ]),
  cat("Hood, Windshield Vent Grille & Windshield Wiper Door", 30, [
    ncrsDiscretionarySubcategory("Hood exterior only", 12, 7, 5),
    ncrsDiscretionarySubcategory("Chrome trim moldings, LT1/427/454 only", 6, 3, 3),
    ncrsDiscretionarySubcategory("Windshield vent grille & wiper door", 12, 7, 5),
  ]),
  cat("Wipers & Windshield Trim", 28, [
    ncrsDiscretionarySubcategory("Wiper arms, transmission & actuating arms", 9, 5, 4),
    ncrsDiscretionarySubcategory("Wiper blade & holder", 5, 3, 2),
    ncrsDiscretionarySubcategory("Washer tubing & retainers", 5, 3, 2),
    ncrsDiscretionarySubcategory("Windshield stainless trim", 9, 5, 4),
  ]),
  cat("Windshield", 30, [ncrsDiscretionarySubcategory("Windshield", 30, 20, 10)]),
  cat("Windows", 55, [
    ncrsDiscretionarySubcategory("Side windows", 40, 21, 19),
    ncrsDiscretionarySubcategory("Back window, coupe or convertible", 15, 8, 7),
  ]),
  cat("Fender Grilles or Louvers", 20, [
    ncrsDiscretionarySubcategory("Side grilles or louvers & hardware", 20, 11, 9),
  ]),
  cat("Rocker Moldings or Side Pipe Covers", 40, [
    ncrsDiscretionarySubcategory("Rocker moldings or side pipe covers", 40, 21, 19),
  ]),
  cat("Outside Mirror, Door Handles & Locks", 32, [
    ncrsDiscretionarySubcategory("Outside mirror", 16, 9, 7),
    ncrsDiscretionarySubcategory("Door handles & gaskets", 9, 5, 4),
    ncrsDiscretionarySubcategory("Door lock bezels", 7, 4, 3),
  ]),
  cat("Antenna", 10, [
    ncrsDiscretionarySubcategory("Mast & ball", 5, 3, 2),
    ncrsDiscretionarySubcategory("Base, nut & gasket", 5, 3, 2),
  ]),
  cat("Gas Door Area & Rear Deck Vent Grilles", 47, [
    ncrsDiscretionarySubcategory("Gas lid door, bezel & hardware", 15, 8, 7),
    ncrsDiscretionarySubcategory("Gas cap", 18, 10, 8),
    ncrsDiscretionarySubcategory("Rubber boot & drain", 4, 2, 2),
    ncrsDiscretionarySubcategory("Rear grilles & hardware", 10, 6, 4),
  ]),
  cat("Rear License Recess, Tail Lamps & Alarm", 42, [
    ncrsDiscretionarySubcategory("License recess", 12, 7, 5),
    ncrsDiscretionarySubcategory("License plate frame & 2 screws", 5, 3, 2),
    ncrsDiscretionarySubcategory("Tail lamp & back-up lenses", 15, 8, 7),
    ncrsDiscretionarySubcategory("Lens mounting screws", 5, 3, 2),
    ncrsDiscretionarySubcategory("Alarm switch", 5, 3, 2),
  ]),
  cat("Exhaust Bezels & Rear Valance", 30, [
    ncrsDiscretionarySubcategory("Exhaust bezels", 15, 8, 7),
    ncrsDiscretionarySubcategory("Rear valance & bolts", 15, 8, 7),
  ]),
  cat("Emblems", 38, [
    ncrsDiscretionarySubcategory("Crossed flags", 12, 7, 5),
    ncrsDiscretionarySubcategory("Corvette letters", 12, 7, 5),
    ncrsDiscretionarySubcategory("Stingray emblems", 7, 4, 3),
    ncrsDiscretionarySubcategory("LT1 decals, 427 or 454 emblems", 7, 4, 3),
  ]),
  {
    name: "Hardtop (variant — use if applicable)",
    maxSectionPoints: 52,
    judgeGuidance: "Use only when judging hardtop configuration.",
    subcategories: [
      ncrsDiscretionarySubcategory("Hardtop", 42, 23, 19, true),
      ncrsDiscretionarySubcategory("Exterior metal moldings", 7, 4, 3, true),
      ncrsDiscretionarySubcategory("All weatherstrip", 21, 11, 10, true),
    ],
  },
  {
    name: "Soft Top (variant — use if applicable)",
    maxSectionPoints: 70,
    judgeGuidance: "Use only when judging soft top configuration.",
    subcategories: [
      ncrsDiscretionarySubcategory("Fit of top", 7, 4, 3, true),
      ncrsDiscretionarySubcategory("Material", 28, 15, 13, true),
      ncrsDiscretionarySubcategory("Heat seal of rear window", 7, 4, 3, true),
      ncrsDiscretionarySubcategory("All weatherstrip", 21, 11, 10, true),
      ncrsDiscretionarySubcategory("Caution label", 7, 4, 3, true),
    ],
  },
  {
    name: "Coupe (variant — use if applicable)",
    maxSectionPoints: 70,
    judgeGuidance: "Use only when judging coupe configuration.",
    subcategories: [
      ncrsDiscretionarySubcategory("Removable top panels", 35, 19, 16, true),
      ncrsDiscretionarySubcategory("All weatherstrip", 28, 15, 13, true),
      ncrsDiscretionarySubcategory("Exterior metal moldings", 7, 4, 3, true),
    ],
  },
  cat("Wheels & Wheel Covers", 56, [
    ncrsDiscretionarySubcategory("Four wheels", 28, 16, 12),
    ncrsDiscretionarySubcategory("Four wheel covers or hub caps & trim rings", 28, 16, 12),
  ]),
  cat("Tires", 60, [
    ncrsDiscretionarySubcategory("Tires (5) as described", 60, 30, 30),
  ]),
  cat("Spare Wheel, Tire Lock & Boot", 18, [
    ncrsDiscretionarySubcategory("Spare wheel & date", 9, 5, 4),
    ncrsDiscretionarySubcategory("Lock & boot, no operation", 9, 5, 4),
  ]),
  cat("Overall Cleanliness", 20, [
    ncrsDiscretionarySubcategory("Overall cleanliness", 20, null, 20),
  ]),
];

export const NCRS_1968_1972_EXTERIOR_TEMPLATE: GlobalTemplateSeed = {
  slug: "ncrs-1968-1972-exterior",
  name: "NCRS 1968-1972 Corvette Exterior Starter",
  scoringGroup: "NCRS",
  vehicleType: "Auto",
  description:
    "Starter exterior scorecard based on provided NCRS 1968-1972 Corvette Exterior sample (1075 pts). Event organizers should review and customize. Not an official NCRS rulebook.",
  methodology: "DEDUCTION",
  totalPoints: 1075,
  sortOrder: 1,
  categories: NCRS_EXTERIOR_CATEGORIES,
};
