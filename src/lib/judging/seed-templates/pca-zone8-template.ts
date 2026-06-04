import type { GlobalTemplateSeed } from "@/lib/judging/seed-templates/judging-template-types";
import { pcaDiscretionarySubcategory } from "@/lib/judging/seed-templates/judging-template-types";

export const PCA_ZONE8_TEMPLATE: GlobalTemplateSeed = {
  slug: "pca",
  name: "PCA Zone 8 Concours Starter",
  scoringGroup: "PCA",
  vehicleType: "Concours",
  description:
    "Starter scorecard based on the provided PCA Zone 8 Concours score sheet sample. Event organizers should review and customize for their event.",
  methodology: "DEDUCTION",
  totalPoints: 325,
  sortOrder: 0,
  categories: [
    {
      name: "Exterior",
      maxSectionPoints: 70,
      subcategories: [
        pcaDiscretionarySubcategory("Coachwork: body panels and fit", 15),
        pcaDiscretionarySubcategory(
          "Exterior paint and other exterior panel surfaces such as fabric, vinyl, or unpainted/anodized metal",
          15,
        ),
        pcaDiscretionarySubcategory(
          "Exterior glass and optical surfaces, including lights, mirrors, reflectors, and associated washing/cleaning systems",
          10,
        ),
        pcaDiscretionarySubcategory("Metal and plastic trim", 7),
        pcaDiscretionarySubcategory("Rubber trim, excluding bumpers", 7),
        pcaDiscretionarySubcategory("Bumper assemblies", 8),
        pcaDiscretionarySubcategory("Hubcaps and outer surfaces of wheels and tires", 8),
      ],
    },
    {
      name: "Interior",
      maxSectionPoints: 60,
      subcategories: [
        pcaDiscretionarySubcategory("Seats, seat mechanisms, and seatbelts", 10),
        pcaDiscretionarySubcategory(
          "Upholstery of door panels, side panels, and headliners",
          10,
        ),
        pcaDiscretionarySubcategory(
          "Carpeting and floor covering, including surfaces under floor mats",
          8,
        ),
        pcaDiscretionarySubcategory(
          "Interior of door compartments, pockets, glove box/storage compartments, and factory-supplied documentation",
          5,
        ),
        pcaDiscretionarySubcategory(
          "Dashboard, steering wheel, instruments, underside of dashboard to floor, center console, and driver controls",
          10,
        ),
        pcaDiscretionarySubcategory(
          "Door jambs, hinges, stops, rubber, and fresh air vents if present",
          10,
        ),
        pcaDiscretionarySubcategory(
          "Interior glass, lights, and mirrors, including interior surface of storage compartment windows",
          7,
        ),
      ],
    },
    {
      name: "Storage",
      maxSectionPoints: 45,
      subcategories: [
        pcaDiscretionarySubcategory(
          "Storage compartment walls, paint, and side covering, excluding interior window surfaces",
          10,
        ),
        pcaDiscretionarySubcategory(
          "Underside of compartment lids, latches, hinges, rubber molding, and mating surfaces",
          10,
        ),
        pcaDiscretionarySubcategory(
          "Storage area floor coverings; fuel tank/filler apparatus/charging receptacle regardless of location",
          10,
        ),
        pcaDiscretionarySubcategory(
          "Windshield washer container/pump and batteries regardless of location",
          5,
        ),
        pcaDiscretionarySubcategory(
          "Toolkit, tools, jack, spare tire and mount, air pump as applicable",
          10,
        ),
      ],
    },
    {
      name: "Engine Compartment",
      maxSectionPoints: 65,
      subcategories: [
        pcaDiscretionarySubcategory("Engine, engine-driven devices, and all belts", 20),
        pcaDiscretionarySubcategory("Sheet metal, splash pan, and radiators as applicable", 10),
        pcaDiscretionarySubcategory(
          "Engine compartment walls, firewall, side panels, oil filler cap and neck regardless of location",
          15,
        ),
        pcaDiscretionarySubcategory(
          "Underside of engine compartment lid and mating surfaces",
          5,
        ),
        pcaDiscretionarySubcategory(
          "Rubber and plastic items not included in other systems, all hoses",
          5,
        ),
        pcaDiscretionarySubcategory(
          "Wiring and other electrical components, excluding battery",
          10,
        ),
      ],
    },
    {
      name: "Chassis Half Without Engine",
      maxSectionPoints: 40,
      subcategories: [
        pcaDiscretionarySubcategory(
          "Underbody panels and fender wells, paint/side covering, radiators or heat exchangers present in this chassis half",
          10,
        ),
        pcaDiscretionarySubcategory(
          "External surfaces of muffler and exhaust system components if present",
          5,
        ),
        pcaDiscretionarySubcategory(
          "Suspension members, backing plates, brake lines, unsprung components, and brake components",
          10,
        ),
        pcaDiscretionarySubcategory(
          "Hand brake, tachometer/other cables and mounts/straps, steering system, fuel tank, and master cylinder if present",
          5,
        ),
        pcaDiscretionarySubcategory("Inner surfaces of wheels and tires", 10),
      ],
    },
    {
      name: "Chassis Half With Engine",
      maxSectionPoints: 45,
      subcategories: [
        pcaDiscretionarySubcategory(
          "Underbody panels and fender wells, paint/side covering, heat exchangers not in engine compartment",
          10,
        ),
        pcaDiscretionarySubcategory(
          "Underside of engine, heater boxes, engine sheet metal, transmission/drivetrain, mufflers, and exhaust surfaces",
          10,
        ),
        pcaDiscretionarySubcategory(
          "Suspension members, backing plates, brake lines, unsprung components, and brake components",
          10,
        ),
        pcaDiscretionarySubcategory(
          "Hand brake, tachometer/other cables and mounts/straps, steering system, fuel tank, and master cylinder if present",
          5,
        ),
        pcaDiscretionarySubcategory("Inner surfaces of wheels and tires", 10),
      ],
    },
  ],
};
