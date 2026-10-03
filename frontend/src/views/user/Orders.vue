<template>
  <div class="my-orders">
    <el-card>
      <template #header>
        <div class="card-header">
          <span class="title">我的订单</span>
        </div>
      </template>

      <!-- 筛选栏 -->
      <el-form :inline="true" class="filter-bar">
        <el-form-item label="状态">
          <el-select
            v-model="query.status"
            placeholder="全部状态"
            clearable
            style="width: 140px"
            @change="handleSearch"
          >
            <el-option label="待处理" value="PENDING" />
            <el-option label="已支付" value="PAID" />
            <el-option label="已完成" value="DONE" />
            <el-option label="已取消" value="CANCELLED" />
          </el-select>
        </el-form-item>
        <el-form-item label="订单号">
          <el-input
            v-model="query.keyword"
            placeholder="搜索订单号"
            clearable
            style="width: 200px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch"
            >搜索</el-button
          >
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 表格 -->
      <el-table
        v-loading="loading"
        :data="orders"
        border
        stripe
        style="width: 100%"
      >
        <el-table-column type="expand">
          <template #default="{ row }">
            <div class="expand-content">
              <div class="expand-row">
                <span class="label">订单号：</span>
                <span class="mono">{{ row.orderNo }}</span>
              </div>
              <div class="expand-row">
                <span class="label">备注：</span>
                <span>{{ row.remark || "无" }}</span>
              </div>
              <div
                v-if="row.children && row.children.length > 0"
                class="children-block"
              >
                <div class="children-title">补差单</div>
                <div
                  v-for="child in row.children"
                  :key="child.id"
                  class="child-row"
                >
                  <span class="mono">{{ child.orderNo }}</span>
                  <span class="child-amount"
                    >¥{{ child.amount.toFixed(2) }}</span
                  >
                  <el-tag size="small" type="warning">补差</el-tag>
                </div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="orderNo" label="订单号" width="200">
          <template #default="{ row }">
            <span class="mono">{{ row.orderNo }}</span>
          </template>
        </el-table-column>
        <el-table-column label="商品" min-width="180">
          <template #default="{ row }">
            <div class="product-cell">
              <el-image
                v-if="row.product?.image"
                :src="row.product.image"
                fit="cover"
                class="product-thumb"
              />
              <span>{{ row.product?.name ?? "商品已删除" }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          prop="quantity"
          label="数量"
          width="80"
          align="center"
        />
        <el-table-column label="金额" width="120" align="right">
          <template #default="{ row }">
            <span class="price">¥{{ row.amount.toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusMeta(row.status).type">
              {{ getStatusMeta(row.status).label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="下单时间" width="170">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)"
              >详情</el-button
            >
            <el-button
              v-if="row.status === 'PENDING'"
              link
              type="danger"
              @click="handleCancel(row)"
            >
              取消
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadOrders"
          @current-change="loadOrders"
        />
      </div>
    </el-card>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="订单详情" width="560px">
      <div v-if="currentOrder" class="detail">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="订单号">
            <span class="mono">{{ currentOrder.orderNo }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="类型">
            <el-tag :type="getTypeMeta(currentOrder.type).type" size="small">
              {{ getTypeMeta(currentOrder.type).label }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="商品">
            {{ currentOrder.product?.name ?? "商品已删除" }}
          </el-descriptions-item>
          <el-descriptions-item label="单价">
            ¥{{ (currentOrder.product?.price ?? 0).toFixed(2) }}
          </el-descriptions-item>
          <el-descriptions-item label="数量">
            {{ currentOrder.quantity }}
          </el-descriptions-item>
          <el-descriptions-item label="总金额">
            <span class="price">¥{{ currentOrder.amount.toFixed(2) }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusMeta(currentOrder.status).type">
              {{ getStatusMeta(currentOrder.status).label }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="备注">
            {{ currentOrder.remark || "无" }}
          </el-descriptions-item>
          <el-descriptions-item label="下单时间">
            {{ formatTime(currentOrder?.createdAt) }}
          </el-descriptions-item>
        </el-descriptions>

        <div
          v-if="currentOrder.children && currentOrder.children.length > 0"
          class="detail-children"
        >
          <div class="children-title">关联补差单</div>
          <el-table :data="currentOrder.children" size="small" border>
            <el-table-column prop="orderNo" label="订单号" />
            <el-table-column prop="amount" label="金额" width="100">
              <template #default="{ row: child }"
                >¥{{ child.amount.toFixed(2) }}</template
              >
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="{ row: child }">
                <el-tag :type="getStatusMeta(child.status).type" size="small">
                  {{ getStatusMeta(child.status).label }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>

      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
        <el-button
          v-if="currentOrder?.status === 'PENDING'"
          type="danger"
          @click="handleCancel(currentOrder!)"
        >
          取消订单
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Search, Refresh } from "@element-plus/icons-vue";
import * as orderApi from "@/api/order";
import { Order_Status_Map, ORDER_TYPE_MAP } from "@/constants/enums";
import type { Order, OrderStatus, OrderType } from "@/types";
import { useUserStore } from "@/stores/user";

const loading = ref(false);
const orders = ref<Order[]>([]);
const total = ref(0);

const query = reactive({
  page: 1,
  pageSize: 10,
  status: undefined as OrderStatus | undefined,
  keyword: "",
});

const detailVisible = ref(false);
const currentOrder = ref<Order | null>(null);

function getStatusMeta(status: OrderStatus) {
  return Order_Status_Map[status] ?? { label: status, type: "info" };
}

function getTypeMeta(type: OrderType) {
  return ORDER_TYPE_MAP[type] ?? { label: type, type: "info" };
}

function formatTime(time?: string): string {
  if (!time) return "-";
  return new Date(time).toLocaleString("zh-CN", { hour12: false });
}

async function loadOrders() {
  loading.value = true;

  try {
    const res = await orderApi.getMyOrders({
      page: query.page,
      pageSize: query.pageSize,
      status: query.status,
      keyword: query.keyword || undefined,
    });
    orders.value = res.list;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  query.page = 1;
  loadOrders();
}

function handleReset() {
  query.page = 1;
  query.status = undefined;
  query.keyword = "";
  loadOrders();
}

function openDetail(row: Order) {
  currentOrder.value = row;
  detailVisible.value = true;
}

// 取消订单，自动刷新余额
const userStore = useUserStore();
async function handleCancel(row: Order) {
  try {
    await ElMessageBox.confirm(
      `确定取消该订单${row.orderNo}吗？, "取消订单"`,
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
      },
      {
        type: "warning",
        confirmButtonText: "确定取消",
        cancelButtonText: "再想想",
      },
    );
  } catch {
    return;
  }

  await orderApi.cancelOrder(row.id);
  ElMessage.success("订单取消成功");
  detailVisible.value = false;
  await Promise.all([loadOrders(), userStore.fetchMe()]);
}

onMounted(loadOrders);
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-size: 16px;
  font-weight: bold;
}

.filter-bar {
  margin-bottom: 16px;
}

.mono {
  font-family: Consolas, Monaco, monospace;
  font-size: 13px;
}

.price {
  color: #f56c6c;
  font-weight: bold;
}

.product-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.product-thumb {
  width: 36px;
  height: 36px;
  border-radius: 4px;
  flex-shrink: 0;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.expand-content {
  padding: 12px 24px;
}

.expand-row {
  margin-bottom: 6px;
}

.label {
  color: #909399;
}

.children-block {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #e4e7ed;
}

.children-title {
  font-weight: bold;
  margin-bottom: 8px;
  color: #606266;
}

.child-row {
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 4px 0;
}

.child-amount {
  color: #e6a23c;
  font-weight: bold;
}

.detail-children {
  margin-top: 16px;
}
</style>
