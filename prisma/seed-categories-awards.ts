/**
 * One-time seed script for default registration categories and special awards.
 * Run with: npx tsx prisma/seed-categories-awards.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_CATEGORIES = [
  "Domestic",
  "Import",
  "1950s",
  "1960s",
  "1970s",
  "1980s",
  "1990s",
  "2000s",
  "Truck / SUV",
  "Motorcycle",
  "Custom / Hot Rod",
  "Muscle Car",
  "Classic",
  "Exotic / Supercar",
  "Euro",
  "JDM",
  "Convertible",
  "Unmodified / Stock",
];

const DEFAULT_SPECIAL_AWARDS = [
  "President's Choice",
  "Best in Show",
  "Kid's Choice",
  "People's Choice",
  "Longest Distance",
  "Best Engine",
  "Best Paint",
  "Best Interior",
];

async function main() {
  console.log("Seeding categories…");
  for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
    await prisma.category.upsert({
      where: { name: DEFAULT_CATEGORIES[i] },
      update: { sortOrder: i },
      create: { name: DEFAULT_CATEGORIES[i], isSystem: true, sortOrder: i },
    });
  }
  console.log(`  ${DEFAULT_CATEGORIES.length} categories seeded.`);

  console.log("Seeding special awards…");
  for (let i = 0; i < DEFAULT_SPECIAL_AWARDS.length; i++) {
    await prisma.specialAward.upsert({
      where: { name: DEFAULT_SPECIAL_AWARDS[i] },
      update: { sortOrder: i },
      create: { name: DEFAULT_SPECIAL_AWARDS[i], isSystem: true, sortOrder: i },
    });
  }
  console.log(`  ${DEFAULT_SPECIAL_AWARDS.length} special awards seeded.`);

  console.log("Done!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
