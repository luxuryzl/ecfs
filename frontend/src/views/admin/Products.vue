<template>
  <div class="product-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span class="title">商品管理</span>
          <el-button type="primary" :icon="Plus" @click="openCreate">
            新增商品
          </el-button>
        </div>
      </template>

      <!-- 搜索栏 -->
      <el-form :inline="true" :model="query" class="filter-bar">
        <el-form-item label="关键词">
          <el-input
            v-model="query.keyword"
            placeholder="商品名"
            clearable
            style="width: 200px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="分组">
          <el-select
            v-model="query.groupId"
            placeholder="全部分组"
            clearable
            style="width: 160px"
          >
            <el-option
              v-for="g in groupOptions"
              :key="g.id"
              :label="g.name"
              :value="g.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="query.status"
            placeholder="全部状态"
            clearable
            style="width: 140px"
          >
            <el-option label="上架" value="ON" />
            <el-option label="下架" value="OFF" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">
            搜索
          </el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 表格 -->
      <el-table
        v-loading="loading"
        :data="products"
        border
        stripe
        style="width: 100%"
      >
        <el-table-column prop="id" label="ID" width="70" align="center" />
        <el-table-column label="图片" width="90" align="center">
          <template #default="{ row }">
            <el-image
              v-if="row.image"
              :src="row.image"
              fit="cover"
              style="width: 50px; height: 50px; border-radius: 4px"
              :preview-src-list="[row.image]"
              preview-teleported
            />
            <span v-else class="no-image">无图</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="name"
          label="商品名"
          min-width="160"
          show-overflow-tooltip
        />
        <el-table-column label="分组" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.group" size="small">{{ row.group.name }}</el-tag>
            <span v-else class="text-muted">未分组</span>
          </template>
        </el-table-column>
        <el-table-column prop="price" label="价格" width="110" align="right">
          <template #default="{ row }">
            <span class="price">¥{{ row.price.toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="stock" label="库存" width="80" align="center" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'ON' ? 'success' : 'info'">
              {{ row.status === "ON" ? "上架" : "下架" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)"
              >编辑</el-button
            >
            <el-button
              link
              :type="row.status === 'ON' ? 'warning' : 'success'"
              @click="handleToggleStatus(row)"
            >
              {{ row.status === "ON" ? "下架" : "上架" }}
            </el-button>
            <el-button link type="danger" @click="handleDelete(row)">
              删除
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
          @size-change="loadProducts"
          @current-change="loadProducts"
        />
      </div>
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑商品' : '新增商品'"
      width="640px"
      @closed="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="商品名" prop="name">
          <el-input v-model="form.name" placeholder="请输入商品名" clearable />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="选填，商品描述"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="价格" prop="price">
          <el-input-number
            v-model="form.price"
            :min="0"
            :precision="2"
            :step="1"
            style="width: 200px"
          />
          <span class="hint">元</span>
        </el-form-item>
        <el-form-item label="库存" prop="stock">
          <el-input-number
            v-model="form.stock"
            :min="0"
            :step="1"
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="分组" prop="groupId">
          <el-select
            v-model="form.groupId"
            placeholder="选填"
            clearable
            style="width: 240px"
          >
            <el-option
              v-for="g in groupOptions"
              :key="g.id"
              :label="g.name"
              :value="g.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="图片" prop="image">
          <el-upload
            class="image-uploader"
            :show-file-list="false"
            :before-upload="beforeUpload"
            :http-request="handleUpload"
            accept="image/*"
          >
            <img v-if="form.image" :src="form.image" class="uploaded-image" />
            <el-icon v-else class="uploader-icon"><Plus /></el-icon>
          </el-upload>
          <div v-if="form.image" class="image-actions">
            <el-button link type="danger" size="small" @click="form.image = ''">
              移除图片
            </el-button>
          </div>
        </el-form-item>
        <el-form-item prop="status">
          <template #label><span>状态</span></template>
          <el-radio-group v-model="form.status">
            <el-radio value="ON">上架</el-radio>
            <el-radio value="OFF">下架</el-radio>
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
import { onMounted, reactive, ref } from "vue";
import type { Group, Product, ProductPayload, ProductStatus } from "@/types";
import {
  ElMessage,
  ElMessageBox,
  type FormInstance,
  type FormRules,
} from "element-plus";
import { Plus, Search, Refresh } from "@element-plus/icons-vue";
import * as productApi from "@/api/product";
import * as groupApi from "@/api/group";
import * as uploadApi from "@/api/upload";
import type { UploadRawFile, UploadRequestOptions } from "element-plus";

const loading = ref(false);
const submitting = ref(false);
const products = ref<Product[]>([]);
const total = ref(0);
const groupOptions = ref<Group[]>([]);

const query = reactive({
  page: 1,
  pageSize: 10,
  keyword: "",
  groupId: undefined as number | undefined,
  status: undefined as ProductStatus | undefined,
});

const dialogVisible = ref(false);
const isEdit = ref(false);
const editingId = ref<number | null>(null);

const formRef = ref<FormInstance>();
const form = reactive<ProductPayload>({
  name: "",
  description: "",
  price: 0,
  stock: 0,
  image: "",
  groupId: null,
  status: "ON",
});

const rules: FormRules<ProductPayload> = {
  name: [
    { required: true, message: "请输入商品名", trigger: "blur" },
    { min: 1, max: 50, message: "长度在 1 到 50 个字符", trigger: "blur" },
  ],
  price: [
    { required: true, message: "请输入价格", trigger: "blur" },
    {
      validator: (_rule, value: number, callback) => {
        if (value <= 0 || value > 999999999) {
          callback(new Error("价格必须大于 0，小于999999999"));
        } else {
          callback();
        }
      },
      trigger: "blur",
    },
  ],
  stock: [
    { required: true, message: "请输入库存", trigger: "blur" },
    {
      validator: (_rule, value: number, callback) => {
        if (value < 0 || value > 999999999) {
          callback(new Error("库存必须大于等于 0，小于999999999"));
        } else {
          callback();
        }
      },
      trigger: "blur",
    },
  ],
};

async function loadProducts() {
  loading.value = true;
  try {
    const res = await productApi.getProducts({
      page: query.page,
      pageSize: query.pageSize,
      keyword: query.keyword || undefined,
      groupId: query.groupId,
      status: query.status,
    });
    products.value = res.list;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

async function loadGroups() {
  groupOptions.value = await groupApi.getGroups();
}

function handleSearch() {
  query.page = 1;
  loadProducts();
}

function handleReset() {
  query.page = 1;
  query.keyword = "";
  query.groupId = undefined;
  query.status = undefined;
  loadProducts();
}

function openCreate() {
  isEdit.value = false;
  editingId.value = null;
  dialogVisible.value = true;
}

function openEdit(row: Product) {
  isEdit.value = true;
  editingId.value = row.id;
  form.name = row.name;
  form.description = row.description ?? "";
  form.price = row.price;
  form.stock = row.stock;
  form.image = row.image ?? "";
  form.groupId = row.groupId ?? null;
  form.status = row.status;
  dialogVisible.value = true;
}

function resetForm() {
  formRef.value?.resetFields();
  form.name = "";
  form.description = "";
  form.price = 0;
  form.stock = 0;
  form.image = "";
  form.groupId = null;
  form.status = "ON";
  editingId.value = null;
}

// 上传前校验
function beforeUpload(file: UploadRawFile) {
  const isImage = file.type.startsWith("image/");
  if (!isImage) {
    ElMessage.error("请上传图片");
    return false;
  }
  const isLt5M = file.size / 1024 / 1024 < 5;
  if (!isLt5M) {
    ElMessage.error("图片大小不能超过5MB");
    return false;
  }

  return true;
}

// 自定义上传
async function handleUpload(options: UploadRequestOptions) {
  const result = await uploadApi.uploadImage(options.file);
  form.image = result.url;
  ElMessage.success("上传成功");
  return result;
}

async function handleSubmit() {
  if (!formRef.value) return;

  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    const payload: ProductPayload = {
      name: form.name,
      description: form.description || undefined,
      price: form.price,
      stock: form.stock,
      image: form.image || undefined,
      groupId: form.groupId ?? null,
      status: form.status,
    };

    if (isEdit.value && editingId.value !== null) {
      await productApi.updateProduct(editingId.value, payload);
      ElMessage.success("修改成功");
    } else {
      await productApi.createProduct(payload);
      ElMessage.success("新增成功");
    }
    dialogVisible.value = false;
    await loadProducts();
  } finally {
    submitting.value = false;
  }
}

async function handleToggleStatus(row: Product) {
  const newStatus: ProductStatus = row.status === "ON" ? "OFF" : "ON";
  const action = newStatus === "ON" ? "上架" : "下架";
  try {
    await ElMessageBox.confirm(
      `确定要${action}该商品： ${row.name}吗？`,
      "操作确认",
      {
        type: "warning",
        confirmButtonText: "确定",
        cancelButtonText: "取消",
      },
    );
  } catch {
    return;
  }
  await productApi.updateProductStatus(row.id, newStatus);
  ElMessage.success(`商品${action}成功`);
  await loadProducts();
}

async function handleDelete(row: Product) {
  try {
    await ElMessageBox.confirm(
      `确定要删除该商品： ${row.name}吗？该操作不可恢复`,
      "删除确认",
      {
        type: "warning",
        confirmButtonText: "确定",
        cancelButtonText: "取消",
      },
    );
  } catch {
    return;
  }
  await productApi.deleteProduct(row.id);
  ElMessage.success("商品删除成功");
  await loadProducts();
}

onMounted(() => {
  loadGroups();
  loadProducts();
});
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

.price {
  color: #f56c6c;
  font-weight: bold;
}

.no-image {
  color: #c0c4cc;
  font-size: 12px;
}

.text-muted {
  color: #909399;
}

.hint {
  margin-left: 8px;
  color: #909399;
  font-size: 12px;
}

.preview {
  margin-top: 8px;
}

.image-uploader :deep(.el-upload) {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: border-color 0.2s;
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-uploader :deep(.el-upload:hover) {
  border-color: #409eff;
}

.uploaded-image {
  width: 120px;
  height: 120px;
  object-fit: cover;
  display: block;
}

.uploader-icon {
  font-size: 28px;
  color: #8c939d;
}

.image-actions {
  margin-top: 8px;
}
</style>
