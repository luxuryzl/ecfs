import { PrismaClient } from "../src/generated/prisma/client.js";
import bcrypt from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // 清空旧数据（按外键依赖顺序，子表先删）
  await prisma.operationLog.deleteMany();
  await prisma.order.deleteMany();
  await prisma.recharge.deleteMany();
  await prisma.withdraw.deleteMany();
  await prisma.product.deleteMany();
  await prisma.group.deleteMany();
  await prisma.notice.deleteMany();
  await prisma.user.deleteMany();

  const adminPwd = await bcrypt.hash("admin123", 10);
  const userPwd = await bcrypt.hash("user123", 10);

  // 用户
  const admin = await prisma.user.create({
    data: {
      username: "admin",
      password: adminPwd,
      role: "ADMIN",
      nickname: "管理员",
      balance: 0,
    },
  });

  const user = await prisma.user.create({
    data: {
      username: "user",
      password: userPwd,
      role: "USER",
      nickname: "普通用户",
      balance: 1000,
      phone: "13800138000",
    },
  });

  // 分组
  const g1 = await prisma.group.create({
    data: { name: "数码产品", sort: 1 },
  });
  const g2 = await prisma.group.create({
    data: { name: "日用百货", sort: 2 },
  });

  // 商品
  const p1 = await prisma.product.create({
    data: {
      name: "iPhone 15",
      description: "苹果手机，128GB",
      price: 6999,
      stock: 10,
      groupId: g1.id,
    },
  });
  await prisma.product.create({
    data: {
      name: "小米充电宝",
      description: "10000mAh，快充",
      price: 129,
      stock: 100,
      groupId: g1.id,
    },
  });
  await prisma.product.create({
    data: {
      name: "抽纸",
      description: "3层加厚，100抽",
      price: 19.9,
      stock: 500,
      groupId: g2.id,
    },
  });

  // 公告
  await prisma.notice.create({
    data: {
      title: "欢迎使用订单系统",
      content: "系统已上线，欢迎体验！",
      status: "PUBLISHED",
    },
  });

  // 示例：一条主订单 + 一条补差订单
  const mainOrder = await prisma.order.create({
    data: {
      orderNo: "ORD20260929001",
      type: "NORMAL",
      userId: user.id,
      productId: p1.id,
      quantity: 1,
      amount: 6999,
      status: "PAID",
      remark: "主订单",
    },
  });

  await prisma.order.create({
    data: {
      orderNo: "ORD20260929001-S1",
      parentId: mainOrder.id,
      type: "SUPPLEMENT",
      userId: user.id,
      productId: p1.id,
      quantity: 1,
      amount: 200,
      status: "PENDING",
      remark: "补差价订单，运费补款",
    },
  });

  // 示例：一条提现申请（使用新字段）
  await prisma.withdraw.create({
    data: {
      userId: user.id,
      amount: 500,
      account: "支付宝 13800138000",
      channel: "ALIPAY",
      accountNo: "13800138000",
      accountName: "普通用户",
      status: "PENDING",
    },
  });

  // 操作日志
  await prisma.operationLog.create({
    data: {
      operatorId: admin.id,
      action: "SEED_INIT",
      targetType: "System",
      detail: JSON.stringify({ message: "初始化种子数据" }),
    },
  });

  console.log("Seed 完成");
  console.log("管理员: admin / admin123");
  console.log("普通用户: user / user123");
}

main()
  .catch((err) => {
    console.error("Seed 失败", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
