<template>
  <div class="admin-notices">
    <el-card>
      <template #header>
        <div class="card-header">
          <span class="title">公告管理</span>
          <el-button type="primary" :icon="Plus" @click="openCreate">
            新建公告
          </el-button>
        </div>
      </template>

      <!-- 筛选栏 -->
      <el-form :inline="true" class="filter-bar">
        <el-form-item label="标题">
          <el-input
            v-model="query.keyword"
            placeholder="搜索标题"
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
            <el-option label="草稿" value="DRAFT" />
            <el-option label="已发布" value="PUBLISHED" />
            <el-option label="已归档" value="ARCHIVED" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch"
            >搜索</el-button
          >
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table
        v-loading="loading"
        :data="notices"
        border
        stripe
        style="width: 100%"
      >
        <el-table-column prop="id" label="ID" width="70" align="center" />
        <el-table-column
          prop="title"
          label="标题"
          min-width="220"
          show-overflow-tooltip
        />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusMeta(row.status).type" size="small">
              {{ getStatusMeta(row.status).label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="170">
          <template #default="{ row }">{{
            formatTime(row.createdAt)
          }}</template>
        </el-table-column>
        <el-table-column label="更新时间" width="170">
          <template #default="{ row }">{{
            formatTime(row.updatedAt)
          }}</template>
        </el-table-column>
        <el-table-column label="操作" width="300" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)"
              >编辑</el-button
            >
            <el-button
              v-if="row.status !== 'PUBLISHED'"
              link
              type="success"
              @click="handleChangeStatus(row, 'PUBLISHED')"
            >
              发布
            </el-button>
            <el-button
              v-if="row.status === 'PUBLISHED'"
              link
              type="warning"
              @click="handleChangeStatus(row, 'ARCHIVED')"
            >
              归档
            </el-button>
            <el-button link type="danger" @click="handleDelete(row)"
              >删除</el-button
            >
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
          @size-change="loadNotices"
          @current-change="loadNotices"
        />
      </div>
    </el-card>

    <!-- 新建/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑公告' : '新建公告'"
      width="640px"
      @closed="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="70px">
        <el-form-item label="标题" prop="title">
          <el-input
            v-model="form.title"
            placeholder="请输入公告标题"
            maxlength="100"
            show-word-limit
            clearable
          />
        </el-form-item>
        <el-form-item label="内容" prop="content">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="10"
            placeholder="请输入公告内容"
            maxlength="10000"
            show-word-limit
          />
        </el-form-item>
        <el-form-item prop="status">
          <template #label><span>状态</span></template>
          <el-radio-group v-model="form.status">
            <el-radio value="DRAFT">草稿</el-radio>
            <el-radio value="PUBLISHED">发布</el-radio>
            <el-radio value="ARCHIVED">归档</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";

import { Plus, Search, Refresh } from "@element-plus/icons-vue";
import * as noticeApi from "@/api/notice";
import { NOTICE_STATUS_MAP } from "@/constants/enums";
import type { Notice, NoticeStatus } from "@/types";
import {
  ElMessage,
  ElMessageBox,
  type FormInstance,
  type FormRules,
} from "element-plus";

const loading = ref(false);
const submitting = ref(false);
const notices = ref<Notice[]>([]);
const total = ref(0);

const query = reactive({
  page: 1,
  pageSize: 10,
  status: undefined as NoticeStatus | undefined,
  keyword: "",
});

const dialogVisible = ref(false);
const isEdit = ref(false);
const editingId = ref<number | null>(null);

const formRef = ref<FormInstance>();
const form = reactive<noticeApi.NoticePayload>({
  title: "",
  content: "",
  status: "PUBLISHED",
});

const rules: FormRules = {
  title: [
    { required: true, message: "请输入标题", trigger: "blur" },
    { min: 2, max: 100, message: "长度在 2 到 100 个字符", trigger: "blur" },
  ],
  content: [
    { required: true, message: "请输入内容", trigger: "blur" },
    { min: 2, max: 1000, message: "长度在 2 到 1000 个字符", trigger: "blur" },
  ],
};

function getStatusMeta(status: NoticeStatus) {
  return NOTICE_STATUS_MAP[status] ?? { label: status, type: "info" };
}

function formatTime(time?: string) {
  if (!time) return "-";
  return new Date(time).toLocaleString("zh-CN", { hour12: false });
}

async function loadNotices() {
  loading.value = true;
  try {
    const res = await noticeApi.getAllNotices({
      page: query.page,
      pageSize: query.pageSize,
      status: query.status,
      keyword: query.keyword || undefined,
    });
    notices.value = res.list;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  query.page = 1;
  loadNotices();
}

function handleReset() {
  query.page = 1;
  query.status = undefined;
  query.keyword = "";
  loadNotices();
}

function openCreate() {
  isEdit.value = false;
  editingId.value = null;
  dialogVisible.value = true;
}

function openEdit(row: Notice) {
  isEdit.value = true;
  editingId.value = row.id;
  form.title = row.title;
  form.content = row.content;
  form.status = row.status;
  dialogVisible.value = true;
}

function resetForm() {
  formRef.value?.resetFields();
  form.title = "";
  form.content = "";
  form.status = "PUBLISHED";
  editingId.value = null;
}

// 新建提交，修改提交
async function handleSubmit() {
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    if (isEdit.value && editingId.value !== null) {
      await noticeApi.updateNotice(editingId.value, { ...form });
      ElMessage.success("修改成功");
    } else {
      await noticeApi.createNotice({ ...form });
      ElMessage.success("创建成功");
    }
    dialogVisible.value = false;
    await loadNotices();
  } finally {
    submitting.value = false;
  }
}

// 修改公告状态
async function handleChangeStatus(row: Notice, status: NoticeStatus) {
  const action = status === "PUBLISHED" ? "发布" : "归档";
  try {
    await ElMessageBox.confirm(`确定要${action}该公告吗？`, "确认", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    });
  } catch {
    return;
  }

  await noticeApi.updateNoticeStatus(row.id, status);
  ElMessage.success(`公告${action}成功`);
  await loadNotices();
}

// 删除公告
async function handleDelete(row: Notice) {
  try {
    await ElMessageBox.confirm(`确定要删除该公告 ${row.title}吗？`, "确认", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    });
  } catch {
    return;
  }

  await noticeApi.deleteNotice(row.id);
  ElMessage.success("公告删除成功");
  await loadNotices();
}

onMounted(loadNotices);
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

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
