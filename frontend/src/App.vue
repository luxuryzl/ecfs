<template>
  <el-config-provider :locale="elementLocale">
    <div class="container">
      <el-select v-model="locale" class="language-select" aria-label="Language">
        <el-option label="简体中文" value="zh-CN" />
        <el-option label="English" value="en-US" />
      </el-select>
      <h1>
        <el-icon><HomeFilled /></el-icon>{{ t("appTitle") }}
      </h1>
      <p>{{ t("startupStatus") }}</p>
      <el-button type="primary">{{ t("elementPlusStatus") }}</el-button>
    </div>
    <router-view></router-view>
  </el-config-provider>
</template>

<script setup lang="ts">
import { computed, watch } from "vue";
import en from "element-plus/es/locale/lang/en";
import zhCn from "element-plus/es/locale/lang/zh-cn";
import { locale, t } from "./i18n";

const elementLocale = computed(() => (locale.value === "en-US" ? en : zhCn));

watch(
  locale,
  (value) => {
    document.documentElement.lang = value;
    document.title = t("appTitle");
  },
  { immediate: true },
);
</script>

<style scoped>
.container {
  position: relative;
  padding: 40px;
  font-family: sans-serif;
}

.language-select {
  position: absolute;
  top: 24px;
  right: 24px;
  width: 150px;
}
</style>
