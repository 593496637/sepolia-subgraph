/**
 * The Graph Subgraph 映射文件 - 智能合约事件处理逻辑
 * 
 * 🎯 核心功能：
 * - 监听智能合约事件并转换为图数据
 * - 维护账户和转账记录的关系数据
 * - 提供高效的 GraphQL 查询接口
 * - 支持复杂的数据关联和聚合查询
 * 
 * 📊 数据模型：
 * - Account: 以太坊账户实体
 * - TransferRecord: 转账记录实体
 * - 一对多关系：一个账户可以有多个转账记录
 * 
 * 🔧 技术特点：
 * - AssemblyScript 语言编写（类似 TypeScript）
 * - 事件驱动的数据处理模式
 * - 自动数据持久化和索引
 * - 实时数据同步和更新
 * 
 * 💡 工作流程：
 * 1. 智能合约触发 TransferRecord 事件
 * 2. The Graph 节点检测到事件
 * 3. 调用对应的处理函数
 * 4. 更新图数据库
 * 5. GraphQL API 实时可查
 */

// The Graph TypeScript SDK 核心模块
import { 
  BigInt,      // 大整数类型，用于处理区块链数值
  log,         // 日志工具，用于调试和监控
  Address,     // 以太坊地址类型
  Bytes        // 字节数组类型
} from "@graphprotocol/graph-ts"

// 以太坊相关类型（暂未使用但保留备用）
import { ethereum } from "@graphprotocol/graph-ts"

// 从生成的 schema 文件导入实体类型
// 这些类型是根据 schema.graphql 自动生成的
import {
  Account,        // 账户实体：代表以太坊地址
  TransferRecord, // 转账记录实体：代表一次转账操作
} from "../generated/schema"

// 从生成的合约 ABI 导入事件类型
// 这些类型是根据智能合约 ABI 自动生成的
import {
  TransferRecord as TransferRecordEvent  // 智能合约的 TransferRecord 事件类型
} from "../generated/SimpleTransferContract/SimpleTransferContract"

// ==================== 工具函数 ====================

/**
 * 获取或创建账户实体的辅助函数
 * 
 * 🎯 功能目的：
 * - 实现账户实体的单例模式
 * - 确保每个地址只有一个对应的 Account 实体
 * - 自动初始化新账户的默认属性
 * - 维护数据一致性
 * 
 * 📊 数据处理流程：
 * 1. 尝试从图数据库加载现有账户
 * 2. 如果账户不存在，创建新账户实体
 * 3. 设置账户的基本属性
 * 4. 保存到图数据库
 * 5. 返回账户实体供后续使用
 * 
 * 🔧 技术实现：
 * - 使用 Account.load() 进行实体查找
 * - 使用构造函数 new Account() 创建新实体
 * - 使用 .save() 持久化到数据库
 * - 类型断言确保返回正确类型
 * 
 * 💡 设计模式：
 * - 单例模式：确保每个地址只有一个账户实体
 * - 懒加载：只在需要时创建账户
 * - 原子操作：创建和初始化在同一个函数中完成
 * 
 * 📝 参数说明：
 * @param address - 以太坊地址字符串（hex 格式）
 * @returns Account 实体对象
 * 
 * ⚡ 性能考虑：
 * - 频繁调用的函数，需要高效的数据库操作
 * - load() 操作有缓存机制，重复查询性能较好
 * - 新建账户时才执行 save() 操作
 */
function getOrCreateAccount(address: string): Account {
  // 尝试从数据库加载现有账户
  let account = Account.load(address);
  
  // 如果账户不存在，创建新账户
  if (account === null) {
    log.info("Creating new account for address {}", [address]);
    
    account = new Account(address);                   // 创建新实体，ID 为地址
    account.address = Address.fromString(address);    // 设置地址字段
    account.recordCount = BigInt.fromI32(0);          // 初始化转账记录计数
    account.save();                                   // 持久化到数据库
  }
  
  return account;  // 类型系统已经确保正确类型
}

// ==================== 事件处理函数 ====================

/**
 * 处理智能合约的 TransferRecord 事件
 * 
 * 🎯 核心功能：
 * - 监听智能合约发出的转账记录事件
 * - 将区块链事件数据转换为图数据结构
 * - 维护账户间的转账关系
 * - 更新相关实体的统计信息
 * 
 * 📊 数据处理流程：
 * 1. 记录事件处理开始的日志
 * 2. 获取或创建发送方账户实体
 * 3. 获取或创建接收方账户实体
 * 4. 创建新的转账记录实体
 * 5. 设置转账记录的所有属性
 * 6. 更新发送方的统计数据
 * 7. 保存所有更改到数据库
 * 8. 记录事件处理完成的日志
 * 
 * 🔗 关系建立：
 * - TransferRecord.from → Account (多对一)
 * - TransferRecord.to → Account (多对一)
 * - 一个账户可以参与多次转账
 * - 支持 GraphQL 的关联查询
 * 
 * 🆔 唯一标识生成：
 * - 使用 "交易哈希-日志索引" 作为转账记录ID
 * - 确保每个事件对应唯一的数据库记录
 * - 避免重复处理相同事件
 * 
 * 📈 统计信息维护：
 * - 更新发送方账户的转账次数计数
 * - 为后续的分析查询提供聚合数据
 * - 支持按账户查询转账历史
 * 
 * 🔍 日志记录：
 * - 处理开始：记录事件基本信息
 * - 处理完成：记录转账记录ID
 * - 便于调试和监控处理状态
 * 
 * 📝 事件参数说明：
 * @param event - 智能合约触发的 TransferRecord 事件
 * @param event.params.recordId - 转账记录的唯一标识
 * @param event.params.from - 发送方地址
 * @param event.params.to - 接收方地址
 * @param event.params.value - 转账金额 (Wei)
 * @param event.params.message - 转账备注信息
 * @param event.params.timestamp - 转账时间戳
 * @param event.block.number - 事件所在区块号
 * @param event.transaction.hash - 事件所在交易哈希
 * @param event.logIndex - 事件在交易中的日志索引
 * 
 * ⚡ 性能优化：
 * - 使用 getOrCreateAccount() 避免重复创建账户
 * - 批量更新减少数据库写入次数
 * - 日志记录帮助监控处理性能
 * 
 * 🌐 GraphQL 查询支持：
 * 处理后的数据支持以下查询模式：
 * - 按账户查询所有转账记录
 * - 按时间范围查询转账记录
 * - 按金额范围查询转账记录
 * - 关联查询发送方和接收方信息
 */
export function handleTransferRecord(event: TransferRecordEvent): void {
  // 记录事件处理开始，便于调试和监控
  log.info("Processing TransferRecord event from {} to {} with value {}", [
    event.params.from.toHexString(),  // 发送方地址
    event.params.to.toHexString(),    // 接收方地址
    event.params.value.toString()     // 转账金额
  ]);

  // 获取地址字符串（避免重复计算）
  const fromAddress = event.params.from.toHexString();
  const toAddress = event.params.to.toHexString();

  // 获取或创建发送方账户实体
  let fromAccount = getOrCreateAccount(fromAddress);
  // 更新发送方的转账记录计数（统计信息）
  fromAccount.recordCount = fromAccount.recordCount.plus(BigInt.fromI32(1));
  fromAccount.save();  // 保存发送方账户的更新

  // 获取或创建接收方账户实体
  let toAccount = getOrCreateAccount(toAddress);
  // 注意：这里没有更新接收方的计数，只统计主动发送的次数

  // 创建转账记录实体
  // ID 格式："交易哈希-日志索引"，确保唯一性
  const transferRecordId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let transferRecord = new TransferRecord(transferRecordId);
  
  // 设置转账记录的所有属性
  transferRecord.recordId = event.params.recordId;           // 智能合约中的记录ID
  transferRecord.from = fromAccount.id;                      // 关联到发送方账户
  transferRecord.to = toAccount.id;                          // 关联到接收方账户
  transferRecord.value = event.params.value;                 // 转账金额
  transferRecord.message = event.params.message;             // 转账备注
  transferRecord.timestamp = event.params.timestamp;         // 转账时间戳
  transferRecord.blockNumber = event.block.number;           // 区块号
  transferRecord.transactionHash = event.transaction.hash;   // 交易哈希

  // 保存转账记录到数据库
  transferRecord.save();

  // 记录事件处理完成，输出转账记录ID便于追踪
  log.info("Successfully processed TransferRecord with ID {} at block {}", [
    transferRecord.recordId.toHexString(),
    event.block.number.toString()
  ]);
}