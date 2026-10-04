<template>
  <div class="admin-recharges">
    <el-card>
      <template #header>
        <div class="card-header">
          <span class="title">充值管理</span>
          <el-select
            v-model="query.status"
            placeholder="全部状态"
            clearable
            size="small"
            style="width: 140px"
            @change="handleSearch"
          >
            <el-option label="待审批" value="PENDING" />
            <el-option label="已通过" value="APPROVED" />
            <el-option label="已拒绝" value="REJECTED" />
          </el-select>
        </div>
      </template>

      <el-table
        v-loading="loading"
        :data="records"
        border
        stripe
        style="width: 100%"
      >
        <el-table-column prop="id" label="ID" width="70" align="center" />
        <el-table-column label="用户" width="140">
          <template #default="{ row }">
            <div>{{ row.user?.nickname ?? row.user?.username ?? "未知" }}</div>
            <div class="sub">{{ row.user?.username }}</div>
          </template>
        </el-table-column>
        <el-table-column label="当前余额" width="120" align="right">
          <template #default="{ row }">
            <span class="balance"
              >¥{{ (row.user?.balance ?? 0).toFixed(2) }}</span
            >
          </template>
        </el-table-column>
        <el-table-column label="充值金额" width="120" align="right">
          <template #default="{ row }">
            <span class="amount">+¥{{ row.amount.toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusMeta(row.status).type" size="small">
              {{ getStatusMeta(row.status).label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="备注" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">{{ row.remark || "-" }}</template>
        </el-table-column>
        <el-table-column label="提交时间" width="170">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === 'PENDING'">
              <el-button link type="success" @click="handleApprove(row)">
                通过
              </el-button>
              <el-button link type="danger" @click="handleReject(row)">
                拒绝
              </el-button>
            </template>
            <span v-else class="muted">已处理</span>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadRecords"
          @current-change="loadRecords"
        />
      </div>
    </el-card>

    <!-- 审批弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="approveAction ? '通过充值' : '拒绝充值'"
      width="420px"
    >
      <div v-if="currentRecord" class="dialog-content">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="用户">
            {{ currentRecord.user?.nickname ?? currentRecord.user?.username }}
          </el-descriptions-item>
          <el-descriptions-item label="充值金额">
            <span class="amount">+¥{{ currentRecord.amount.toFixed(2) }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="用户当前余额">
            ¥{{ (currentRecord.user?.balance ?? 0).toFixed(2) }}
          </el-descriptions-item>
          <el-descriptions-item v-if="currentRecord.remark" label="用户备注">
            {{ currentRecord.remark }}
          </el-descriptions-item>
        </el-descriptions>

        <el-alert
          v-if="approveAction"
          type="success"
          :closable="false"
          :title="`通过后用户余额将增加 ¥${currentRecord.amount.toFixed(2)}`"
          style="margin-top: 12px"
        />

        <el-form label-width="80px" style="margin-top: 16px">
          <el-form-item label="审批备注">
            <el-input
              v-model="approveRemark"
              type="textarea"
              :rows="2"
              :placeholder="approveAction ? '选填' : '建议填写拒绝原因'"
              maxlength="200"
            />
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button
          :type="approveAction ? 'success' : 'danger'"
          :loading="submitting"
          @click="confirmApprove"
        >
          确定{{ approveAction ? "通过" : "拒绝" }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import * as rechargeApi from "@/api/recharge";
import { RECHARGE_STATUS_MAP } from "@/constants/enums";
import type { Recharge, RechargeStatus } from "@/types";
import { ElMessage } from "element-plus";
import { onMounted, reactive, ref } from "vue";

const loading = ref(false);
const submitting = ref(false);
const records = ref<Recharge[]>([]);
const total = ref(0);

const query = reactive({
  page: 1,
  pageSize: 10,
  status: undefined as RechargeStatus | undefined, //"‌这个变量现在没值，但以后可能是充值状态类型，先声明清楚‌"
});

const dialogVisible = ref(false);
const approveAction = ref(true); //true=通过，false=拒绝
const currentRecord = ref<Recharge | null>(null);
const approveRemark = ref("");

function getStatusMeta(status: RechargeStatus) {
  return RECHARGE_STATUS_MAP[status] ?? { label: status, type: "info" };
}

function formatTime(time?: string): string {
  if (!time) return "-";
  return new Date(time).toLocaleString("zh-CN", { hour12: false });
}

async function loadRecords() {
  loading.value = true;
  try {
    const res = await rechargeApi.getAllRecharges({
      page: query.page,
      pageSize: query.pageSize,
      status: query.status,
    });
    records.value = res.list;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  query.page = 1;
  loadRecords();
}

function handleApprove(row: Recharge) {
  currentRecord.value = row;
  approveAction.value = true;
  approveRemark.value = "";
  dialogVisible.value = true;
}

function handleReject(row: Recharge) {
  currentRecord.value = row;
  approveAction.value = false;
  approveRemark.value = "";
  dialogVisible.value = true;
}

async function confirmApprove() {
  if (!currentRecord.value) return;
  submitting.value = true;
  try {
    await rechargeApi.approveRecharge(
      currentRecord.value.id,
      approveAction.value,
      approveRemark.value || undefined,
    );
    ElMessage.success(approveAction.value ? "已通过" : "已拒绝");
    dialogVisible.value = false;

    await loadRecords();
  } finally {
    submitting.value = false;
  }
}

onMounted(loadRecords);
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

.sub {
  font-size: 12px;
  color: #909399;
}

.amount {
  color: #67c23a;
  font-weight: bold;
}

.balance {
  color: #909399;
}

.muted {
  color: #c0c4cc;
  font-size: 13px;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
