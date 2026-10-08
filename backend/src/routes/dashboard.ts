import type { FastifyInstance } from "fastify";
import { adminHook } from "../utils/auth.js";
import { ok } from "../utils/response.js";

// 临时，用于测试慢路由日志
function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
export async function dashboardRoutes(app: FastifyInstance) {
  app.get("/stats", { preHandler: adminHook }, async (request, reply) => {
    // 模拟2秒的延迟
    // await sleep(2000);

    const [
      userCount,
      productCount,
      orderCount,
      orderAmountCount,
      pendingRecharges,
      pendingWithdraws,
      orderStatusGroups,
      recentOrders,
    ] = await Promise.all([
      // 用户总数不含管理员
      app.prisma.user.count({ where: { role: "USER" } }),
      // 商品总数
      app.prisma.product.count(),
      // 主订单总数
      app.prisma.order.count({ where: { parentId: null } }),
      // 已支付、已完成订单总额
      app.prisma.order.aggregate({
        where: { parentId: null, status: { in: ["PAID", "  DONE"] } },
        _sum: { amount: true },
      }),
      // 待处理充值
      app.prisma.recharge.count({ where: { status: "PENDING" } }),
      // 待处理提现
      app.prisma.withdraw.count({ where: { status: "PENDING" } }),
      // 订单状态分组
      app.prisma.order.groupBy({
        by: ["status"],
        where: { parentId: null },
        _count: { _all: true },
      }),

      // 近7天订单（按天聚合）
      app.prisma.order.findMany({
        where: {
          parentId: null,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), //gte 是 greater than or equal，意思是「大于等于」
          },
        },
        select: {
          amount: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    // 近7天趋势
    const trendMap: Record<
      string,
      { date: string; count: number; amount: number }
    > = {};
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i); //往前取7天，包含当天
      const key = d.toISOString().slice(0, 10); // 取日期yyyy-MM-dd
      trendMap[key] = { date: key, count: 0, amount: 0 }; //把近7天，每一天的统计数据初始化为0
    }

    // 循环遍历recentOrders数据
    for (const order of recentOrders) {
      const key = order.createdAt.toISOString().slice(0, 10);
      if (trendMap[key]) {
        trendMap[key].count++;
        // 只统计已支付、已完成的订单
        if (order.status === "PAID" || order.status === "DONE") {
          trendMap[key].amount += order.amount;
        }
      }
    }

    /**
     * 把 trendMap 这个对象的所有「值」抽出来，组成一个数组
     * trendMap 长这样（一个对象）
     * {
     * '2026-09-30': { date: '2026-09-30', count: 0, amount: 0 },
     * '2026-10-01': { date: '2026-10-01', count: 2, amount: 300 },
     * '2026-10-02': { date: '2026-10-02', count: 1, amount: 6999 },
     * // ...
     * }
     * Object.values 是JavaScript 内置的静态方法，返回对象所有值组成的数组。
     * 它配套的还有：Object.keys(obj)	键组成的数组;Object.entries(obj)	键值对组成的数组
     */
    const trend = Object.values(trendMap);
    /**
     * 返回的数组长这样
     * [
     *  { date: '2026-09-30', count: 0, amount: 0 },
     *  { date: '2026-10-01', count: 2, amount: 300 },
     *  { date: '2026-10-02', count: 1, amount: 6999 },
     *  // ...
     * ]
     */

    // 处理状态分布
    const statusDistribution = orderStatusGroups.map((group) => ({
      status: group.status,
      count: group._count._all,
    }));

    return ok(reply, {
      // 卡片数据
      userCount,
      productCount,
      orderCount,
      orderAmount: orderAmountCount._sum.amount ?? 0,
      pendingRecharges,
      pendingWithdraws,
      // 图表数据
      trend,
      statusDistribution,
    });
  });
}
