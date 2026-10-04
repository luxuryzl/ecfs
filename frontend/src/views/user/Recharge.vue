<template>
  <div class="recharge-page">
    <el-row :gutter="16">
      <el-col :span="10">
        <el-card>
          <template #header>
            <span class="title">账户余额</span>
          </template>

          <div class="balance-box">
            <div class="balance-label">当前余额</div>
            <div class="balance-value">
              ¥{{ (userStore.user?.balance ?? 0).toFixed(2) }}
            </div>
          </div>

          <el-divider />

          <el-form
            ref="formRef"
            :model="form"
            :rules="rules"
            label-width="80px"
          >
            <el-form-item label="充值金额" prop="amount">
              <el-input-number
                v-model="form.amount"
                :min="1"
                :max="1000000"
                :precision="2"
                :step="100"
                style="width: 100%"
              />
              <div class="hint">单次充值上限 ¥100W</div>
            </el-form-item>

            <el-form-item label="快捷金额">
              <el-space wrap>
                <el-button
                  v-for="amt in quickAmounts"
                  :key="amt"
                  size="small"
                  @click="form.amount = amt"
                >
                  ¥{{ amt }}
                </el-button>
              </el-space>
            </el-form-item>

            <el-form-item label="备注" prop="remark">
              <el-input
                v-model="form.remark"
                type="textarea"
                :rows="3"
                placeholder="选填，比如：转账尾号 1234"
                maxlength="200"
                show-word-limit
              />
            </el-form-item>

            <el-form-item>
              <el-button
                type="primary"
                :loading="submitting"
                style="width: 100%"
                @click="handleSubmit"
              >
                提交充值申请
              </el-button>
            </el-form-item>
          </el-form>

          <el-alert
            type="info"
            :closable="false"
            title="提交后需管理员审批，审批通过后余额到账"
          />
        </el-card>
      </el-col>

      <el-col :span="14">
        <el-card>
          <template #header>
            <div class="card-header">
              <span class="title">充值记录</span>
              <el-select
                v-model="query.status"
                placeholder="全部状态"
                clearable
                size="small"
                style="width: 130px"
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
            size="small"
            style="width: 100%"
          >
            <el-table-column prop="id" label="ID" width="60" align="center" />
            <el-table-column label="金额" width="110" align="right">
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
            <el-table-column label="提交时间" width="160">
              <template #default="{ row }">
                {{ formatTime(row.createdAt) }}
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination">
            <el-pagination
              v-model:current-page="query.page"
              v-model:page-size="query.pageSize"
              :total="total"
              :page-sizes="[5, 10, 20]"
              layout="total, sizes, prev, pager, next"
              size="small"
              @size-change="loadRecords"
              @current-change="loadRecords"
            />
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { RECHARGE_STATUS_MAP } from "@/constants/enums";
import { useUserStore } from "@/stores/user";
import type { Recharge, RechargeStatus } from "@/types";
import { ElMessage, type FormInstance, type FormRules } from "element-plus";
import { onMounted, reactive, ref } from "vue";
import * as rechargeApi from "@/api/recharge";

const userStore = useUserStore();

const formRef = ref<FormInstance>();
const submitting = ref(false);
const loading = ref(false);
const records = ref<Recharge[]>([]);
const total = ref(0);

const quickAmounts = [100, 500, 1000, 5000, 10000];

const form = reactive({
  amount: 100,
  remark: "",
});

const rules: FormRules = {
  amount: [
    { required: true, message: "请输入充值金额", trigger: "blur" },
    {
      validator: (_rule, value: number, callback) => {
        if (value <= 0) {
          callback(new Error("充值金额必须大于 0"));
        } else {
          callback();
        }
      },
      trigger: "blur",
    },
  ],
};

const query = reactive({
  page: 1,
  pageSize: 10,
  status: undefined as RechargeStatus | undefined,
});

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
    const res = await rechargeApi.getMyRecharges({
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

async function handleSubmit() {
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    await rechargeApi.createRecharge(form.amount, form.remark || undefined);
    ElMessage.success("充值申请已提交，等待管理员审批");
    form.amount = 100;
    form.remark = "";
    handleSearch();
  } finally {
    submitting.value = false;
  }
}

onMounted(loadRecords);
</script>

<style scoped>
.balance-box {
  text-align: center;
  padding: 20px 0;
}

.balance-label {
  color: #909399;
  font-size: 14px;
  margin-bottom: 8px;
}

.balance-value {
  font-size: 32px;
  font-weight: bold;
  color: #f56c6c;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-size: 16px;
  font-weight: bold;
}

.amount {
  color: #67c23a;
  font-weight: bold;
}

.pagination {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}

.hint {
  color: #909399;
  font-size: 12px;
  margin-top: 4px;
}
</style>
