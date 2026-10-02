// 对后端的类型定义

// 1.======通用======
export interface ApiResponseSuccess<T> {
  success: true;
  data: T;
}

export interface ApiResponseError {
  success: false;
  message: string;
  code?: string;
}

export type ApiResponse<T> = ApiResponseSuccess<T> | ApiResponseError;

// 分布响应
export interface Paginated<T> {
  list: T[];
  total: number;
}

export interface PageParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
}

// 2.======认证 & 用户相关======
export type Role = "USER" | "ADMIN";
export type UserStatus = "ACTIVE" | "DISABLED";

export interface UserInfo {
  id: number;
  username: string;
  nickname?: string | null;
  phone?: string | null;
  role: Role;
  balance: number;
  status?: UserStatus;
  createAt?: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: UserInfo;
}

export interface RegisterPayload {
  username: string;
  password: string;
  nickname?: string;
  phone?: string;
}

// 3.======分组相关======
export interface Group {
  id: number;
  name: string;
  sort: number;
  status: "ACTIVE" | "DISABLED";
  createAt?: string;
  updateAt?: string;
  _count?: {
    products: number;
  };
}

export interface GroupPayload {
  name: string;
  sort?: number;
  status: "ACTIVE" | "DISABLED";
}

// 4.======商品相关======
export type ProductStatus = "ON" | "OFF";

export interface Product {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  stock: number;
  image?: string | null;
  status: ProductStatus;
  groupId?: number | null;
  group?: Group | null;
  createAt?: string;
  updateAt?: string;
}

export interface ProductPayload {
  name: string;
  description?: string;
  price: number;
  stock: number;
  image?: string;
  groupId?: number | null;
  status?: ProductStatus;
}

// 5.======订单相关======
export type OrderType = "NORMAL" | "SUPPLEMENT" | "REFUND"; //正常，补充，退款
export type OrderStatus = "PENDING" | "PAID" | "CANCELLED" | "DONE";

export interface Order {
  id: number;
  orderNo: string;
  parentId?: number | null;
  type: OrderType;
  userId: number;
  productId: number;
  quantity: number; // 购买数量
  amount: number; // 总金额
  status: OrderStatus;
  remark?: string | null; // 订单备注
  createAt?: string;
  updateAt?: string;
  user?: UserInfo;
  product?: Product;
  parent?: Order | null;
  children?: Order[];
}

export interface OrderCreatePayload {
  productId: number;
  quantity: number;
  remark?: string;
}

// 6.======充值相关======
export type RechargeStatus = "PENDING" | "APPROVED" | "REJECTED"; // 待审核，已通过，已拒绝

export interface Recharge {
  id: number;
  userId: number;
  amount: number;
  status: RechargeStatus;
  remark?: string | null; // 审核备注
  createAt?: string;
  updateAt?: string;
  user?: UserInfo;
}

// 7.======提现相关======
export type WithdrawChannel = "ALIPAY" | "BANK" | "WECHAT" | "OTHER"; // 支付宝，银行卡,微信，其他
export type WithdrawStatus = "PENDING" | "APPROVED" | "REJECTED"; // 待审核，已通过，已拒绝

export interface Withdrawal {
  id: number;
  userId: number;
  amount: number; // 提现金额
  Account: string; // 提现账号
  channel: WithdrawChannel;
  accountNo: string | null; // 提现账号
  accountName: string | null; // 提现账号名称
  bankName: string | null; // 提现银行名称
  status: WithdrawStatus;
  remark?: string | null; // 审核备注
  createAt?: string;
  updateAt?: string;
  user?: UserInfo;
}

export interface WithdrawCreatePayload {
  amount: number;
  channel: WithdrawChannel;
  accountNo: string;
  accountName?: string;
  bankName?: string;
  account?: string;
}

// 8.======公告相关======
export type NoticeStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED"; // 草稿，已发布，已归档

export interface Notice {
  id: number;
  title: string;
  content: string;
  status: NoticeStatus;
  createAt?: string;
  updateAt?: string;
}

// 9.======操作日志相关======
export interface OperationLog {
  id: number;
  operatorId: number;
  action: string;
  targetType: string;
  targetId: number | null;
  detail?: string | null;
  createAt?: string;
  operator?: UserInfo;
}

// 10.======仪表盘相关======
export interface DashboardStats {
  userCount: number;
  productCount: number;
  orderCount: number;
  orderAmount: number;
  pendingRecharges: number;
  pendingWithdraws: number;
}
