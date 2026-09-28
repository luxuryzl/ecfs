import { PrismaClient } from "../src/generated/prisma/client.js";
import bcrypt from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminPwd = await bcrypt.hash("admin123", 10);
  const userPwd = await bcrypt.hash("user123", 10);

  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      password: adminPwd,
      role: "ADMIN",
      nickname: "管理员",
      balance: 0,
    },
  });

  await prisma.user.upsert({
    where: { username: "user" },
    update: {},
    create: {
      username: "user",
      password: userPwd,
      role: "USER",
      nickname: "普通用户",
      balance: 0,
    },
  });

  const g1 = await prisma.group.upsert({
    where: { name: "默认分组" },
    update: {},
    create: {
      name: "默认分组",
      sort: 1,
    },
  });

  const g2 = await prisma.group.upsert({
    where: { name: "VIP分组" },
    update: {},
    create: { name: "VIP分组", sort: 2 },
  });

  await prisma.product.createMany({
    data: [
      {
        name: "iPhone",
        description: "苹果手机",
        price: 6999,
        stock: 10,
        groupId: g1.id,
      },
      {
        name: "小米充电宝",
        price: 129,
        stock: 100,
        groupId: g1.id,
        description: "10000mAh",
      },
      {
        name: "抽纸",
        price: 19.9,
        stock: 500,
        groupId: g2.id,
        description: "3层加厚",
      },
    ],
  });

  await prisma.notice.createMany({
    data: [
      {
        title: "欢迎使用订单系统",
        content: "系统已上线，欢迎体验！",
      },
    ],
  });
  console.log("Seed 完成");
  console.log("请使用以下账号登录：");
  console.log("管理员账号：admin，密码：admin123");
  console.log("普通用户账号：user，密码：user123");
}

main()
  .catch((err) => {
    console.error("Seed 失败", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
