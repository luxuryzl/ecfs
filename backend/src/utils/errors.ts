/**
 * 这段代码定义了一个‌自定义错误类 AppError‌，专门用来在业务逻辑中抛出带有“状态码statusCode”和“错误码code”的异常，方便上层统一处理
 * 继承 Error，所以它天生就是一个“错误”，可以被 throw 抛出，也能用 instanceof AppError 判断类型
 *
 * 这段代码的核心价值在于：‌让错误携带结构化信息‌。比如在 API 层抛出 throw new AppError(404, '用户不存在', 'USER_NOT_FOUND')，
 * 上层就能根据 statusCode 返回对应的 HTTP 状态码，根据 code 做程序化处理，而不需要去解析错误消息字符串。‌‌
 */
export class AppError extends Error {
  constructor(
    public statusCode: number, //参数属性‌，TypeScript 会自动声明并赋值
    message: string, //普通参数，只作为错误描述传入父类 super(message)，不会成为实例属性
    public code?: string, //可选参数，用于保存机器可读的错误码（比如 "NOT_FOUND"）
  ) {
    super(message); //调用父类 Error 的构造函数，把 message 传给内置的错误消息机制，这样 error.message 就能正常使用
    this.name = "AppError"; //设置错误名称，覆盖默认的 "Error"，这样在日志或调试时能一眼看出错误类型
  }
}

// 阻止类错误
export class ForbiddenError extends AppError {
  constructor(message: "无权限访问") {
    super(403, message, "FORBIDDEN");
  }
}

// 未找到类错误
export class NotFoundError extends AppError {
  constructor(message: "资源不存在") {
    super(404, message, "NOT_FOUND");
  }
}

// 验证类错误，message由调用者定义
export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message, "VALIDATION_ERROR");
  }
}
