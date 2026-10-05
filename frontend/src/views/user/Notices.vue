<template>
  <div class="user-notices">
    <el-card>
      <template #header>
        <div class="card-header">
          <span class="title">📢 公告</span>
        </div>
      </template>

      <div v-loading="loading" class="notice-list">
        <el-empty
          v-if="!loading && notices.length === 0"
          description="暂无公告"
        />

        <div
          v-for="notice in notices"
          :key="notice.id"
          class="notice-item"
          @click="openDetail(notice)"
        >
          <div class="notice-title">
            <el-icon><Bell /></el-icon>
            <span>{{ notice.title }}</span>
          </div>
          <div class="notice-time">
            {{ formatTime(notice.createdAt) }}
          </div>
        </div>
      </div>

      <div v-if="total > 0" class="pagination">
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.pageSize"
          :total="total"
          layout="total, prev, pager, next"
          size="small"
          @current-change="loadNotices"
        />
      </div>
    </el-card>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="公告详情" width="600px">
      <div v-if="currentNotice" class="detail">
        <h2 class="detail-title">{{ currentNotice.title }}</h2>
        <div class="detail-time">{{ formatTime(currentNotice.createdAt) }}</div>
        <el-divider />
        <div class="detail-content">{{ currentNotice.content }}</div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import * as noticeApi from "@/api/notice";
import { Bell } from "@element-plus/icons-vue";
import type { Notice } from "@/types";

const loading = ref(false);
const notices = ref<noticeApi.NoticeListItem[]>([]);
const total = ref(0);

const query = reactive({
  page: 1,
  pageSize: 10,
});

const detailVisible = ref(false);
const currentNotice = ref<Notice | null>(null);

function formatTime(time?: string) {
  if (!time) return "-";
  return new Date(time).toLocaleString("zh-CN", { hour12: false });
}

async function loadNotices() {
  loading.value = true;
  try {
    const res = await noticeApi.getPublicNotices({
      page: query.page,
      pageSize: query.pageSize,
    });
    notices.value = res.list;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}
async function openDetail(notice: noticeApi.NoticeListItem) {
  currentNotice.value = await noticeApi.getPublicNoticeDetail(notice.id);
  detailVisible.value = true;
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

.notice-list {
  min-height: 200px;
}

.notice-item {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.2s;
}

.notice-item:hover {
  background: #f5f7fa;
}

.notice-item:last-child {
  border-bottom: none;
}

.notice-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  color: #303133;
  margin-bottom: 6px;
}

.notice-time {
  font-size: 12px;
  color: #909399;
  padding-left: 24px;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}

.detail-title {
  margin: 0 0 8px;
  color: #303133;
}

.detail-time {
  color: #909399;
  font-size: 13px;
}

.detail-content {
  line-height: 1.8;
  color: #606266;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
