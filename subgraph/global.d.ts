// Global type declarations for AssemblyScript/The Graph environment
// This file provides type definitions for global functions not included in @graphprotocol/graph-ts

/**
 * AssemblyScript global assert function
 * 
 * 🎯 功能说明：
 * - AssemblyScript 内置的断言函数
 * - 用于运行时条件检查和调试
 * - 如果条件为 false，会抛出错误并停止执行
 * 
 * 📝 使用场景：
 * - 验证数据完整性（如实体ID不能为空）
 * - 类型安全检查（如确保数据类型正确）
 * - 调试和开发阶段的条件验证
 * 
 * ⚠️ 注意事项：
 * - 在生产环境中可能影响性能
 * - 应该用于关键的数据验证，而不是常规的业务逻辑
 * - 失败时会终止合约执行
 * 
 * @param condition 要检查的条件表达式
 * @param message 断言失败时显示的错误信息
 */
declare function assert(condition: boolean, message?: string): void;

/**
 * AssemblyScript 环境相关的全局声明
 * 确保类型检查器能够正确识别 AssemblyScript 特定的全局函数和变量
 */
declare global {
  /**
   * 内存管理相关的全局函数（AssemblyScript 特有）
   */
  type i32 = number;
  type f64 = number;
  function memory_size(): i32;
  function memory_grow(pages: i32): i32;
}

export {}; // 确保此文件被视为模块