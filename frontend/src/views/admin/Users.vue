<template>
  <div class="admin-users">
    <el-card>
      <template #header>
        <div class="card-header">
          <span class="title">客户管理</span>
        </div>
      </template>

      <!-- 筛选栏 -->
      <el-form :inline="true" class="filter-bar">
        <el-form-item label="关键词">
          <el-input
            v-model="query.keyword"
            placeholder="用户名/昵称/手机号"
            clearable
            style="width: 220px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="角色">
          <el-select
            v-model="query.role"
            placeholder="全部"
            clearable
            style="width: 120px"
          >
            <el-option label="普通用户" value="USER" />
            <el-option label="管理员" value="ADMIN" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="query.status"
            placeholder="全部"
            clearable
            style="width: 120px"
          >
            <el-option label="正常" value="ACTIVE" />
            <el-option label="已禁用" value="DISABLED" />
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
        :data="users"
        border
        stripe
        style="width: 100%"
      >
        <el-table-column prop="id" label="ID" width="70" align="center" />
        <el-table-column label="用户" min-width="150">
          <template #default="{ row }">
            <div class="user-cell">
              <div class="username">{{ row.nickname ?? row.username }}</div>
              <div class="sub">@{{ row.username }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="手机号" width="130">
          <template #default="{ row }">{{ row.phone || "-" }}</template>
        </el-table-column>
        <el-table-column label="角色" width="100" align="center">
          <template #default="{ row }">
            <el-tag
              :type="row.role === 'ADMIN' ? 'danger' : 'info'"
              size="small"
            >
              {{ row.role === "ADMIN" ? "管理员" : "普通用户" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="余额" width="110" align="right">
          <template #default="{ row }">
            <span class="balance">¥{{ row.balance.toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="订单/充值/提现" width="140" align="center">
          <template #default="{ row }">
            <span class="count">
              {{ row._count?.orders ?? 0 }} / {{ row._count?.recharges ?? 0 }} /
              {{ row._count?.withdraws ?? 0 }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag
              :type="row.status === 'ACTIVE' ? 'success' : 'danger'"
              size="small"
            >
              {{ row.status === "ACTIVE" ? "正常" : "已禁用" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="注册时间" width="170">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)"
              >详情</el-button
            >
            <el-button
              v-if="row.role !== 'ADMIN'"
              link
              :type="row.status === 'ACTIVE' ? 'warning' : 'success'"
              @click="handleToggleStatus(row)"
            >
              {{ row.status === "ACTIVE" ? "禁用" : "启用" }}
            </el-button>
            <el-button
              v-if="row.role !== 'ADMIN'"
              link
              type="primary"
              @click="openBalanceDialog(row)"
            >
              调余额
            </el-button>
            <el-button link type="info" @click="openResetPwdDialog(row)">
              重置密码
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
          @size-change="loadUsers"
          @current-change="loadUsers"
        />
      </div>
    </el-card>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="用户详情" width="520px">
      <el-descriptions v-if="currentUser" :column="1" border>
        <el-descriptions-item label="ID">{{
          currentUser.id
        }}</el-descriptions-item>
        <el-descriptions-item label="用户名">{{
          currentUser.username
        }}</el-descriptions-item>
        <el-descriptions-item label="昵称">{{
          currentUser.nickname || "-"
        }}</el-descriptions-item>
        <el-descriptions-item label="手机号">{{
          currentUser.phone || "-"
        }}</el-descriptions-item>
        <el-descriptions-item label="角色">
          <el-tag
            :type="currentUser.role === 'ADMIN' ? 'danger' : 'info'"
            size="small"
          >
            {{ currentUser.role === "ADMIN" ? "管理员" : "普通用户" }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="余额">
          <span class="balance">¥{{ currentUser.balance.toFixed(2) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="累计消费">
          <span class="balance"
            >¥{{ (currentUser?.orderAmount ?? 0).toFixed(2) }}</span
          >
        </el-descriptions-item>
        <el-descriptions-item label="订单数">
          {{ currentUser._count?.orders ?? 0 }}
        </el-descriptions-item>
        <el-descriptions-item label="充值次数">
          {{ currentUser._count?.recharges ?? 0 }}
        </el-descriptions-item>
        <el-descriptions-item label="提现次数">
          {{ currentUser._count?.withdraws ?? 0 }}
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag
            :type="currentUser.status === 'ACTIVE' ? 'success' : 'danger'"
            size="small"
          >
            {{ currentUser.status === "ACTIVE" ? "正常" : "已禁用" }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="注册时间">
          {{ formatTime(currentUser.createdAt) }}
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>

    <!-- 调余额弹窗 -->
    <el-dialog v-model="balanceDialogVisible" title="调整余额" width="420px">
      <el-form label-width="90px">
        <el-form-item label="用户">
          <span>{{ selectedUser?.nickname ?? selectedUser?.username }}</span>
        </el-form-item>
        <el-form-item label="当前余额">
          <span class="balance"
            >¥{{ (selectedUser?.balance ?? 0).toFixed(2) }}</span
          >
        </el-form-item>
        <el-form-item label="调整金额">
          <el-input-number
            v-model="balanceAmount"
            :precision="2"
            :step="10"
            style="width: 100%"
          />
          <div class="hint">正数增加，负数减少</div>
        </el-form-item>
        <el-form-item label="调整原因">
          <el-input
            v-model="balanceRemark"
            type="textarea"
            :rows="2"
            placeholder="必填，比如：补偿退款"
            maxlength="200"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="balanceDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="submitting"
          :disabled="balanceAmount === 0 || !balanceRemark.trim()"
          @click="confirmAdjustBalance"
        >
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 重置密码弹窗 -->
    <el-dialog v-model="pwdDialogVisible" title="重置密码" width="420px">
      <el-alert
        type="warning"
        :closable="false"
        title="重置后用户需使用新密码登录，请妥善告知用户"
        style="margin-bottom: 16px"
      />
      <el-form label-width="90px">
        <el-form-item label="用户">
          <span>{{ selectedUser?.nickname ?? selectedUser?.username }}</span>
        </el-form-item>
        <el-form-item label="新密码">
          <el-input
            v-model="newPassword"
            type="password"
            placeholder="至少 6 位"
            show-password
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="pwdDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="submitting"
          :disabled="newPassword.length < 6"
          @click="confirmResetPassword"
        >
          确定重置
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import * as userApi from "@/api/user";
import type { Role, UserStatus } from "@/types";
import { ElMessage, ElMessageBox } from "element-plus";
import { onMounted, reactive, ref } from "vue";
import { Refresh, Search } from "@element-plus/icons-vue";
import { lo } from "element-plus/es/locales.mjs";

const loading = ref(false);
const submitting = ref(false);
const users = ref<userApi.UserListItem[]>([]);
const total = ref(0);

const query = reactive({
  page: 1,
  pageSize: 10,
  keyword: "",
  role: undefined as Role | undefined,
  status: undefined as UserStatus | undefined,
});

const detailVisible = ref(false);
const currentUser = ref<userApi.UserDetail | null>(null);

const balanceDialogVisible = ref(false);
const selectedUser = ref<userApi.UserListItem | null>(null);
const balanceAmount = ref(0);
const balanceRemark = ref("");

const pwdDialogVisible = ref(false);
const newPassword = ref("");

function formatTime(time?: string) {
  if (!time) return "-";
  return new Date(time).toLocaleString("zh-CN", { hour12: false });
}

async function loadUsers() {
  loading.value = true;
  try {
    const res = await userApi.getUsers({
      page: query.page,
      pageSize: query.pageSize,
      keyword: query.keyword || undefined,
      role: query.role,
      status: query.status,
    });
    users.value = res.list;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  query.page = 1;
  loadUsers();
}

function handleReset() {
  query.page = 1;
  query.keyword = "";
  query.role = undefined;
  query.status = undefined;
  loadUsers();
}

async function openDetail(row: userApi.UserListItem) {
  currentUser.value = await userApi.getUserDetail(row.id);
  detailVisible.value = true;
}

async function handleToggleStatus(row: userApi.UserListItem) {
  const newStatus: UserStatus = row.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
  const action = newStatus === "ACTIVE" ? "启用" : "禁用";

  try {
    await ElMessageBox.confirm(`确定要${action}该用户吗？`, "确认", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    });
  } catch {
    return;
  }

  await userApi.updateUserStatus(row.id, newStatus);
  ElMessage.success(`用户${action}成功`);
  await loadUsers();
}

function openBalanceDialog(row: userApi.UserListItem) {
  selectedUser.value = row;
  balanceAmount.value = 0;
  balanceRemark.value = "";
  balanceDialogVisible.value = true;
}

async function confirmAdjustBalance() {
  if (!selectedUser.value) return;
  if (balanceAmount.value === 0) {
    ElMessage.warning("请输入金额");
    return;
  }
  if (!balanceRemark.value.trim()) {
    ElMessage.warning("请填写调整原因");
    return;
  }

  submitting.value = true;
  try {
    await userApi.adjustBalance(
      selectedUser.value.id,
      balanceAmount.value,
      balanceRemark.value.trim(),
    );
    ElMessage.success("余额调整成功");
    balanceDialogVisible.value = false;
    await loadUsers();
  } finally {
    submitting.value = false;
  }
}

function openResetPwdDialog(row: userApi.UserListItem) {
  selectedUser.value = row;
  newPassword.value = "";
  pwdDialogVisible.value = true;
}

async function confirmResetPassword() {
  if (!selectedUser.value) return;
  if (newPassword.value.length < 6) {
    ElMessage.warning("密码长度不能小于6位");
    return;
  }

  submitting.value = true;
  try {
    await userApi.resetPassword(selectedUser.value.id, newPassword.value);
    ElMessage.success("密码重置成功");
    pwdDialogVisible.value = false;
  } finally {
    submitting.value = false;
  }
}

onMounted(loadUsers);
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

.user-cell .username {
  font-weight: 500;
}

.sub {
  font-size: 12px;
  color: #909399;
}

.balance {
  color: #f56c6c;
  font-weight: bold;
}

.count {
  font-size: 12px;
  color: #606266;
}

.hint {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
