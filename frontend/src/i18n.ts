import { ref } from "vue";

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

type Locale = keyof typeof messages;
type MessageKey = keyof (typeof messages)["zh-CN"];

export const locale = ref<Locale>("zh-CN");

export function t(key: MessageKey): string {
  return messages[locale.value][key] ?? messages["en-US"][key];
}
