<template>
  <div v-loading="loading" class="dashboard">
    <!-- 顶部指标卡片 -->
    <el-row :gutter="16">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: #409eff">
              <el-icon :size="24"><User /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">用户总数</div>
              <div class="stat-value">{{ stats?.userCount ?? 0 }}</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: #67c23a">
              <el-icon :size="24"><Goods /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">商品总数</div>
              <div class="stat-value">{{ stats?.productCount ?? 0 }}</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: #e6a23c">
              <el-icon :size="24"><List /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">订单总数</div>
              <div class="stat-value">{{ stats?.orderCount ?? 0 }}</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: #f56c6c">
              <el-icon :size="24"><Money /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">订单总额</div>
              <div class="stat-value">
                ¥{{ (stats?.orderAmount ?? 0).toFixed(2) }}
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 待处理事项 -->
    <el-row :gutter="16" style="margin-top: 16px">
      <el-col :span="12">
        <el-card shadow="hover" class="alert-card" @click="goToRecharges">
          <div class="alert-content">
            <div class="alert-left">
              <el-icon :size="32" color="#e6a23c"><Wallet /></el-icon>
              <div class="alert-text">
                <div class="alert-label">待审批充值</div>
                <div class="alert-desc">点击前往处理</div>
              </div>
            </div>
            <div
              class="alert-count"
              :class="{ 'has-pending': (stats?.pendingRecharges ?? 0) > 0 }"
            >
              {{ stats?.pendingRecharges ?? 0 }}
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card shadow="hover" class="alert-card" @click="goToWithdraws">
          <div class="alert-content">
            <div class="alert-left">
              <el-icon :size="32" color="#f56c6c"><Money /></el-icon>
              <div class="alert-text">
                <div class="alert-label">待审批提现</div>
                <div class="alert-desc">点击前往处理</div>
              </div>
            </div>
            <div
              class="alert-count"
              :class="{ 'has-pending': (stats?.pendingWithdraws ?? 0) > 0 }"
            >
              {{ stats?.pendingWithdraws ?? 0 }}
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表 -->
    <el-row :gutter="16" style="margin-top: 16px">
      <el-col :span="14">
        <el-card>
          <template #header>
            <span class="chart-title">近 7 天订单趋势</span>
          </template>
          <v-chart
            v-if="trendOption"
            :option="trendOption"
            autoresize
            style="height: 320px"
          />
        </el-card>
      </el-col>

      <el-col :span="10">
        <el-card>
          <template #header>
            <span class="chart-title">订单状态分布</span>
          </template>
          <v-chart
            v-if="statusOption"
            :option="statusOption"
            autoresize
            style="height: 320px"
          />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { LineChart, PieChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
} from "echarts/components";
import VChart from "vue-echarts";
import * as dashboardApi from "@/api/dashboard";
import { Order_Status_Map } from "@/constants/enums";
import type { OrderStatus } from "@/types";

// 注册ECharts组件，按需引入
use([
  CanvasRenderer,
  LineChart,
  PieChart, //饼图
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
]);

const router = useRouter();
const loading = ref(true);
const stats = ref<dashboardApi.DashboardStats | null>(null);

async function loadStats() {
  loading.value = true;
  try {
    stats.value = await dashboardApi.getDashboardStats();
  } finally {
    loading.value = false;
  }
}

// 趋势拆线图
const trendOption = computed(() => {
  if (!stats.value) return null;

  const dates = stats.value.trend.map((t) => t.date.slice(5)); //MM-dd
  const counts = stats.value.trend.map((t) => t.count);
  const amounts = stats.value.trend.map((t) => t.amount);

  return {
    tooltip: {
      trigger: "axis", //轴
      formatter: (params: unknown) => {
        const arr = params as Array<{
          axisValue: string;
          seriesName: string;
          value: number;
        }>;
        if (!arr || arr.length === 0) return "";

        const date = arr[0]?.axisValue ?? "";
        let html = `<div style="font-weight:bold;margin-bottom:4px">${date}</div>`;

        for (const p of arr) {
          const val =
            p.seriesName === "订单金额" ? `¥${p.value.toFixed(2)}` : p.value;
          html += `<div>${p.seriesName}: ${val}</div>`;
        }

        return html;
      },
    },

    legend: {
      data: ["订单数", "订单金额"],
      top: 0,
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: dates,
      boundaryGap: false,
    },
    yAxis: [
      {
        type: "value",
        name: "订单数",
        minInterval: 1,
      },
      {
        type: "value",
        name: "金额",
      },
    ],
    series: [
      {
        name: "订单数",
        type: "line",
        data: counts,
        smooth: true,
        itemStyle: { color: "#409EFF" },
        areaStyle: { color: `rgba(64,158,255,0.15)` },
      },
      {
        name: "订单金额",
        type: "line",
        yAxisIndex: 1,
        data: amounts,
        smooth: true,
        itemStyle: { color: "#67C23A" },
      },
    ],
  };
});

// 状态分布饼图
const statusOption = computed(() => {
  if (!stats.value) return {};

  const data = stats.value.statusDistribution.map((item) => ({
    name: Order_Status_Map[item.status as OrderStatus]?.label ?? item.status,
    value: item.count,
  }));

  return {
    tooltip: {
      trigger: "item",
      formatter: "{b}: {c} ({d}%)",
    },
    legend: {
      bottom: 0,
    },
    series: [
      {
        type: "pie",
        radius: ["40%", "65%"],
        center: ["50%", "45%"],
        data,
        label: {
          formatter: "{b}\n{c}",
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: "rgba(0, 0, 0, 0.5)",
          },
        },
      },
    ],
  };
});

function goToRecharges() {
  router.push("/admin/recharges");
}

function goToWithdraws() {
  router.push("/admin/withdraws");
}

onMounted(loadStats);
/* onMounted(() => {
  throw new Error("加载数据失败");
}); */
</script>

<style scoped>
.dashboard {
  min-height: 400px;
}

.stat-card {
  transition: transform 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 52px;
  height: 52px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.stat-info {
  flex: 1;
  min-width: 0;
}

.stat-label {
  color: #909399;
  font-size: 13px;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 22px;
  font-weight: bold;
  color: #303133;
}

.alert-card {
  cursor: pointer;
  transition: transform 0.2s;
}

.alert-card:hover {
  transform: translateY(-2px);
}

.alert-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.alert-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.alert-text .alert-label {
  font-size: 15px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 4px;
}

.alert-text .alert-desc {
  font-size: 12px;
  color: #909399;
}

.alert-count {
  font-size: 32px;
  font-weight: bold;
  color: #c0c4cc;
}

.alert-count.has-pending {
  color: #f56c6c;
}

.chart-title {
  font-size: 15px;
  font-weight: bold;
  color: #303133;
}
</style>
