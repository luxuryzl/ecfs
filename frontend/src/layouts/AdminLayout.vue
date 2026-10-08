<template>
  <el-container class="layout">
    <el-aside width="220px" class="aside">
      <div class="logo">⚙️ 管理后台</div>
      <el-menu :default-active="activeMenu" router class="menu">
        <el-menu-item index="/admin/dashboard">
          <el-icon><DataLine /></el-icon>
          <span>仪表盘</span>
        </el-menu-item>
        <el-menu-item index="/admin/groups">
          <el-icon><Menu /></el-icon>
          <span>商品分组</span>
        </el-menu-item>
        <el-menu-item index="/admin/products">
          <el-icon><Goods /></el-icon>
          <span>商品管理</span>
        </el-menu-item>
        <el-menu-item index="/admin/orders">
          <el-icon><List /></el-icon>
          <span>订单管理</span>
        </el-menu-item>
        <el-menu-item index="/admin/users">
          <el-icon><User /></el-icon>
          <span>客户管理</span>
        </el-menu-item>
        <el-menu-item index="/admin/recharges">
          <el-icon><Wallet /></el-icon>
          <span>充值管理</span>
        </el-menu-item>
        <el-menu-item index="/admin/withdraws">
          <el-icon><Money /></el-icon>
          <span>提现审批</span>
        </el-menu-item>
        <el-menu-item index="/admin/notices">
          <el-icon><Bell /></el-icon>
          <span>公告管理</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header">
        <div class="left">
          <span class="welcome">管理员：{{ userStore.displayName }}</span>
        </div>
        <div class="right">
          <el-button link type="primary" @click="goUserSide"
            >切换到用户端</el-button
          >
          <el-button link @click="handleLogout">退出</el-button>
        </div>
      </el-header>

      <el-main class="main">
        <ErrorBoundary>
          <router-view />
        </ErrorBoundary>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { useRouter, useRoute } from "vue-router";
import { useUserStore } from "@/stores/user";
import { computed } from "vue";
import ErrorBoundary from "@/components/ErrorBoundary.vue";

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

// 用于‌动态获取当前激活菜单项路径‌的一行核心代码
const activeMenu = computed(() => route.path);

// 主动将页面跳转到根路径（通常是首页）
function goUserSide() {
  router.push("/");
}

function handleLogout() {
  userStore.logout();
  router.push("/login");
}
</script>

<style scoped>
.layout {
  height: 100vh;
}

.aside {
  background: #001529;
}

.logo {
  height: 60px;
  line-height: 60px;
  text-align: center;
  color: #fff;
  font-weight: bold;
  font-size: 16px;
  border-bottom: 1px solid #1f2d3d;
}

.menu {
  border-right: none;
  background: #001529;
}

.menu :deep(.el-menu-item) {
  color: #b7c4d1;
}

.menu :deep(.el-menu-item:hover) {
  background: #0d1b2a;
}

.menu :deep(.el-menu-item.is-active) {
  color: #409eff;
  background: #0d1b2a;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 0 24px;
}

.welcome {
  color: #303133;
}

.main {
  background: #f5f7fa;
  padding: 24px;
}
</style>
