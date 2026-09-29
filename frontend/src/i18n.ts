import { createI18n } from "vue-i18n";

const messages = {
  "zh-CN": {
    appTitle: "电商财税服务平台",
    startupStatus: "前端已启动。阶段1完成",
    elementPlusStatus: "Element Plus 正常",
  },
  "en-US": {
    appTitle: "E-commerce Finance & Tax Platform",
    startupStatus: "Frontend is running. Phase 1 complete",
    elementPlusStatus: "Element Plus is ready",
  },
};

export const i18n = createI18n({
  legacy: false,
  locale: "zh-CN",
  fallbackLocale: "en-US",
  messages,
});