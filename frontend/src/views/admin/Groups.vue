<template>
  <el-card>
    <h2>群组首页</h2>
    <p>欢迎，{{ userStore.displayName }}</p>
    <el-alert type="info" :closable="false" title="阶段 9 起会补充具体功能" />
  </el-card>
</template>

<script setup lang="ts">
import { useUserStore } from "@/stores/user";
const userStore = useUserStore();
</script>

<style scoped></style>
