import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Helper to calculate deterministic shares
function getEqualShares(totalCents: number, memberIds: string[]) {
  const sorted = [...memberIds].sort();
  const n = sorted.length;
  const base = Math.floor(totalCents / n);
  const rem = totalCents % n;
  return sorted.map((uid, idx) => ({
    userId: uid,
    amountCents: base + (idx < rem ? 1 : 0),
  }));
}

async function main() {
  console.log("🌱 Starting database seeding...");

  // Clean database
  await prisma.activityLog.deleteMany();
  await prisma.settlement.deleteMany();
  await prisma.expenseShare.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.group.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  // 1. Create 4 Demo Users
  const alice = await prisma.user.create({
    data: {
      name: "Alice Walker",
      email: "alice@example.com",
      passwordHash,
    },
  });

  const bob = await prisma.user.create({
    data: {
      name: "Bob Miller",
      email: "bob@example.com",
      passwordHash,
    },
  });

  const charlie = await prisma.user.create({
    data: {
      name: "Charlie Davis",
      email: "charlie@example.com",
      passwordHash,
    },
  });

  const diana = await prisma.user.create({
    data: {
      name: "Diana Prince",
      email: "diana@example.com",
      passwordHash,
    },
  });

  const users = [alice, bob, charlie, diana];
  const allUserIds = users.map((u) => u.id);

  console.log("✓ Created 4 demo users (password: 'password123')");

  // 2. Create Group 1: Apartment 4B Roommates
  const aptGroup = await prisma.group.create({
    data: {
      name: "Apartment 4B Roommates",
      description: "Monthly rent, utilities, groceries, and cleaning supplies",
      currency: "EUR",
      ownerId: alice.id,
      memberships: {
        create: [
          { userId: alice.id, role: "OWNER" },
          { userId: bob.id, role: "MEMBER" },
          { userId: charlie.id, role: "MEMBER" },
          { userId: diana.id, role: "MEMBER" },
        ],
      },
    },
  });

  // Log group creation
  await prisma.activityLog.create({
    data: {
      groupId: aptGroup.id,
      actorId: alice.id,
      type: "GROUP_CREATED",
      payload: JSON.stringify({ groupName: aptGroup.name }),
    },
  });

  // Expenses for Apartment 4B (~16 expenses)
  const aptExpensesData = [
    {
      desc: "Monthly Apartment Rent",
      cents: 160000,
      cat: "Housing",
      paidBy: alice.id,
      daysAgo: 25,
      type: "EQUAL",
      shares: getEqualShares(160000, allUserIds),
    },
    {
      desc: "Fiber Internet Bill",
      cents: 4500,
      cat: "Utilities",
      paidBy: bob.id,
      daysAgo: 22,
      type: "EQUAL",
      shares: getEqualShares(4500, allUserIds),
    },
    {
      desc: "Electricity & Heating",
      cents: 9245,
      cat: "Utilities",
      paidBy: charlie.id,
      daysAgo: 20,
      type: "EQUAL",
      shares: getEqualShares(9245, allUserIds),
    },
    {
      desc: "Weekly Grocery Restock (Lidl)",
      cents: 14285,
      cat: "Food",
      paidBy: alice.id,
      daysAgo: 18,
      type: "EQUAL",
      shares: getEqualShares(14285, allUserIds),
    },
    {
      desc: "New Living Room Couch",
      cents: 35000,
      cat: "Housing",
      paidBy: bob.id,
      daysAgo: 16,
      type: "SHARES",
      // Ratio: Alice 2, Bob 1, Charlie 1, Diana 1 (Total weight 5)
      shares: [
        { userId: alice.id, amountCents: 14000 },
        { userId: bob.id, amountCents: 7000 },
        { userId: charlie.id, amountCents: 7000 },
        { userId: diana.id, amountCents: 7000 },
      ],
    },
    {
      desc: "Cleaning Supplies & Mop",
      cents: 2850,
      cat: "Other",
      paidBy: diana.id,
      daysAgo: 14,
      type: "EXACT",
      shares: [
        { userId: alice.id, amountCents: 712 },
        { userId: bob.id, amountCents: 713 },
        { userId: charlie.id, amountCents: 712 },
        { userId: diana.id, amountCents: 713 },
      ],
    },
    {
      desc: "Kitchen Espresso Machine",
      cents: 18000,
      cat: "Housing",
      paidBy: alice.id,
      daysAgo: 12,
      type: "PERCENTAGE",
      // Alice 40%, Bob 30%, Charlie 15%, Diana 15%
      shares: [
        { userId: alice.id, amountCents: 7200 },
        { userId: bob.id, amountCents: 5400 },
        { userId: charlie.id, amountCents: 2700 },
        { userId: diana.id, amountCents: 2700 },
      ],
    },
    {
      desc: "Water & Municipal Utility",
      cents: 6830,
      cat: "Utilities",
      paidBy: charlie.id,
      daysAgo: 10,
      type: "EQUAL",
      shares: getEqualShares(6830, allUserIds),
    },
    {
      desc: "Dishwasher Pods & Paper Towels",
      cents: 1820,
      cat: "Other",
      paidBy: diana.id,
      daysAgo: 9,
      type: "EQUAL",
      shares: getEqualShares(1820, allUserIds),
    },
    {
      desc: "Housewarming Party Drinks",
      cents: 8500,
      cat: "Entertainment",
      paidBy: bob.id,
      daysAgo: 7,
      type: "EQUAL",
      shares: getEqualShares(8500, allUserIds),
    },
    {
      desc: "Weekend Brunch Bagels & Eggs",
      cents: 5420,
      cat: "Food",
      paidBy: alice.id,
      daysAgo: 6,
      type: "EQUAL",
      shares: getEqualShares(5420, allUserIds),
    },
    {
      desc: "Olive Oil & Pantry Spices",
      cents: 2290,
      cat: "Food",
      paidBy: charlie.id,
      daysAgo: 5,
      type: "EQUAL",
      shares: getEqualShares(2290, allUserIds),
    },
    {
      desc: "Balcony Herb Pots & Soil",
      cents: 3800,
      cat: "Housing",
      paidBy: diana.id,
      daysAgo: 4,
      type: "EQUAL",
      shares: getEqualShares(3800, allUserIds),
    },
    {
      desc: "Vacuum Cleaner Replacement Filter",
      cents: 4500,
      cat: "Other",
      paidBy: bob.id,
      daysAgo: 3,
      type: "EQUAL",
      shares: getEqualShares(4500, allUserIds),
    },
    {
      desc: "Fresh Farm Fruit Basket",
      cents: 3175,
      cat: "Food",
      paidBy: alice.id,
      daysAgo: 2,
      type: "EQUAL",
      shares: getEqualShares(3175, allUserIds),
    },
    {
      desc: "Late Night Pizza Delivery",
      cents: 4800,
      cat: "Food",
      paidBy: charlie.id,
      daysAgo: 1,
      type: "EQUAL",
      shares: getEqualShares(4800, allUserIds),
    },
  ];

  for (const exp of aptExpensesData) {
    const expDate = new Date();
    expDate.setDate(expDate.getDate() - exp.daysAgo);

    const createdExp = await prisma.expense.create({
      data: {
        groupId: aptGroup.id,
        description: exp.desc,
        amountCents: exp.cents,
        date: expDate,
        category: exp.cat,
        paidById: exp.paidBy,
        createdById: exp.paidBy,
        splitType: exp.type,
        shares: {
          create: exp.shares.map((s) => ({
            userId: s.userId,
            amountCents: s.amountCents,
          })),
        },
      },
      include: { paidBy: true },
    });

    await prisma.activityLog.create({
      data: {
        groupId: aptGroup.id,
        actorId: exp.paidBy,
        type: "EXPENSE_CREATED",
        payload: JSON.stringify({
          description: createdExp.description,
          amountCents: createdExp.amountCents,
          category: createdExp.category,
          paidByName: createdExp.paidBy.name,
        }),
        createdAt: expDate,
      },
    });
  }

  // Settlements in Apartment 4B
  const aptSettlement1 = await prisma.settlement.create({
    data: {
      groupId: aptGroup.id,
      fromUserId: bob.id,
      toUserId: alice.id,
      amountCents: 15000, // 150.00 EUR
      date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      createdById: bob.id,
    },
  });

  await prisma.activityLog.create({
    data: {
      groupId: aptGroup.id,
      actorId: bob.id,
      type: "SETTLEMENT_CREATED",
      payload: JSON.stringify({
        amountCents: 15000,
        fromName: "Bob Miller",
        toName: "Alice Walker",
      }),
      createdAt: aptSettlement1.date,
    },
  });

  const aptSettlement2 = await prisma.settlement.create({
    data: {
      groupId: aptGroup.id,
      fromUserId: charlie.id,
      toUserId: alice.id,
      amountCents: 10000, // 100.00 EUR
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      createdById: charlie.id,
    },
  });

  await prisma.activityLog.create({
    data: {
      groupId: aptGroup.id,
      actorId: charlie.id,
      type: "SETTLEMENT_CREATED",
      payload: JSON.stringify({
        amountCents: 10000,
        fromName: "Charlie Davis",
        toName: "Alice Walker",
      }),
      createdAt: aptSettlement2.date,
    },
  });

  console.log(`✓ Seeded '${aptGroup.name}' with ${aptExpensesData.length} expenses and 2 settlements`);

  // 3. Create Group 2: Barcelona Summer Trip
  const bcnGroup = await prisma.group.create({
    data: {
      name: "Summer Trip to Barcelona",
      description: "Flight tickets, villa rental, tapas, museum admissions, and car rentals",
      currency: "EUR",
      ownerId: bob.id,
      memberships: {
        create: [
          { userId: bob.id, role: "OWNER" },
          { userId: alice.id, role: "MEMBER" },
          { userId: charlie.id, role: "MEMBER" },
          { userId: diana.id, role: "MEMBER" },
        ],
      },
    },
  });

  await prisma.activityLog.create({
    data: {
      groupId: bcnGroup.id,
      actorId: bob.id,
      type: "GROUP_CREATED",
      payload: JSON.stringify({ groupName: bcnGroup.name }),
    },
  });

  const bcnExpensesData = [
    {
      desc: "Gràcia Holiday Apartment Rental",
      cents: 84000,
      cat: "Housing",
      paidBy: bob.id,
      daysAgo: 15,
      type: "EQUAL",
      shares: getEqualShares(84000, allUserIds),
    },
    {
      desc: "Sagrada Família Guided Tour",
      cents: 10400,
      cat: "Entertainment",
      paidBy: alice.id,
      daysAgo: 14,
      type: "EQUAL",
      shares: getEqualShares(10400, allUserIds),
    },
    {
      desc: "Dinner at El Xampanyet",
      cents: 12650,
      cat: "Food",
      paidBy: charlie.id,
      daysAgo: 13,
      type: "EQUAL",
      shares: getEqualShares(12650, allUserIds),
    },
    {
      desc: "Rental SUV for Costa Brava Day Trip",
      cents: 21000,
      cat: "Transport",
      paidBy: bob.id,
      daysAgo: 12,
      type: "EQUAL",
      shares: getEqualShares(21000, allUserIds),
    },
    {
      desc: "Highway Tolls & Fuel",
      cents: 6540,
      cat: "Transport",
      paidBy: diana.id,
      daysAgo: 11,
      type: "EQUAL",
      shares: getEqualShares(6540, allUserIds),
    },
    {
      desc: "Seafood Paella on the Beach",
      cents: 9800,
      cat: "Food",
      paidBy: alice.id,
      daysAgo: 10,
      type: "PERCENTAGE",
      shares: [
        { userId: alice.id, amountCents: 2940 },
        { userId: bob.id, amountCents: 2940 },
        { userId: charlie.id, amountCents: 1960 },
        { userId: diana.id, amountCents: 1960 },
      ],
    },
    {
      desc: "Park Güell Monumental Zone Entry",
      cents: 4000,
      cat: "Entertainment",
      paidBy: charlie.id,
      daysAgo: 9,
      type: "EXACT",
      shares: [
        { userId: alice.id, amountCents: 1000 },
        { userId: bob.id, amountCents: 1000 },
        { userId: charlie.id, amountCents: 1000 },
        { userId: diana.id, amountCents: 1000 },
      ],
    },
    {
      desc: "Gothic Quarter Artisanal Gelato",
      cents: 2200,
      cat: "Food",
      paidBy: diana.id,
      daysAgo: 8,
      type: "EQUAL",
      shares: getEqualShares(2200, allUserIds),
    },
    {
      desc: "Airport Express Shuttles",
      cents: 3500,
      cat: "Transport",
      paidBy: bob.id,
      daysAgo: 7,
      type: "EQUAL",
      shares: getEqualShares(3500, allUserIds),
    },
    {
      desc: "Beach Umbrellas & Paddleboards",
      cents: 5000,
      cat: "Entertainment",
      paidBy: alice.id,
      daysAgo: 6,
      type: "EQUAL",
      shares: getEqualShares(5000, allUserIds),
    },
    {
      desc: "Picasso Museum Tickets",
      cents: 4800,
      cat: "Entertainment",
      paidBy: charlie.id,
      daysAgo: 5,
      type: "EQUAL",
      shares: getEqualShares(4800, allUserIds),
    },
    {
      desc: "Penedès Vineyard Wine Tasting",
      cents: 16000,
      cat: "Entertainment",
      paidBy: bob.id,
      daysAgo: 4,
      type: "SHARES",
      shares: [
        { userId: alice.id, amountCents: 4000 },
        { userId: bob.id, amountCents: 4000 },
        { userId: charlie.id, amountCents: 4000 },
        { userId: diana.id, amountCents: 4000 },
      ],
    },
    {
      desc: "Tapas Crawl in Poble Sec",
      cents: 7600,
      cat: "Food",
      paidBy: diana.id,
      daysAgo: 3,
      type: "EQUAL",
      shares: getEqualShares(7600, allUserIds),
    },
    {
      desc: "Montjuïc Cable Car Tickets",
      cents: 5600,
      cat: "Transport",
      paidBy: alice.id,
      daysAgo: 2,
      type: "EQUAL",
      shares: getEqualShares(5600, allUserIds),
    },
  ];

  for (const exp of bcnExpensesData) {
    const expDate = new Date();
    expDate.setDate(expDate.getDate() - exp.daysAgo);

    const createdExp = await prisma.expense.create({
      data: {
        groupId: bcnGroup.id,
        description: exp.desc,
        amountCents: exp.cents,
        date: expDate,
        category: exp.cat,
        paidById: exp.paidBy,
        createdById: exp.paidBy,
        splitType: exp.type,
        shares: {
          create: exp.shares.map((s) => ({
            userId: s.userId,
            amountCents: s.amountCents,
          })),
        },
      },
      include: { paidBy: true },
    });

    await prisma.activityLog.create({
      data: {
        groupId: bcnGroup.id,
        actorId: exp.paidBy,
        type: "EXPENSE_CREATED",
        payload: JSON.stringify({
          description: createdExp.description,
          amountCents: createdExp.amountCents,
          category: createdExp.category,
          paidByName: createdExp.paidBy.name,
        }),
        createdAt: expDate,
      },
    });
  }

  // Settlement in Barcelona group
  const bcnSettlement = await prisma.settlement.create({
    data: {
      groupId: bcnGroup.id,
      fromUserId: diana.id,
      toUserId: bob.id,
      amountCents: 12000, // 120.00 EUR
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      createdById: diana.id,
    },
  });

  await prisma.activityLog.create({
    data: {
      groupId: bcnGroup.id,
      actorId: diana.id,
      type: "SETTLEMENT_CREATED",
      payload: JSON.stringify({
        amountCents: 12000,
        fromName: "Diana Prince",
        toName: "Bob Miller",
      }),
      createdAt: bcnSettlement.date,
    },
  });

  console.log(`✓ Seeded '${bcnGroup.name}' with ${bcnExpensesData.length} expenses and 1 settlement`);
  console.log("🎉 Seeding complete! Database is alive and ready.");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
