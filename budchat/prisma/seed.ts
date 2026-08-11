import { PrismaClient, ProjectRole, StageStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_STAGE_NAMES } from "../src/lib/stages";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "prorab@budchat.dev" },
    update: {},
    create: {
      email: "prorab@budchat.dev",
      name: "Игорь (прораб)",
      phone: "+7 900 000-00-01",
      passwordHash,
      emailVerifiedAt: new Date()
    }
  });

  const worker = await prisma.user.upsert({
    where: { email: "master@budchat.dev" },
    update: {},
    create: {
      email: "master@budchat.dev",
      name: "Дмитрий (мастер)",
      phone: "+7 900 000-00-02",
      passwordHash,
      emailVerifiedAt: new Date()
    }
  });

  const client = await prisma.user.upsert({
    where: { email: "client@budchat.dev" },
    update: {},
    create: {
      email: "client@budchat.dev",
      name: "Анна (заказчик)",
      phone: "+7 900 000-00-03",
      passwordHash,
      emailVerifiedAt: new Date()
    }
  });

  const project = await prisma.project.create({
    data: {
      name: "Квартира на Ленина, 24",
      address: "г. Москва, ул. Ленина, д. 24, кв. 56",
      status: "ACTIVE",
      members: {
        create: [
          { userId: admin.id, role: ProjectRole.ADMIN },
          { userId: worker.id, role: ProjectRole.WORKER },
          { userId: client.id, role: ProjectRole.CLIENT }
        ]
      },
      stages: {
        create: DEFAULT_STAGE_NAMES.map((name, index) => ({
          name,
          order: index,
          status:
            index === 0
              ? StageStatus.DONE
              : index === 1
              ? StageStatus.IN_PROGRESS
              : StageStatus.NOT_STARTED
        }))
      }
    },
    include: { stages: true }
  });

  const demolitionStage = project.stages.find((s) => s.name === "Демонтаж")!;

  await prisma.message.create({
    data: {
      stageId: demolitionStage.id,
      senderId: admin.id,
      content: "Начинаем демонтаж завтра в 9:00, бригада из 3 человек.",
      type: "TEXT"
    }
  });

  await prisma.task.create({
    data: {
      stageId: demolitionStage.id,
      title: "Вывезти строительный мусор",
      assigneeId: worker.id,
      createdById: admin.id,
      deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      status: "NEW"
    }
  });

  const estimate = await prisma.estimate.create({
    data: {
      stageId: demolitionStage.id,
      itemName: "Демонтаж стяжки пола",
      unit: "м²",
      quantity: 45,
      unitPrice: 350,
      totalPrice: 45 * 350
    }
  });

  await prisma.estimateHistory.create({
    data: {
      estimateId: estimate.id,
      stageId: demolitionStage.id,
      changedById: admin.id,
      itemName: estimate.itemName,
      unit: estimate.unit,
      quantity: estimate.quantity,
      unitPrice: estimate.unitPrice,
      totalPrice: estimate.totalPrice,
      action: "created"
    }
  });

  await prisma.checklistItem.createMany({
    data: [
      { stageId: demolitionStage.id, text: "Мусор вывезен", order: 0 },
      { stageId: demolitionStage.id, text: "Стены проверены на трещины", order: 1 },
      { stageId: demolitionStage.id, text: "Полы очищены до плиты", order: 2 }
    ]
  });

  await prisma.visit.create({
    data: {
      projectId: project.id,
      stageId: demolitionStage.id,
      date: new Date(Date.now() + 24 * 60 * 60 * 1000),
      crewName: "Бригада №1",
      note: "Вывоз мусора"
    }
  });

  console.log("Seed complete. Demo logins (password: password123):");
  console.log(" - prorab@budchat.dev (admin)");
  console.log(" - master@budchat.dev (worker)");
  console.log(" - client@budchat.dev (client)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
