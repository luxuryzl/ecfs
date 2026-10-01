/**
 * 按用户端、管理端分组，权限守卫生效
 */

import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from "vue-router";
import { useUserStore } from "@/stores/user";
import Home from "@/views/user/Home.vue";

const routes: RouteRecordRaw[] = [
  // 1.======认证相关======
  {
    path: "/login",
    name: "Login",
    component: () => import("@/views/Login.vue"), //懒加载写法
    meta: { guestOnly: true, title: "登录" },
  },
  {
    path: "/register",
    name: "Register",
    component: () => import("@/views/Register.vue"),
    meta: { guestOnly: true, title: "注册" },
  },

  // 2.======用户端======
  {
    path: "/",
    component: () => import("@/layouts/UserLayout.vue"),
    meta: { requiresAuth: true },
    children: [
      {
        path: "",
        name: "UserHome",
        component: () => import("@/views/user/Home.vue"),
        meta: { title: "首页" },
      },
      {
        path: "products",
        name: "UserProducts",
        component: () => import("@/views/user/Products.vue"),
        meta: { title: "商品" },
      },
      {
        path: "orders",
        name: "UserOrders",
        component: () => import("@/views/user/Orders.vue"),
        meta: { title: "我的订单" },
      },
      {
        path: "recharge",
        name: "UserRecharge",
        component: () => import("@/views/user/Recharge.vue"),
        meta: { title: "充值" },
      },
      {
        path: "withdraw",
        name: "UserWithdraw",
        component: () => import("@/views/user/Withdraw.vue"),
        meta: { title: "提现" },
      },
      {
        path: "notices",
        name: "UserNotices",
        component: () => import("@/views/user/Notices.vue"),
        meta: { title: "公告" },
      },
    ],
  },

  // 3.======管理端======
  {
    path: "/admin",
    component: () => import("@/layouts/AdminLayout.vue"),
    meta: { requiresAuth: true, isAdmin: true },
    children: [
      {
        path: "",
        redirect: "admin/dashboard",
      },
      {
        path: "dashboard",
        name: "AdminDashboard",
        component: () => import("@/views/admin/Dashboard.vue"),
        meta: { title: "管理仪表板" },
      },
      {
        path: "groups",
        name: "AdminGroups",
        component: () => import("@/views/admin/Groups.vue"),
        meta: { title: "分组管理" },
      },
      {
        path: "products",
        name: "AdminProducts",
        component: () => import("@/views/admin/Products.vue"),
        meta: { title: "商品管理" },
      },
      {
        path: "orders",
        name: "AdminOrders",
        component: () => import("@/views/admin/Orders.vue"),
        meta: { title: "订单管理" },
      },
      {
        path: "users",
        name: "AdminUsers",
        component: () => import("@/views/admin/Users.vue"),
        meta: { title: "用户管理" },
      },
      {
        path: "recharges",
        name: "AdminRecharges",
        component: () => import("@/views/admin/Recharges.vue"),
        meta: { title: "充值管理" },
      },
      {
        path: "withdraws",
        name: "AdminWithdraws",
        component: () => import("@/views/admin/Withdraws.vue"),
        meta: { title: "提现管理" },
      },
      {
        path: "notices",
        name: "AdminNotices",
        component: () => import("@/views/admin/Notices.vue"),
        meta: { title: "公告管理" },
      },
    ],
  },

  // 4.======错误页======
  {
    path: "/403",
    name: "Forbidden",
    component: () => import("@/views/Forbidden.vue"),
  },
  // 5.======未匹配的路由======
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    component: () => import("@/views/NotFound.vue"),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const userStore = useUserStore();

  // 需要登录但未登录，跳登录页，带redirect参数
  if (to.meta.requiresAuth && !userStore.isLogin) {
    return {
      path: "/login",
      query: { redirect: to.fullPath },
    };
  }

  // 需要管理员权限但当前用户不是管理员，跳403页
  if (to.meta.isAdmin && !userStore.isAdmin) {
    return { path: "/403" };
  }

  // 已经登录，访问登录页/注册页，跳首页
  if (to.meta.guestOnly && userStore.isLogin) {
    return userStore.isAdmin ? "/admin/dashboard" : "/";
  }

  return true;
});

// 动态标题
router.afterEach((to) => {
  const title = to.meta.title as string | undefined;
  if (title) {
    document.title = title ? `${title} - 电商财税服务平台` : "电商财税服务平台";
  }
});

export default router;
