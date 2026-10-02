import type {
  PageParams,
  Paginated,
  Product,
  ProductPayload,
  ProductStatus,
} from "@/types";
import { request } from "./request";

export interface ProductQuery extends PageParams {
  groupId?: number;
  status?: ProductStatus;
}

export function getProducts(params: ProductQuery = {}) {
  return request.get<Paginated<Product>>("/products", { params });
}

export function getProductDetail(id: number) {
  return request.get<Product>(`/products/${id}`);
}

export function createProduct(payload: ProductPayload) {
  return request.post<Product>("/products", payload);
}

export function updateProduct(id: number, payload: Partial<ProductPayload>) {
  return request.put<Product>(`/products/${id}`, payload);
}

export function updateProductStatus(id: number, status: ProductStatus) {
  return request.patch<Product>(`/products/${id}/status`, { status });
}

export function deleteProduct(id: number) {
  return request.delete<{ success: boolean }>(`/products/${id}`);
}
