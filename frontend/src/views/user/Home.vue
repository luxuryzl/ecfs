<template>
  <div class="home">
    <el-card>
      <template #header>
        <div class="header">
          <span>🏠 首页</span>
          <el-button type="danger" link @click="logout">退出登录</el-button>
        </div>
      </template>

      <p>
        欢迎回来，{{ userStore.user?.nickname ?? userStore.user?.username }}
      </p>
      <p>角色：{{ userStore.user?.role }}</p>
      <p>余额：¥{{ userStore.user?.balance?.toFixed(2) ?? "0.00" }}</p>

      <el-alert
        type="info"
        :closable="false"
        title="阶段 7 完成"
        description="登录、注册、路由守卫已打通。阶段 8 会搭建完整的用户端和管理端布局。"
        style="margin-top: 16px"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import { useUserStore } from "@/stores/user";

const userStore = useUserStore();
const router = useRouter();

function logout() {
  userStore.logout();
  router.push("/login");
}
</script>

<style scoped>
.home {
  padding: 24px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
