import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from "vue-router";
import { useUserStore } from "@/stores/user";
import Home from "@/views/Home.vue";
import Login from "@/views/Login.vue";
import Register from "@/views/Register.vue";

const routes: RouteRecordRaw[] = [
  {
    path: "/login",
    name: "Login",
    component: Login,
    meta: { guestOnly: true },
  },
  {
    path: "/register",
    name: "Register",
    component: Register,
    meta: { guestOnly: true },
  },
  {
    path: "/",
    name: "Home",
    component: Home,
    meta: { requiresAuth: true },
  },
  {
    path: "/:pathMatch(.*)*",
    redirect: "/",
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

  // 已经登录，访问登录页/注册页，跳首页
  if (to.meta.guestOnly && userStore.isLogin) {
    return "/";
  }

  return true;
});

export default router;
