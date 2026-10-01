<template>
  <div class="group-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span class="title">商品分组管理</span>
          <el-button type="primary" :icon="Plus" @click="openCreate">
            新增分组
          </el-button>
        </div>
      </template>

      <el-table
        v-loading="loading"
        :data="groups"
        border
        stripe
        style="width: 100%"
      >
        <el-table-column prop="id" label="ID" width="80" align="center" />
        <el-table-column prop="name" label="分组名" min-width="150" />
        <el-table-column prop="sort" label="排序" width="100" align="center" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'ACTIVE' ? 'success' : 'info'">
              {{ row.status === "ACTIVE" ? "启用" : "禁用" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="商品数" width="100" align="center">
          <template #default="{ row }">
            {{ row._count?.products ?? 0 }}
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">
              编辑
            </el-button>
            <el-button link type="danger" @click="handleDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑分组' : '新增分组'"
      width="480px"
      @closed="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="分组名" prop="name">
          <el-input v-model="form.name" placeholder="请输入分组名" clearable />
        </el-form-item>
        <el-form-item label="排序" prop="sort">
          <el-input-number v-model="form.sort" :min="0" :max="9999" />
          <span class="hint">数字越小越靠前</span>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio value="ACTIVE">启用</el-radio>
            <el-radio value="DISABLED">禁用</el-radio>
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
import type { Group, GroupPayload } from "@/types";
import {
  ElMessage,
  ElMessageBox,
  type FormInstance,
  type FormRules,
} from "element-plus";
import * as groupApi from "@/api/group";
import { Plus } from "@element-plus/icons-vue";
import { onMounted, reactive, ref } from "vue";

const loading = ref(false);
const submitting = ref(false);
const groups = ref<Group[]>([]);

const dialogVisible = ref(false);
const isEdit = ref(false);
const editingId = ref<number | null>(null);

const formRef = ref<FormInstance>();
const form = reactive<GroupPayload>({
  name: "",
  sort: 0,
  status: "ACTIVE",
});

const rules: FormRules<GroupPayload> = {
  name: [
    { required: true, message: "请输入分组名", trigger: "blur" },
    {
      min: 1,
      max: 20,
      message: "分组名长度应在 1 到 20 个字符之间",
      trigger: "blur",
    },
  ],
};

function formatTime(time: string) {
  return new Date(time).toLocaleString("zh-CN", { hour12: false });
}

async function loadGroups() {
  loading.value = true;
  try {
    groups.value = await groupApi.getGroups();
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  isEdit.value = false;
  editingId.value = null;
  dialogVisible.value = true;
}

function openEdit(row: Group) {
  isEdit.value = true;
  editingId.value = row.id;
  form.name = row.name;
  form.sort = row.sort;
  form.status = row.status;
  dialogVisible.value = true;
}

function resetForm() {
  formRef.value?.resetFields();
  form.name = "";
  form.sort = 0;
  form.status = "ACTIVE";
  editingId.value = null;
}

async function handleSubmit() {
  if (!formRef.value) return;

  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    if (isEdit.value && editingId.value !== null) {
      await groupApi.updateGroup(editingId.value!, { ...form });
      ElMessage.success("分组修改成功");
    } else {
      await groupApi.createGroup({ ...form });
      ElMessage.success("分组新增成功");
    }
    dialogVisible.value = false;
    await loadGroups();
  } finally {
    submitting.value = false;
  }
}

async function handleDelete(row: Group) {
  const coutn = row._count?.products ?? 0;
  const tip =
    coutn > 0 ? `该分组下有 ${coutn} 个商品，删除失败` : "确定要删除该分组吗？";

  try {
    await ElMessageBox.confirm(tip, "删除确认", {
      type: "warning",
      confirmButtonText: "确定",
      cancelButtonText: "取消",
    });
  } catch {
    return;
  }

  await groupApi.deleteGroup(row.id);
  ElMessage.success("分组删除成功");
  await loadGroups();
}
onMounted(loadGroups);
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

.hint {
  margin-left: 8px;
  color: #909399;
  font-size: 12px;
}
</style>
