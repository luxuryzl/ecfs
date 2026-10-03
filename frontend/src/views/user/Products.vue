<template>
  <div class="user-products">
    <el-card>
      <template #header>
        <div class="card-header">
          <span class="title">商品列表</span>
          <div class="filter">
            <el-select
              v-model="selectedGroupId"
              placeholder="全部分组"
              clearable
              style="width: 160px"
              @change="handleGroupChange"
            >
              <el-option
                v-for="g in groupOptions"
                :key="g.id"
                :label="g.name"
                :value="g.id"
              />
            </el-select>
          </div>
        </div>
      </template>

      <div v-loading="loading" class="product-grid">
        <el-empty
          v-if="!loading && products.length === 0"
          description="暂无商品"
        />

        <el-card
          v-for="p in products"
          :key="p.id"
          class="product-card"
          shadow="hover"
          :body-style="{ padding: '0' }"
        >
          <div class="image-wrapper">
            <el-image
              v-if="p.image"
              :src="p.image"
              fit="cover"
              class="product-image"
            />
            <div v-else class="no-image">暂无图片</div>
          </div>
          <div class="product-body">
            <div class="name" :title="p.name">{{ p.name }}</div>
            <div class="group">
              <el-tag v-if="p.group" size="small" type="info">
                {{ p.group.name }}
              </el-tag>
            </div>
            <div class="description">{{ p.description || "暂无描述" }}</div>
            <div class="bottom">
              <span class="price">¥{{ p.price.toFixed(2) }}</span>
              <span class="stock">库存 {{ p.stock }}</span>
            </div>
            <el-button
              type="primary"
              style="width: 100%; margin-top: 12px"
              :disabled="p.stock <= 0"
              @click="handleBuy(p)"
            >
              {{ p.stock > 0 ? "立即购买" : "缺货" }}
            </el-button>
          </div>
        </el-card>
      </div>

      <div v-if="total > 0" class="pagination">
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.pageSize"
          :total="total"
          :page-sizes="[10, 20, 30]"
          layout="total, sizes, prev, pager, next"
          @size-change="loadProducts"
          @current-change="loadProducts"
        />
      </div>
    </el-card>

    <!-- 下单弹窗 -->
    <el-dialog v-model="buyDialogVisible" title="确认购买" width="420px">
      <div v-if="selectedProduct" class="buy-dialog">
        <div class="buy-product">
          <span class="buy-label">商品：</span>
          <span>{{ selectedProduct.name }}</span>
        </div>
        <div class="buy-product">
          <span class="buy-label">单价：</span>
          <span class="price">¥{{ selectedProduct.price.toFixed(2) }}</span>
        </div>
        <div class="buy-product">
          <span class="buy-label">数量：</span>
          <el-input-number
            v-model="buyQuantity"
            :min="1"
            :max="selectedProduct.stock"
            size="small"
          />
        </div>
        <div class="buy-product">
          <span class="buy-label">合计：</span>
          <span class="total-price">
            ¥{{ (selectedProduct.price * buyQuantity).toFixed(2) }}
          </span>
        </div>
      </div>

      <template #footer>
        <el-button @click="buyDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="buying" @click="confirmBuy">
          确认下单
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage } from "element-plus";
import * as productApi from "@/api/product";
import * as groupApi from "@/api/group";
import type { Product, Group } from "@/types/index";

const loading = ref(true);
const products = ref<Product[]>([]);
const total = ref(0);
const groupOptions = ref<Group[]>([]);
const selectedGroupId = ref<number | undefined>(undefined);

const query = reactive({
  page: 1,
  pageSize: 10,
});

const buyDialogVisible = ref(false);
const buying = ref(false);
const selectedProduct = ref<Product | null>(null);
const buyQuantity = ref(1);

async function loadProducts() {
  loading.value = true;
  try {
    const res = await productApi.getProducts({
      page: query.page,
      pageSize: query.pageSize,
      groupId: selectedGroupId.value,
      status: "ON", //用户端只看上加
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

function handleGroupChange() {
  query.page = 1;
  loadProducts();
}

function handleBuy(product: Product) {
  selectedProduct.value = product;
  buyQuantity.value = 1;
  buyDialogVisible.value = true;
}

async function confirmBuy() {
  if (!selectedProduct.value) return;

  buying.value = true;
  try {
    // 阶段11会真实实现下单接口
    ElMessage.info("下单接口将在阶段11实现");
    buyDialogVisible.value = false;
  } finally {
    buying.value = false;
  }
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

.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
  min-height: 200px;
}

.product-card {
  transition: transform 0.2s;
}

.product-card:hover {
  transform: translateY(-4px);
}

.image-wrapper {
  height: 180px;
  background: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.product-image {
  width: 100%;
  height: 100%;
}

.no-image {
  color: #c0c4cc;
  font-size: 14px;
}

.product-body {
  padding: 12px;
}

.name {
  font-size: 15px;
  font-weight: bold;
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.group {
  margin-bottom: 8px;
  min-height: 22px;
}

.description {
  font-size: 12px;
  color: #909399;
  height: 32px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  margin-bottom: 8px;
}

.bottom {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.price {
  color: #f56c6c;
  font-size: 18px;
  font-weight: bold;
}

.stock {
  color: #909399;
  font-size: 12px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.buy-dialog {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.buy-product {
  display: flex;
  align-items: center;
}

.buy-label {
  width: 60px;
  color: #606266;
}

.total-price {
  color: #f56c6c;
  font-weight: bold;
  font-size: 16px;
}
</style>
