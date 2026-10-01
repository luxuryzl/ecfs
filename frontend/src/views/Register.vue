<template>
  <div class="register-page">
    <el-card class="register-card">
      <h2 class="title">注册账号</h2>

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
            placeholder="3-20位，字母开头，可含数字和下划线"
            size="large"
            clearable
          />
        </el-form-item>

        <el-form-item label="昵称" prop="nickname">
          <el-input
            v-model="form.nickname"
            placeholder="选填"
            size="large"
            clearable
          />
        </el-form-item>

        <el-form-item label="手机号" prop="phone">
          <el-input
            v-model="form.phone"
            placeholder="选填"
            size="large"
            clearable
          />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="至少 6 位"
            size="large"
            show-password
          />
        </el-form-item>

        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="form.confirmPassword"
            type="password"
            placeholder="再次输入密码"
            size="large"
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
          注 册
        </el-button>

        <div class="tip">
          已有账号？
          <router-link to="/login">返回登录</router-link>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, type FormInstance, type FormRules } from "element-plus";
import request from "@/api/request";
import type { RegisterPayload } from "@/types";

interface RegisterForm extends RegisterPayload {
  confirmPassword: string;
}

const router = useRouter();
const formRef = ref<FormInstance>();
const loading = ref(false);

const form = reactive<RegisterForm>({
  username: "",
  nickname: "",
  phone: "",
  password: "",
  confirmPassword: "",
});

const rules: FormRules<RegisterForm> = {
  username: [
    { required: true, message: "请输入用户名", trigger: "blur" },
    { min: 3, max: 20, message: "用户名 3-20 位", trigger: "blur" },
    {
      pattern: /^[a-zA-Z][a-zA-Z0-9]*(?:_[a-zA-Z0-9]+)*$/,
      message: "必须字母开头，可含数字和下划线，下划线不能连续",
      trigger: "blur",
    },
  ],
  phone: [
    {
      pattern: /^1[3-9]\d{9}$/,
      message: "手机号格式不正确",
      trigger: "blur",
    },
  ],
  password: [
    { required: true, message: "请输入密码", trigger: "blur" },
    { min: 6, max: 64, message: "密码长度 6-64 位", trigger: "blur" },
  ],
  confirmPassword: [
    { required: true, message: "请再次输入密码", trigger: "blur" },
    {
      validator: (_rule, value, callback) => {
        if (value !== form.password) {
          callback(new Error("两次输入的密码不一致"));
        } else {
          callback();
        }
      },
      trigger: "blur",
    },
  ],
};

async function onSubmit() {
  if (!formRef.value) return;

  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  loading.value = true;
  try {
    const { confirmPassword, ...payload } = form;
    await request.post("/auth/register", payload);
    ElMessage.success("注册成功，请登录");
    router.push("/login");
  } catch {
    // 错误已在拦截器里提示
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.register-page {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.register-card {
  width: 420px;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.title {
  text-align: center;
  margin: 0 0 24px;
  color: #303133;
}

.tip {
  text-align: center;
  margin-top: 16px;
  font-size: 14px;
  color: #606266;
}
</style>
