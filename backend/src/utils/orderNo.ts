/**
 * 生成订单号
 * 格式：ORD + yyyyMMddHHmmss + 3位随机数
 * 例如：ORD20261231999
 */

export function generateOrderNo(): string {
  const now = new Date();
  // pad 函数用于时间、日期的个位数补零
  const pad = (num: number, len = 2) => String(num).padStart(len, "0");

  const date =
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds());

  const rand = pad(Math.floor(Math.random() * 1000), 3);

  return `ORD${date}${rand}`;
}

/**
 * 生成补差订单号：主订单号+ -S1
 * 需要根据已有子订单数量决定编号
 */

export function generateSupplementOrderNo(
  mainOrderNo: string,
  seq: number,
): string {
  return `${mainOrderNo} -S${seq}`;
}
