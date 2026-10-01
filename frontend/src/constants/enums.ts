// 集中管理枚举的展示映射，避免视图层硬编码中文

import type {
  OrderStatus,
  OrderType,
  ProductStatus,
  RechargeStatus,
  WithdrawStatus,
  WithdrawChannel,
  NoticeStatus,
  Role,
} from "@/types";

// 1.======订单状态======
export const Order_Status_Map: Record<
  OrderStatus,
  { label: string; type: string }
> = {
  PENDING: { label: "待支付", type: "warning" },
  PAID: { label: "已支付", type: "success" },
  CANCELLED: { label: "已取消", type: "info" },
  DONE: { label: "已完成", type: "primary" },
};

// 2.======订单类型======
export const ORDER_TYPE_MAP: Record<
  OrderType,
  { label: string; type: string }
> = {
  NORMAL: { label: "普通订单", type: "primary" },
  SUPPLEMENT: { label: "补差订单", type: "warning" },
  REFUND: { label: "退款订单", type: "danger" },
};

// 3.======商品状态======
export const PRODUCT_STATUS_MAP: Record<
  ProductStatus,
  { label: string; type: string }
> = {
  ON: { label: "上架", type: "success" },
  OFF: { label: "下架", type: "info" },
};

// 4.======充值状态======
export const RECHARGE_STATUS_MAP: Record<
  RechargeStatus,
  { label: string; type: string }
> = {
  PENDING: { label: "待审批", type: "warning" },
  APPROVED: { label: "已通过", type: "success" },
  REJECTED: { label: "已拒绝", type: "danger" },
};

// 5.======提现状态======
export const WITHDRAW_STATUS_MAP: Record<
  WithdrawStatus,
  { label: string; type: string }
> = {
  PENDING: { label: "待审批", type: "warning" },
  APPROVED: { label: "已通过", type: "success" },
  REJECTED: { label: "已拒绝", type: "danger" },
};

// 6.======提现渠道======
export const WITHDRAW_CHANNEL_MAP: Record<WithdrawChannel, string> = {
  BANK: "银行卡",
  ALIPAY: "支付宝",
  WECHAT: "微信",
  OTHER: "其他",
};

// 7.======公告状态======
export const NOTICE_STATUS_MAP: Record<
  NoticeStatus,
  { label: string; type: string }
> = {
  DRAFT: { label: "草稿", type: "info" },
  PUBLISHED: { label: "已发布", type: "success" },
  ARCHIVED: { label: "已归档", type: "warning" },
};

// ============ 角色 ============
export const ROLE_MAP: Record<Role, string> = {
  USER: "普通用户",
  ADMIN: "管理员",
};
