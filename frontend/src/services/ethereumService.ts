import { ethers } from 'ethers';

/**
 * 以太坊服务类 - 提供与 Sepolia 测试网络直接交互的功能
 * 
 * 🌐 核心功能：
 * - 多 RPC 节点支持，提供故障转移机制
 * - 交易查询和地址历史记录获取  
 * - 区块信息查询
 * - 与 The Graph 形成数据对比
 * 
 * 💡 为什么需要直接 RPC 查询？
 * - 实时数据：获取最新的区块链状态，无需等待索引
 * - 完整性：访问所有区块链数据，不受索引限制
 * - 对比验证：与 The Graph 索引数据进行对比验证
 * - 备用方案：当 The Graph 服务不可用时的备选方案
 */

// Sepolia 测试网 RPC 端点配置 - 多节点确保高可用性
const SEPOLIA_RPC_URLS = [
  'https://ethereum-sepolia-rpc.publicnode.com',  // 公共节点 - 无需 API Key，速度较快
  'https://rpc.sepolia.org',                      // Sepolia 官方 RPC 节点
  'https://ethereum-sepolia.publicnode.com',      // 另一个公共节点备选
  'https://sepolia.gateway.tenderly.co'           // Tenderly 网关，稳定性好
];

/**
 * 以太坊服务主类
 * 
 * 🏗️ 设计模式：
 * - 故障转移模式（Failover Pattern）：自动切换到可用的 RPC 节点
 * - 超时控制：防止长时间等待无响应节点
 * - 提供商轮询：记住成功的提供商，提高后续请求效率
 */
export class EthereumService {
  // RPC 提供商数组 - ethers.js 的 JsonRpcProvider 实例
  private providers: ethers.JsonRpcProvider[];
  
  // 当前使用的提供商索引 - 优化后续请求性能
  private currentProviderIndex: number = 0;

  constructor() {
    /**
     * 初始化多个 RPC 提供商
     * 每个 URL 创建一个 ethers.JsonRpcProvider 实例
     */
    this.providers = SEPOLIA_RPC_URLS.map(url => new ethers.JsonRpcProvider(url));
  }

  /**
   * 故障转移核心方法 - 尝试所有 RPC 提供商直到成功
   * 
   * @param operation - 要执行的操作函数，接收一个 provider 参数
   * @returns Promise<T> - 操作结果
   * 
   * 🔄 工作流程：
   * 1. 从当前成功的提供商开始尝试
   * 2. 每个请求设置 10 秒超时
   * 3. 失败时自动切换到下一个提供商
   * 4. 成功时记住该提供商，提高后续效率
   * 5. 所有提供商都失败时抛出错误
   */
  private async tryProviders<T>(operation: (provider: ethers.JsonRpcProvider) => Promise<T>): Promise<T> {
    let lastError: Error | null = null;
    
    // 循环尝试所有提供商
    for (let i = 0; i < this.providers.length; i++) {
      // 计算当前应该尝试的提供商索引（从上次成功的开始）
      const providerIndex = (this.currentProviderIndex + i) % this.providers.length;
      const provider = this.providers[providerIndex];
      
      try {
        // 使用 Promise.race 实现超时控制
        const result = await Promise.race([
          operation(provider),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 10000) // 10秒超时
          )
        ]);
        
        // 成功时记住这个提供商
        this.currentProviderIndex = providerIndex;
        return result;
      } catch (error) {
        console.warn(`RPC 提供商 ${SEPOLIA_RPC_URLS[providerIndex]} 请求失败:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }
    
    // 所有提供商都失败时抛出错误
    throw new Error(`所有 RPC 提供商都无法访问。最后一个错误: ${lastError?.message || '未知错误'}`);
  }

  /**
   * 根据交易哈希获取交易详情
   * 
   * @param txHash - 交易哈希值（0x开头的64位十六进制字符串）
   * @returns 交易详情对象或 null
   * 
   * 📊 返回数据包含：
   * - 基本信息：hash, from, to, value
   * - Gas 信息：gasUsed, gasPrice
   * - 区块信息：blockNumber, timestamp
   * - 执行状态：status (1=成功, 0=失败)
   * 
   * 🔍 查询步骤：
   * 1. getTransaction() - 获取交易基本信息
   * 2. getTransactionReceipt() - 获取交易执行结果
   * 3. getBlock() - 获取区块时间戳等信息
   */
  async getTransactionByHash(txHash: string) {
    return this.tryProviders(async (provider) => {
      // 第1步：获取交易基本信息
      const tx = await provider.getTransaction(txHash);
      if (!tx) return null;

      // 第2步：获取交易收据（包含执行结果）
      const receipt = await provider.getTransactionReceipt(txHash);
      if (!receipt) return null;

      // 第3步：获取区块信息（主要是时间戳）
      const block = await provider.getBlock(tx.blockNumber!);
      if (!block) return null;

      // 返回标准化的交易对象（与 The Graph 数据格式兼容）
      return {
        id: txHash,
        hash: txHash,
        from: {
          address: tx.from    // 交易发送方地址
        },
        to: tx.to ? {
          address: tx.to      // 交易接收方地址（可能为空，如合约创建）
        } : null,
        value: tx.value.toString(),              // 转账金额（wei 单位）
        gasUsed: receipt.gasUsed.toString(),     // 实际消耗的 Gas
        gasPrice: tx.gasPrice ? tx.gasPrice.toString() : '0',  // Gas 价格
        blockNumber: tx.blockNumber!.toString(), // 所在区块号
        block: {
          hash: block.hash!,
          number: block.number.toString()
        },
        timestamp: block.timestamp.toString(),   // 区块时间戳（Unix 时间）
        status: receipt.status ? '1' : '0',      // 交易状态：1=成功，0=失败
        transactionIndex: tx.index!.toString(),  // 在区块中的交易索引
        data: tx.data || '0x'                   // 交易数据（可能包含附言信息）
      };
    });
  }

  /**
   * 获取特定地址的交易历史
   * 
   * @param address - 以太坊地址（0x开头的40位十六进制）
   * @param limit - 返回交易数量限制（默认20条）
   * @returns 交易数组
   * 
   * ⚠️  性能限制说明：
   * - 只搜索最近1000个区块
   * - 这是因为全链搜索会非常慢且消耗大量资源
   * - 实际项目中通常使用索引服务（如 The Graph）来解决此问题
   * 
   * 🔍 搜索策略：
   * 1. 从最新区块向前搜索1000个区块
   * 2. 检查每个区块中的所有交易
   * 3. 匹配发送方或接收方地址
   * 4. 达到限制数量时停止搜索
   */
  async getTransactionsByAddress(address: string, limit: number = 20) {
    return this.tryProviders(async (provider) => {
      // 获取最新区块号
      const latestBlockNumber = await provider.getBlockNumber();
      const transactions = [];
      
      // 设置搜索范围：最近1000个区块（平衡性能和数据完整性）
      const blocksToSearch = Math.min(1000, latestBlockNumber);
      const startBlock = Math.max(0, latestBlockNumber - blocksToSearch);
      
      console.log(`正在搜索地址 ${address} 的交易记录，区块范围: ${startBlock} 至 ${latestBlockNumber}`);

      // 从最新区块开始向前搜索
      for (let blockNumber = latestBlockNumber; blockNumber >= startBlock && transactions.length < limit; blockNumber--) {
        try {
          // 获取区块及其所有交易（第二个参数为true表示包含交易详情）
          const block = await provider.getBlock(blockNumber, true);
          if (!block?.transactions) continue;

          // 遍历区块中的所有交易
          for (const tx of block.transactions) {
            // 检查是否为目标地址的交易（发送方或接收方）
            if (typeof tx !== 'string') {
              const transaction = tx as ethers.TransactionResponse;
              if (transaction.from === address || transaction.to === address) {
                // 获取交易收据（执行结果）
                const receipt = await provider.getTransactionReceipt(transaction.hash);
                if (receipt) {
                  // 构造标准化交易对象
                  transactions.push({
                    id: transaction.hash,
                    hash: transaction.hash,
                    from: {
                      address: transaction.from
                    },
                    to: transaction.to ? {
                      address: transaction.to
                    } : null,
                    value: transaction.value.toString(),
                    gasUsed: receipt.gasUsed.toString(),
                    gasPrice: transaction.gasPrice ? transaction.gasPrice.toString() : '0',
                    blockNumber: blockNumber.toString(),
                    timestamp: block.timestamp.toString(),
                    status: receipt.status ? '1' : '0',
                    transactionIndex: transaction.index.toString(),
                    data: transaction.data || '0x'  // 添加交易数据字段
                  });

                  // 达到限制数量时退出循环
                  if (transactions.length >= limit) break;
                }
              }
            }
          }
        } catch (blockError) {
          console.warn(`处理区块 ${blockNumber} 时出错:`, blockError);
          continue; // 忽略单个区块的错误，继续处理其他区块
        }
      }

      return transactions;
    });
  }

  /**
   * 获取当前最新区块号
   * 
   * @returns 最新区块号
   * 
   * 💡 用途：
   * - 检查网络同步状态
   * - 作为其他查询的参考点
   * - 监控区块链增长情况
   */
  async getCurrentBlockNumber() {
    return this.tryProviders(async (provider) => {
      return await provider.getBlockNumber();
    });
  }

  /**
   * 根据区块号获取区块信息
   * 
   * @param blockNumber - 区块号
   * @returns 区块信息对象或 null
   * 
   * 📊 返回区块信息：
   * - id: 区块哈希
   * - number: 区块号
   * - hash: 区块哈希
   * - timestamp: 区块时间戳
   * - gasUsed: 实际使用的 Gas
   * - gasLimit: Gas 限制
   * - transactionCount: 区块中包含的交易数量
   */
  async getBlockByNumber(blockNumber: number) {
    return this.tryProviders(async (provider) => {
      const block = await provider.getBlock(blockNumber);
      if (!block) return null;

      return {
        id: block.hash!,
        number: block.number.toString(),
        hash: block.hash!,
        timestamp: block.timestamp.toString(),
        gasUsed: block.gasUsed.toString(),
        gasLimit: block.gasLimit.toString(),
        transactionCount: block.transactions.length.toString()
      };
    });
  }
}

/**
 * 导出服务实例 - 单例模式
 * 
 * 💡 为什么使用单例？
 * - 避免重复创建多个服务实例
 * - 保持提供商状态（currentProviderIndex）
 * - 简化在其他组件中的使用
 */
export const ethereumService = new EthereumService();