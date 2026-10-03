<template>
  <div class="admin-orders">
    <el-card>
      <template #header>
        <div class="card-header">
          <span class="title">订单管理</span>
        </div>
      </template>

      <!-- 筛选栏 -->
      <el-form :inline="true" class="filter-bar">
        <el-form-item label="订单号">
          <el-input
            v-model="query.keyword"
            placeholder="搜索订单号"
            clearable
            style="width: 200px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="query.status"
            placeholder="全部"
            clearable
            style="width: 140px"
          >
            <el-option label="待处理" value="PENDING" />
            <el-option label="已支付" value="PAID" />
            <el-option label="已完成" value="DONE" />
            <el-option label="已取消" value="CANCELLED" />
          </el-select>
        </el-form-item>
        <el-form-item label="类型">
          <el-select
            v-model="query.type"
            placeholder="全部"
            clearable
            style="width: 140px"
          >
            <el-option label="普通订单" value="NORMAL" />
            <el-option label="补差订单" value="SUPPLEMENT" />
            <el-option label="退款订单" value="REFUND" />
          </el-select>
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
                <span class="label">用户：</span>
                <span>{{
                  row.user?.nickname ?? row.user?.username ?? "未知"
                }}</span>
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
        <el-table-column label="用户" width="130">
          <template #default="{ row }">
            {{ row.user?.nickname ?? row.user?.username ?? "未知" }}
          </template>
        </el-table-column>
        <el-table-column label="商品" min-width="160">
          <template #default="{ row }">
            {{ row.product?.name ?? "商品已删除" }}
          </template>
        </el-table-column>
        <el-table-column
          prop="quantity"
          label="数量"
          width="70"
          align="center"
        />
        <el-table-column label="金额" width="110" align="right">
          <template #default="{ row }">
            <span class="price">¥{{ row.amount.toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getTypeMeta(row.type).type" size="small">
              {{ getTypeMeta(row.type).label }}
            </el-tag>
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
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              :disabled="row.status === 'CANCELLED' || row.status === 'DONE'"
              @click="openStatusDialog(row)"
            >
              改状态
            </el-button>
            <el-button
              v-if="row.type === 'NORMAL' && row.status !== 'CANCELLED'"
              link
              type="warning"
              @click="openSupplementDialog(row)"
            >
              补差
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

    <!-- 改状态弹窗 -->
    <el-dialog v-model="statusDialogVisible" title="修改订单状态" width="420px">
      <el-form label-width="80px">
        <el-form-item label="当前状态">
          <el-tag
            v-if="selectedOrder"
            :type="getStatusMeta(selectedOrder.status).type"
          >
            {{ getStatusMeta(selectedOrder.status).label }}
          </el-tag>
        </el-form-item>
        <el-form-item prop="status">
          <template #label><span>新状态</span></template>
          <el-radio-group v-model="newStatus">
            <el-radio value="PENDING">待处理</el-radio>
            <el-radio value="PAID">已支付</el-radio>
            <el-radio value="DONE">已完成</el-radio>
            <el-radio value="CANCELLED">已取消</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="statusRemark"
            type="textarea"
            :rows="2"
            placeholder="选填"
            maxlength="200"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="statusDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="submitting"
          @click="confirmStatusChange"
        >
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 补差弹窗 -->
    <el-dialog
      v-model="supplementDialogVisible"
      title="创建补差单"
      width="420px"
    >
      <el-alert
        type="info"
        :closable="false"
        title="补差单会从用户余额中扣款，创建后关联到主订单"
        style="margin-bottom: 16px"
      />
      <el-form label-width="80px">
        <el-form-item label="主订单">
          <span class="mono">{{ selectedOrder?.orderNo }}</span>
        </el-form-item>
        <el-form-item label="用户">
          <span>{{
            selectedOrder?.user?.nickname ?? selectedOrder?.user?.username
          }}</span>
        </el-form-item>
        <el-form-item label="补差金额">
          <el-input-number
            v-model="supplementAmount"
            :min="1"
            :precision="2"
            :step="10"
            style="width: 200px"
          />
          <span class="hint">元</span>
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="supplementRemark"
            type="textarea"
            :rows="2"
            placeholder="选填，比如：运费补款"
            maxlength="200"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="supplementDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="submitting"
          @click="confirmSupplement"
        >
          确定创建
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { Search, Refresh } from "@element-plus/icons-vue";
import * as orderApi from "@/api/order";
import type { Order, OrderStatus, OrderType } from "@/types";
import { Order_Status_Map, ORDER_TYPE_MAP } from "@/constants/enums";
import { ElMessage } from "element-plus";

const loading = ref(false);
const submitting = ref(false);
const orders = ref<Order[]>([]);
const total = ref(0);

const query = reactive({
  page: 1,
  pageSize: 10,
  status: undefined as OrderStatus | undefined,
  type: undefined as OrderType | undefined,
  keyword: "",
});

const selectedOrder = ref<Order | null>(null);

const statusDialogVisible = ref(false);
const newStatus = ref<OrderStatus>("PAID");
const statusRemark = ref("");

const supplementDialogVisible = ref(false);
const supplementAmount = ref(0);
const supplementRemark = ref("");

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
    const res = await orderApi.getAllOrders({
      page: query.page,
      pageSize: query.pageSize,
      status: query.status,
      type: query.type,
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
  query.type = undefined;
  query.keyword = "";
  loadOrders();
}

function openStatusDialog(row: Order) {
  selectedOrder.value = row;
  newStatus.value = row.status;
  statusRemark.value = "";
  statusDialogVisible.value = true;
}

async function confirmStatusChange() {
  if (!selectedOrder.value) return;

  submitting.value = true;
  try {
    await orderApi.updateOrderStatus(
      selectedOrder.value.id,
      newStatus.value,
      statusRemark.value || undefined,
    );
    ElMessage.success("状态更新成功");
    statusDialogVisible.value = false;
    await loadOrders();
  } finally {
    submitting.value = false;
  }
}

function openSupplementDialog(row: Order) {
  selectedOrder.value = row;
  supplementAmount.value = 0;
  supplementRemark.value = "";
  supplementDialogVisible.value = true;
}

async function confirmSupplement() {
  if (!selectedOrder.value) return;
  if (supplementAmount.value <= 0) {
    ElMessage.warning("补差金额不能小于0");
    return;
  }

  submitting.value = true;
  try {
    await orderApi.createSupplement(
      selectedOrder.value.id,
      supplementAmount.value,
      supplementRemark.value || undefined,
    );
    ElMessage.success("补差单创建成功");
    supplementDialogVisible.value = false;
    await loadOrders();
  } finally {
    submitting.value = false;
  }
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

.hint {
  margin-left: 8px;
  color: #909399;
  font-size: 12px;
}
</style>
