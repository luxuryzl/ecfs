<template>
  <el-container class="layout">
    <el-aside width="200px" class="aside">
      <div class="logo">🛒 订单系统</div>
      <el-menu :default-active="activeMenu" router class="menu">
        <el-menu-item index="/">
          <el-icon><HomeFilled /></el-icon>
          <span>首页</span>
        </el-menu-item>
        <el-menu-item index="/products">
          <el-icon><Goods /></el-icon>
          <span>商品</span>
        </el-menu-item>
        <el-menu-item index="/orders">
          <el-icon><List /></el-icon>
          <span>我的订单</span>
        </el-menu-item>
        <el-menu-item index="/recharge">
          <el-icon><Wallet /></el-icon>
          <span>充值</span>
        </el-menu-item>
        <el-menu-item index="/withdraw">
          <el-icon><Money /></el-icon>
          <span>提现</span>
        </el-menu-item>
        <el-menu-item index="/notices">
          <el-icon><Bell /></el-icon>
          <span>公告</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header">
        <div class="left">
          <span class="welcome">欢迎，{{ userStore.displayName }}</span>
        </div>
        <div class="right">
          <span class="balance">余额：¥{{ balanceText }}</span>
          <el-button link @click="handleLogout">退出</el-button>
        </div>
      </el-header>

      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { useRouter, useRoute } from "vue-router";
import { useUserStore } from "@/stores/user";
import { computed } from "vue";

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

const activeMenu = computed(() => route.path);

const balanceText = computed(() => (userStore.user?.balance ?? 0).toFixed(2));

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
  background: #304156;
}

.logo {
  height: 60px;
  line-height: 60px;
  text-align: center;
  color: #fff;
  font-weight: bold;
  font-size: 16px;
  border-bottom: 1px solid #3a4e64;
}

.menu {
  border-right: none;
  background: #304156;
}

.menu :deep(.el-menu-item) {
  color: #bfcbd9;
}

.menu :deep(.el-menu-item:hover) {
  background: #263445;
}

.menu :deep(.el-menu-item.is-active) {
  color: #409eff;
  background: #263445;
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

.balance {
  color: #67c23a;
  font-weight: bold;
  margin-right: 16px;
}

.main {
  background: #f5f7fa;
  padding: 24px;
}
</style>
