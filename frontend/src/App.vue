<template>
  <div class="app">
    <h1>电商财税服务平台</h1>
    <p>前端脚手架已就绪（阶段6）</p>
    <el-button type="primary" @click="checkBackend">测试后端连通性</el-button>
    <div v-if="health" class="result">
      <p>后端状态：{{ health.status }}</p>
      <p>环境：{{ health.env }}</p>
      <p>时间：{{ health.time }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ElMessage } from 'element-plus';

import request from './api/request';

interface HealthData {
  status: string;
  time: string;
  env: string;
}

const health = ref<HealthData | null>(null);

async function checkBackend() {
  try {
    const res = await request.get<unknown, {success:boolean; data:HealthData}>("/health");
    health.value = res.data;
    ElMessage.success("后端连接成功")
  }catch{
    ElMessage.error("后端连接失败");
  }
}
</script>

<style scoped></style>
