<template>
  <div class="login-page">
    <el-card class="login-card">
      <h2 class="title">电商财税服务平台</h2>
      <p class="subtitle">订单管理系统</p>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent="onSubmit"
      >
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="form.username"
            placeholder="请输入用户名"
            size="large"
            :prefix-icon="User"
            clearable
          />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            size="large"
            :prefix-icon="Lock"
            show-password
            @keyup.enter="onSubmit"
          />
        </el-form-item>

        <el-button
          type="primary"
          size="large"
          :loading="loading"
          style="width: 100%"
          @click="onSubmit"
        >
          登 录
        </el-button>

        <div class="tip">
          还没有账号？
          <router-link to="/register">立即注册</router-link>
        </div>
      </el-form>

      <el-divider>测试账号</el-divider>
      <div class="test-accounts">
        <el-tag
          type="danger"
          @click="fillAccount('admin')"
          style="cursor: pointer"
        >
          管理员：admin / admin123
        </el-tag>
        <el-tag
          type="success"
          @click="fillAccount('user')"
          style="cursor: pointer"
        >
          普通用户：user / user123
        </el-tag>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, type FormInstance, type FormRules } from "element-plus";
import { useUserStore } from "@/stores/user";
import type { LoginPayload } from "@/types";
import { Lock, User } from "@element-plus/icons-vue";

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

const formRef = ref<FormInstance>();
const loading = ref(false);

const form = reactive<LoginPayload>({
  username: "",
  password: "",
});

const rules: FormRules<LoginPayload> = {
  username: [{ required: true, message: "请输入用户名", trigger: "blur" }],
  password: [{ required: true, message: "请输入密码", trigger: "blur" }],
};

// 点击填入用户名和密码
function fillAccount(type: "admin" | "user") {
  if (type === "admin") {
    form.username = "admin";
    form.password = "admin123";
  } else {
    form.username = "user";
    form.password = "user123";
  }
}

async function onSubmit() {
  if (!formRef.value) return;

  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  loading.value = true;
  try {
    await userStore.login(form);
    ElMessage.success("登录成功");

    // 管理员跳后台，普通用户跳前台
    const redirect = (route.query.redirect as string) ?? "";
    if (redirect) {
      router.push(redirect);
    } else {
      console.log("是否为admin", userStore.isAdmin);
      router.push(userStore.isAdmin ? "/admin/dashboard" : "/");
    }
  } catch {
    // 错误已在拦截器里提示
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-card {
  width: 420px;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.title {
  text-align: center;
  margin: 0 0 8px;
  color: #303133;
}

.subtitle {
  text-align: center;
  color: #909399;
  margin: 0 0 24px;
  font-size: 14px;
}

.tip {
  text-align: center;
  margin-top: 16px;
  font-size: 14px;
  color: #606266;
}

.test-accounts {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}
</style>
