import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const centres = [
  { name: 'EVE Central Diagnostics', location: 'Bengaluru', tests: [{ name: 'Complete Blood Count', price: '450.00' }, { name: 'Lipid Profile', price: '850.00' }, { name: 'Thyroid Profile', price: '700.00' }] },
  { name: 'EVE North Diagnostics', location: 'Delhi', tests: [{ name: 'Complete Blood Count', price: '475.00' }, { name: 'Vitamin D', price: '1200.00' }, { name: 'HbA1c', price: '550.00' }] },
  { name: 'EVE West Diagnostics', location: 'Mumbai', tests: [{ name: 'Liver Function Test', price: '900.00' }, { name: 'Kidney Function Test', price: '800.00' }, { name: 'Fasting Blood Sugar', price: '250.00' }] }
];

const seed = async (): Promise<void> => {
  for (const centreData of centres) {
    const centre = await prisma.diagnosticCentre.upsert({
      where: { name_location: { name: centreData.name, location: centreData.location } },
      update: {},
      create: { name: centreData.name, location: centreData.location }
    });
    for (const test of centreData.tests) {
      await prisma.diagnosticTest.upsert({
        where: { name_centreId: { name: test.name, centreId: centre.id } },
        update: { price: test.price },
        create: { ...test, centreId: centre.id }
      });
    }
  }
  console.log(`Seeded ${centres.length} diagnostic centres and their tests`);
};

void seed().catch((error: unknown) => {
  console.error('Database seeding failed', error);
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());