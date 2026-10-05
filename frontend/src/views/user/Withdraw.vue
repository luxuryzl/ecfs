<template>
  <div class="withdraw-page">
    <el-row :gutter="16">
      <el-col :span="10">
        <el-card>
          <template #header>
            <span class="title">提现申请</span>
          </template>

          <div class="balance-box">
            <div class="balance-label">可提现余额</div>
            <div class="balance-value">
              ¥{{ (userStore.user?.balance ?? 0).toFixed(2) }}
            </div>
          </div>

          <el-divider />

          <el-form
            ref="formRef"
            :model="form"
            :rules="rules"
            label-width="90px"
          >
            <el-form-item label="提现金额" prop="amount">
              <el-input-number
                v-model="form.amount"
                :min="1"
                :max="Math.max(1, userStore.user?.balance ?? 0)"
                :precision="2"
                :step="100"
                style="width: 100%"
              />
              <div class="hint">
                单次上限 ¥10,000，可用余额 ¥{{
                  (userStore.user?.balance ?? 0).toFixed(2)
                }}
                提现金额 不能超过可用余额！
              </div>
            </el-form-item>

            <el-form-item label="提现渠道" prop="channel">
              <el-select v-model="form.channel" style="width: 100%">
                <el-option label="银行卡" value="BANK" />
                <el-option label="支付宝" value="ALIPAY" />
                <el-option label="微信" value="WECHAT" />
                <el-option label="其他" value="OTHER" />
              </el-select>
            </el-form-item>

            <el-form-item label="账号" prop="accountNo">
              <el-input
                v-model="form.accountNo"
                placeholder="银行卡号 / 支付宝账号 / 微信号"
                clearable
              />
            </el-form-item>

            <el-form-item label="户名" prop="accountName">
              <el-input
                v-model="form.accountName"
                placeholder="选填，账户持有人姓名"
                clearable
              />
            </el-form-item>

            <el-form-item
              v-if="form.channel === 'BANK'"
              label="开户行"
              prop="bankName"
            >
              <el-input
                v-model="form.bankName"
                placeholder="选填，如：中国银行"
                clearable
              />
            </el-form-item>

            <el-form-item label="备注" prop="remark">
              <el-input
                v-model="form.remark"
                type="textarea"
                :rows="3"
                placeholder="选填"
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
                提交提现申请
              </el-button>
            </el-form-item>
          </el-form>

          <el-alert
            type="warning"
            :closable="false"
            title="提交后需管理员审批，审批通过后余额扣除"
          />
        </el-card>
      </el-col>

      <el-col :span="14">
        <el-card>
          <template #header>
            <div class="card-header">
              <span class="title">提现记录</span>
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
                <span class="amount">-¥{{ row.amount.toFixed(2) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="渠道" width="90" align="center">
              <template #default="{ row }">
                {{ getChannelLabel(row.channel) }}
              </template>
            </el-table-column>
            <el-table-column label="账号" min-width="140" show-overflow-tooltip>
              <template #default="{ row }">
                {{ row.accountNo || row.account }}
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="getStatusMeta(row.status).type" size="small">
                  {{ getStatusMeta(row.status).label }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="备注" min-width="120" show-overflow-tooltip>
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
import { WITHDRAW_CHANNEL_MAP, WITHDRAW_STATUS_MAP } from "@/constants/enums";
import { useUserStore } from "@/stores/user";
import type { Withdraw, WithdrawChannel, WithdrawStatus } from "@/types";
import { ElMessage, type FormInstance, type FormRules } from "element-plus";
import { onMounted, reactive, ref } from "vue";
import * as withdrawApi from "@/api/withdraw";

const userStore = useUserStore();

const formRef = ref<FormInstance>();
const submitting = ref(false);
const loading = ref(false);
const records = ref<Withdraw[]>([]);
const total = ref(0);

const form = reactive({
  amount: 100,
  channel: "ALIPAY" as WithdrawChannel,
  accountNo: "",
  accountName: "",
  bankName: "",
  remark: "",
});

const rules: FormRules = {
  amount: [
    { required: true, message: "请输入提现金额", trigger: "blur" },
    {
      validator: (_rule, value: number, callback) => {
        const balance = userStore.user?.balance ?? 0;
        if (value < 0) callback(new Error("提现金额必须大于 0"));
        else if (value > balance) callback(new Error("提现金额不能大于余额"));
        else callback();
      },
      trigger: "blur",
    },
  ],
  channel: [{ required: true, message: "请选择提现渠道", trigger: "change" }],
  accountNo: [{ required: true, message: "请输入账号", trigger: "blur" }],
};

const query = reactive({
  page: 1,
  pageSize: 10,
  status: undefined as WithdrawStatus | undefined,
});

function getStatusMeta(status: WithdrawStatus) {
  return WITHDRAW_STATUS_MAP[status] ?? { label: status, type: "info" };
}

function getChannelLabel(channel: WithdrawChannel) {
  return WITHDRAW_CHANNEL_MAP[channel] ?? { label: channel, type: "info" };
}

function formatTime(time?: string): string {
  if (!time) return "-";
  return new Date(time).toLocaleString("zh-CN", { hour12: false });
}

async function loadRecords() {
  loading.value = true;
  try {
    const res = await withdrawApi.getMyWithdraws({
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
    await withdrawApi.createWithdraw({
      amount: form.amount,
      channel: form.channel,
      accountNo: form.accountNo,
      accountName: form.accountName || undefined,
      bankName: form.bankName || undefined,
      remark: form.remark || undefined,
    });
    ElMessage.success("提现申请已提交，等待管理员审批");
    form.amount = 100;
    form.accountNo = "";
    form.accountName = "";
    form.bankName = "";
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
  color: #f56c6c;
  font-weight: bold;
}

.hint {
  color: #909399;
  font-size: 12px;
  margin-top: 4px;
}

.pagination {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}
</style>
