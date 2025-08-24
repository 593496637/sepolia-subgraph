/**
 * Wagmi 配置文件 - Web3 钱包连接和区块链交互配置
 * 
 * 🌐 Wagmi 是什么？
 * Wagmi 是一个现代化的 React Hooks 库，专门用于以太坊应用开发
 * - 提供钱包连接管理
 * - 简化智能合约交互
 * - 统一的 React Hooks API
 * - TypeScript 类型安全
 * 
 * 🔗 主要功能：
 * - 钱包连接：支持 MetaMask, WalletConnect 等主流钱包
 * - 账户管理：自动处理账户状态变化
 * - 交易发送：简化以太坊交易流程
 * - 合约调用：类型安全的智能合约交互
 * - 余额查询：实时获取账户余额
 */

import { createConfig, http } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { injected, metaMask } from 'wagmi/connectors'

/**
 * 创建 Wagmi 配置实例
 * 
 * 🏗️ 配置说明：
 * - chains: 支持的区块链网络列表
 * - connectors: 支持的钱包连接器
 * - transports: RPC 传输配置
 */
export const wagmiConfig = createConfig({
  /**
   * 支持的区块链网络
   * 
   * 📍 当前配置：只支持 Sepolia 测试网
   * - 为什么选择 Sepolia？
   *   * 免费测试 ETH
   *   * 稳定的测试环境
   *   * 接近主网的行为
   *   * 广泛的生态支持
   */
  chains: [sepolia],
  
  /**
   * 钱包连接器配置
   * 
   * 🔌 支持的连接方式：
   * 
   * 1. injected() - 注入式钱包连接器
   *    - 检测浏览器中已安装的钱包
   *    - 支持 MetaMask, Coinbase Wallet, Trust Wallet 等
   *    - 自动适配不同钱包的 API
   * 
   * 2. metaMask() - 专用 MetaMask 连接器
   *    - 专门优化的 MetaMask 支持
   *    - 更好的用户体验和错误处理
   *    - 支持 MetaMask 的高级特性
   * 
   * 💡 注意：WalletConnect 需要项目 ID
   * 如果需要支持移动端钱包，可以添加：
   * walletConnect({ projectId: 'your-project-id' })
   */
  connectors: [
    injected(),  // 通用注入式钱包连接器
    metaMask(),  // 专用 MetaMask 连接器
  ],
  
  /**
   * RPC 传输配置 - 连接到区块链网络的方式
   * 
   * 🌐 传输层说明：
   * - 使用 HTTP 传输协议
   * - 连接到 Sepolia 测试网的公共 RPC 节点
   * - 自动处理请求重试和错误恢复
   * 
   * 📡 RPC 节点选择：
   * - ethereum-sepolia-rpc.publicnode.com
   *   * 免费公共节点
   *   * 无需注册或 API Key
   *   * 较好的稳定性和速度
   * 
   * 💡 生产环境建议：
   * 使用付费 RPC 服务如 Infura, Alchemy 等
   * 提供更好的性能和可靠性
   */
  transports: {
    [sepolia.id]: http('https://ethereum-sepolia-rpc.publicnode.com'),
  },
})

/**
 * 导出 Sepolia 链 ID
 * 
 * 🔢 链 ID 说明：
 * - Sepolia 测试网的链 ID 是 11155111
 * - 用于区分不同的以太坊网络
 * - 防止跨链重放攻击
 * 
 * 💡 常用链 ID：
 * - 主网: 1
 * - Goerli: 5 (已弃用)
 * - Sepolia: 11155111 (当前主要测试网)
 * - Polygon: 137
 * - BSC: 56
 */
export const SEPOLIA_CHAIN_ID = sepolia.id;