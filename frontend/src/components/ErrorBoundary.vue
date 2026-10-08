<template>
  <div v-if="error" class="error-boundary">
    <el-result icon="error" title="页面出错了" :sub-title="errorMessage">
      <template #extra>
        <el-button type="primary" @click="handleReset">重试</el-button>
      </template>
    </el-result>
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
import { onErrorCaptured, ref } from "vue";

const error = ref<Error | null>(null);
const errorMessage = ref("");

onErrorCaptured((err) => {
  console.error("组件错误：", err);
  error.value = err as Error;
  errorMessage.value = (err as Error).message ?? "未知错误";
  return false;
});

function handleReset() {
  error.value = null;
  errorMessage.value = "";
}
</script>

<style scoped>
.error-boundary {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
