import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.comparableListing.deleteMany();
  await prisma.evaluationMetric.deleteMany();
  await prisma.listingDraft.deleteMany();
  await prisma.uploadedImage.deleteMany();
  await prisma.item.deleteMany();

  const item1 = await prisma.item.create({
    data: {
      status: "READY",
      notesBrand: "Patagonia",
      notesSize: "M",
      notesCondition: "Used - Good",
      notesDefects: "Light pilling on cuffs",
      purchasePrice: 25,
      minPrice: 35,
      freeformNotes: "Better Sweater fleece, navy",
      images: {
        create: [
          {
            filename: "sample-fleece.jpg",
            path: "/uploads/seed/patagonia-fleece.jpg",
            mimeType: "image/jpeg",
            sizeBytes: 120000,
            sortOrder: 0,
          },
        ],
      },
      listingDraft: {
        create: {
          title: "Patagonia M Better Sweater Fleece — Used Good Condition",
          descriptionBullets: JSON.stringify([
            "Patagonia Better Sweater fleece in men's size M.",
            "Navy colorway; great for layering.",
            "Light pilling on cuffs; otherwise excellent pre-owned condition.",
            "Ships USPS with tracking within 1 business day.",
          ]),
          itemSpecifics: JSON.stringify({
            Brand: "Patagonia",
            Size: "M",
            Condition: "Used - Good",
          }),
          conditionDesc: "Used - Good. Light pilling on cuffs.",
          categoryId: "11450",
          categoryName: "Clothing, Shoes & Accessories",
          startingPrice: 39.99,
          buyItNowPrice: 52.99,
          shippingAssumptions: "USPS Ground Advantage, buyer pays calculated shipping",
          confidenceScore: 0.78,
          warnings: JSON.stringify(["Verify measurements against your size chart."]),
          questions: JSON.stringify([]),
          status: "DRAFT",
        },
      },
      comparables: {
        create: [
          {
            ebayItemId: "seed-1",
            title: "Patagonia Better Sweater M Navy",
            price: 42.0,
            condition: "Pre-owned",
            listingType: "sold",
            source: "mock",
          },
          {
            ebayItemId: "seed-2",
            title: "Patagonia Fleece Jacket M",
            price: 38.5,
            condition: "Good",
            listingType: "active",
            source: "mock",
          },
        ],
      },
      evaluation: {
        create: {
          timeSavedMinutes: 12,
          fieldsGenerated: 8,
          fieldsEditedByUser: 0,
          generationCompletedAt: new Date(),
        },
      },
    },
  });

  const item2 = await prisma.item.create({
    data: {
      status: "READY",
      notesBrand: "Sony",
      notesCondition: "Used - Very Good",
      freeformNotes: "WH-1000XM4 headphones, includes case",
      images: {
        create: [
          {
            filename: "sample-headphones.jpg",
            path: "/uploads/seed/sony-headphones.jpg",
            mimeType: "image/jpeg",
            sizeBytes: 98000,
            sortOrder: 0,
          },
        ],
      },
      listingDraft: {
        create: {
          title: "Sony WH-1000XM4 Wireless Headphones — Very Good",
          descriptionBullets: JSON.stringify([
            "Sony WH-1000XM4 over-ear noise cancelling headphones.",
            "Includes original case and cable.",
            "Battery holds charge well; minor scuffs on ear cups.",
          ]),
          itemSpecifics: JSON.stringify({
            Brand: "Sony",
            Model: "WH-1000XM4",
            Condition: "Used - Very Good",
          }),
          conditionDesc: "Used - Very Good. Minor cosmetic wear.",
          categoryId: "293",
          categoryName: "Consumer Electronics",
          startingPrice: 149.99,
          buyItNowPrice: 189.99,
          shippingAssumptions: "USPS Priority, 2 lb flat rate box",
          confidenceScore: 0.85,
          warnings: JSON.stringify([]),
          questions: JSON.stringify([]),
          status: "APPROVED",
          approvedAt: new Date(),
        },
      },
      evaluation: {
        create: {
          timeSavedMinutes: 15,
          fieldsGenerated: 8,
          fieldsEditedByUser: 2,
          qualityScore: 4.25,
          reviewCompletedAt: new Date(),
        },
      },
    },
  });

  console.log("Seed complete:", { item1: item1.id, item2: item2.id });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
