import { createApp } from "vue";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import * as ElementPlusIconsVue from "@element-plus/icons-vue";
import { createPinia } from "pinia";

import router from "@/router";
import App from "@/App.vue";
import { useUserStore } from "./stores/user";

const app = createApp(App);

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component as any);
}

app.use(createPinia()); //要在router之前，顺序很重要！
app.use(router);

// 如果本地有token，启动时拉一次用户信息
const userStore = useUserStore();
if (userStore.token) {
  userStore.fetchMe().catch(() => {
    // token失效，清掉
    userStore.logout();
  });
}
app.use(ElementPlus);

app.mount("#app");
