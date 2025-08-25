/**
 * 交易查询 Hooks 集合 - 封装 GraphQL 查询逻辑
 * 
 * 🎯 文件功能：
 * - 提供统一的 GraphQL 查询接口
 * - 封装 The Graph 数据查询逻辑
 * - 定义数据类型和接口
 * - 简化组件中的数据获取操作
 * 
 * 🔧 技术要点：
 * - 使用 Apollo Client 进行 GraphQL 查询
 * - TypeScript 类型安全
 * - 自定义 React Hooks 模式
 * - 查询缓存和优化
 */

import { useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';

// ==================== 类型定义 ====================

/**
 * 账户信息接口
 * 对应 The Graph Schema 中的 Account 实体
 */
interface Account {
  address: string;  // 以太坊地址
}

/**
 * 区块信息接口  
 * 对应区块链中的区块数据
 */
interface Block {
  hash: string;    // 区块哈希
  number: string;  // 区块号
}

/**
 * 交易信息接口
 * 对应 The Graph Schema 中的 Transaction 实体
 * 
 * 📊 字段说明：
 * - id: 唯一标识符（通常是交易哈希）
 * - hash: 交易哈希值
 * - from: 发送方账户信息
 * - to: 接收方账户信息（可选，合约创建时为空）
 * - value: 转账金额（wei 单位）
 * - gasUsed: 实际消耗的 Gas
 * - gasPrice: Gas 价格
 * - blockNumber: 所在区块号
 * - timestamp: 交易时间戳
 * - status: 交易状态（1=成功，0=失败）
 * - transactionIndex: 在区块中的索引位置
 */
interface Transaction {
  id: string;
  hash: string;
  from: Account;
  to?: Account;           // 可选，合约创建交易没有 to 地址
  value: string;
  gasUsed: string;
  gasPrice: string;
  blockNumber: string;
  block: Block;
  timestamp: string;
  status: string;
  transactionIndex: string;
}

/**
 * 单个转账记录查询结果接口
 */
interface TransactionData {
  transferRecords: Transaction[];
}

/**
 * 多个转账记录查询结果接口
 */
interface TransactionsData {
  transferRecords: Transaction[];
}

// BlockData 接口已被移除，因为 Schema 中没有定义 Block 实体
// /**
//  * 区块数据接口
//  * 用于显示区块基本信息
//  */
// interface BlockData {
//   id: string;              // 区块哈希作为 ID
//   number: string;          // 区块号
//   hash: string;            // 区块哈希
//   timestamp: string;       // 区块时间戳
//   gasUsed: string;         // 区块 Gas 使用量
//   gasLimit: string;        // 区块 Gas 限制
//   transactionCount: string; // 区块包含的交易数量
// }

/**
 * 多个区块查询结果接口
 */
// BlocksData 接口已被移除，因为 Schema 中没有定义 Block 实体
// interface BlocksData {
//   blocks: BlockData[];
// }

/**
 * The Graph 元数据接口
 * 用于获取同步状态信息
 */
interface MetaData {
  _meta: {
    block: {
      number: string;  // 当前同步到的区块号
    };
  };
}

// ==================== GraphQL 查询定义 ====================

/**
 * 单个交易查询
 * 
 * 🔍 查询功能：
 * - 根据交易哈希获取完整的交易信息
 * - 包含发送方和接收方账户信息
 * - 包含所在区块的基本信息
 * 
 * 📝 参数：
 * - $hash: 交易哈希（Bytes! 类型，必须）
 */
export const GET_TRANSACTION = gql`
  query GetTransaction($hash: Bytes!) {
    transferRecords(where: { transactionHash: $hash }) {
      id
      recordId
      from {
        address
      }
      to {
        address
      }
      value
      message
      timestamp
      blockNumber
      transactionHash
    }
  }
`;

/**
 * 多个交易查询
 * 
 * 🔍 查询功能：
 * - 获取交易列表，支持分页
 * - 支持排序（按区块号、时间戳等）
 * - 支持自定义数量限制
 * 
 * 📝 参数：
 * - $first: 返回记录数量（默认 10）
 * - $skip: 跳过记录数量（默认 0，用于分页）
 * - $orderBy: 排序字段（默认 "blockNumber"）
 * - $orderDirection: 排序方向（默认 "desc" 降序）
 */
export const GET_TRANSACTIONS = gql`
  query GetTransactions($first: Int = 10, $skip: Int = 0, $orderBy: String = "blockNumber", $orderDirection: String = "desc") {
    transferRecords(first: $first, skip: $skip, orderBy: $orderBy, orderDirection: $orderDirection) {
      id
      recordId
      from {
        address
      }
      to {
        address
      }
      value
      message
      timestamp
      blockNumber
      transactionHash
    }
  }
`;

/**
 * 区块信息查询
 * 
 * 🔍 查询功能：
 * - 获取最近的区块列表
 * - 按区块号降序排序（最新的在前面）
 * - 支持分页功能
 * 
 * 📝 参数：
 * - $first: 返回区块数量（默认 10）
 * - $skip: 跳过区块数量（默认 0）
 */
// 注意：GET_BLOCKS 查询已被移除，因为 Subgraph Schema 中没有定义 Block 实体
// export const GET_BLOCKS = gql`
//   query GetBlocks($first: Int = 10, $skip: Int = 0) {
//     blocks(first: $first, skip: $skip, orderBy: number, orderDirection: desc) {
//       id
//       number
//       hash
//       timestamp
//       gasUsed
//       gasLimit
//       transactionCount
//     }
//   }
// `;

/**
 * The Graph 同步状态查询
 * 
 * 🔍 查询功能：
 * - 获取 The Graph 当前同步到的区块号
 * - 用于显示同步进度
 * - 判断数据的新鲜度
 * 
 * 💡 _meta 字段说明：
 * - 这是 The Graph 提供的特殊查询字段
 * - 包含 Subgraph 的元数据信息
 * - block.number 表示已同步到的最新区块号
 */
export const GET_META = gql`
  query GetMeta {
    _meta {
      block {
        number
      }
    }
  }
`;

// ==================== 自定义 Hooks ====================

/**
 * 单个交易查询 Hook
 * 
 * 🎯 使用场景：
 * - 根据交易哈希查询具体交易信息
 * - 用于交易详情页面
 * - 验证交易是否存在
 * 
 * 📝 参数：
 * - hash: 交易哈希字符串
 * 
 * 🔄 返回值：
 * - data: 交易数据（TransactionData 类型）
 * - loading: 加载状态
 * - error: 错误信息
 * 
 * 💡 优化特性：
 * - skip: !hash - 只有当 hash 存在时才执行查询
 * - 避免无效的查询请求
 */
export const useTransactionQuery = (hash: string) => {
  return useQuery<TransactionData>(GET_TRANSACTION, {
    variables: { hash },
    skip: !hash,  // 优化：没有 hash 时跳过查询
  });
};

/**
 * 多个交易查询 Hook
 * 
 * 🎯 使用场景：
 * - 交易列表页面
 * - 最新交易展示
 * - 分页浏览交易记录
 * 
 * 📝 参数：
 * - first: 查询记录数量（默认 10）
 * - skip: 跳过记录数量（默认 0，用于分页）
 * - enabled: 是否启用查询（默认 true）
 * 
 * 🔄 返回值：
 * - data: 交易列表数据（TransactionsData 类型）
 * - loading: 加载状态
 * - error: 错误信息
 */
export const useTransactionsQuery = (first: number = 10, skip: number = 0, enabled: boolean = true) => {
  return useQuery<TransactionsData>(GET_TRANSACTIONS, {
    variables: { first, skip },
    skip: !enabled,  // 条件查询：可通过 enabled 控制是否执行
  });
};

/**
 * 区块信息查询 Hook
 * 
 * 🎯 使用场景：
 * - 显示最新区块信息
 * - 区块浏览功能
 * - 网络状态监控
 * 
 * 📝 参数：
 * - first: 查询区块数量（默认 10）
 * - skip: 跳过区块数量（默认 0）
 * - enabled: 是否启用查询（默认 true）
 * 
 * 🔄 返回值：
 * - data: 区块列表数据（BlocksData 类型）
 * - loading: 加载状态
 * - error: 错误信息
 */
// 注意：useBlocksQuery 已被移除，因为 Subgraph Schema 中没有定义 Block 实体
// export const useBlocksQuery = (first: number = 10, skip: number = 0, enabled: boolean = true) => {
//   return useQuery<BlocksData>(GET_BLOCKS, {
//     variables: { first, skip },
//     skip: !enabled,
//   });
// };

/**
 * The Graph 同步状态查询 Hook
 * 
 * 🎯 使用场景：
 * - 显示 The Graph 同步进度
 * - 判断数据延迟情况
 * - 提醒用户数据的新鲜度
 * 
 * 📝 参数：
 * - enabled: 是否启用查询（默认 true）
 * 
 * 🔄 返回值：
 * - data: 元数据信息（MetaData 类型）
 * - loading: 加载状态
 * - error: 错误信息
 * 
 * 💡 特殊功能：
 * - pollInterval: 30000 - 每 30 秒自动重新查询一次
 * - 实时监控同步状态变化
 * - 只有当 enabled 为 true 时才轮询
 */
export const useMetaQuery = (enabled: boolean = true) => {
  return useQuery<MetaData>(GET_META, {
    pollInterval: enabled ? 30000 : undefined, // 每 30 秒轮询一次
    skip: !enabled,
  });
};