/**
 * 钱包转账组件 - 提供完整的钱包连接和 ETH 转账功能
 * 
 * 🔗 功能特性：
 * - 多钱包连接支持（MetaMask、Injected 钱包）
 * - 实时余额查询和显示
 * - ETH 转账功能（支持输入验证）
 * - 交易状态跟踪（提交、确认、成功/失败）
 * - 用户友好的 UI 界面
 * - 自动表单重置和错误处理
 * 
 * 🛠️ 技术栈：
 * - Wagmi: Web3 React Hooks 库
 * - Viem: 以太坊类型安全工具库
 * - React Hooks: 状态管理和副作用处理
 * 
 * 📝 使用说明：
 * - 用户首先需要连接钱包
 * - 输入有效的以太坊地址和转账金额
 * - 系统会验证余额和地址格式
 * - 发送交易并等待区块链确认
 */

import React, { useState } from 'react';
import { 
  useAccount,                    // 获取当前连接的账户信息
  useConnect,                    // 连接钱包的 Hook
  useDisconnect,                 // 断开钱包连接的 Hook
  useBalance,                    // 查询账户余额的 Hook
  useSendTransaction,            // 发送交易的 Hook
  useWaitForTransactionReceipt   // 等待交易确认的 Hook
} from 'wagmi';
import { parseEther, formatEther } from 'viem';  // Viem 工具函数：解析和格式化以太币
import type { Connector } from 'wagmi';           // Wagmi 连接器类型定义
import { str2hex, getHexByteLength } from '../utils/hexUtils'; // 附言编码工具函数

/**
 * WalletTransfer 组件属性接口
 * 
 * 📋 属性说明：
 * - onTransactionSuccess: 交易成功回调函数
 *   * 可选属性，当交易确认成功时调用
 *   * 参数为交易哈希，可用于后续查询
 *   * 典型用法：自动填充查询表单
 */
interface WalletTransferProps {
  onTransactionSuccess?: (txHash: string) => void;
}

const WalletTransfer: React.FC<WalletTransferProps> = ({ onTransactionSuccess }) => {
  // ==================== 本地状态管理 ====================
  
  /**
   * 转账目标地址状态
   * 📍 用途：存储用户输入的接收方以太坊地址
   * 💡 验证：使用正则表达式验证地址格式（0x + 40位十六进制）
   */
  const [toAddress, setToAddress] = useState<string>('');
  
  /**
   * 转账金额状态
   * 💰 用途：存储用户输入的 ETH 转账数量
   * 💡 格式：字符串类型，支持小数输入
   * ⚠️ 注意：需要使用 parseEther 转换为 Wei 单位
   */
  const [amount, setAmount] = useState<string>('');
  
  /**
   * 转账附言状态
   * 💬 用途：存储用户输入的转账附言信息
   * 🌍 支持：中文、Emoji、Unicode 字符
   * 📦 编码：使用 hexUtils 编码为交易 data 字段
   */
  const [message, setMessage] = useState<string>('');
  
  /**
   * 转账进行状态标志
   * 🔄 用途：控制转账按钮状态和防止重复提交
   * 📝 生命周期：
   *   - 发起转账时设置为 true
   *   - 交易确认或失败时重置为 false
   */
  const [isTransferring, setIsTransferring] = useState<boolean>(false);

  // ==================== Wagmi Hooks - 钱包连接管理 ====================
  
  /**
   * 账户信息 Hook
   * 
   * 🔍 返回值说明：
   * - address: 当前连接的钱包地址（0x开头的42字符串）
   * - isConnected: 钱包连接状态布尔值
   * 
   * 💡 自动更新：
   * - 钱包连接/断开时自动更新
   * - 用户切换账户时自动更新
   */
  const { address, isConnected } = useAccount();
  
  /**
   * 钱包连接 Hook
   * 
   * 🔌 功能说明：
   * - connect: 连接指定钱包的函数
   * - connectors: 可用的钱包连接器数组（MetaMask、Injected等）
   * - isPending: 连接过程中的加载状态
   * 
   * 🎯 使用场景：
   * - 展示可用钱包列表
   * - 处理用户点击连接按钮
   * - 显示连接中状态
   */
  const { connect, connectors, isPending: isConnecting } = useConnect();
  
  /**
   * 钱包断开连接 Hook
   * 
   * 🔚 功能：提供 disconnect 函数断开当前钱包连接
   * 🧹 清理：断开后会清空 address 和 isConnected 状态
   */
  const { disconnect } = useDisconnect();
  
  /**
   * 余额查询 Hook
   * 
   * 💰 功能说明：
   * - 自动查询指定地址的 ETH 余额
   * - 实时更新余额变化（交易后）
   * - 处理加载状态
   * 
   * 📊 数据结构：
   * - data.value: 余额值（BigInt 类型，Wei 单位）
   * - data.decimals: 小数位数（ETH 为 18）
   * - data.symbol: 代币符号（"ETH"）
   * 
   * ⚡ 性能优化：
   * - 只有当 address 存在时才查询
   * - 使用缓存避免重复请求
   */
  const { data: balance, isLoading: isLoadingBalance } = useBalance({
    address: address,
  });

  // ==================== Wagmi Hooks - 交易管理 ====================
  
  /**
   * 发送交易 Hook
   * 
   * 🚀 核心功能：
   * - sendTransaction: 发送交易的异步函数
   * - data (txHash): 交易哈希，交易提交后立即返回
   * - isPending: 交易提交过程中的等待状态
   * - error: 交易提交失败的错误信息
   * 
   * 📝 使用流程：
   * 1. 调用 sendTransaction({ to, value, data? })
   * 2. 用户在钱包中确认交易
   * 3. 交易提交到内存池，返回 txHash
   * 4. 此时交易还未被区块链确认
   * 
   * ⚠️ 重要概念：
   * - 交易提交 ≠ 交易确认
   * - txHash 存在不代表交易成功
   * - 需要等待区块链确认才算真正完成
   */
  const { 
    sendTransaction, 
    data: txHash, 
    isPending: isTxPending, 
    error: txError 
  } = useSendTransaction();

  /**
   * 等待交易确认 Hook
   * 
   * ⏳ 确认流程说明：
   * 1. 交易被提交到区块链网络
   * 2. 矿工将交易打包到区块中
   * 3. 区块被其他节点验证和确认
   * 4. 达到安全确认数后视为最终确认
   * 
   * 🔍 返回值解析：
   * - isLoading (isConfirming): 正在等待确认
   * - isSuccess (isConfirmed): 交易已成功确认
   * - error (receiptError): 交易执行失败的错误
   * 
   * 🎯 确认标准：
   * - Sepolia 测试网通常 1-2 个区块确认
   * - 主网建议等待 12 个区块确认
   * - 交易可能因为 Gas 不足等原因失败
   */
  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed,
    error: receiptError
  } = useWaitForTransactionReceipt({
    hash: txHash,  // 监听指定交易哈希的确认状态
  });

  // ==================== 事件处理函数 ====================
  
  /**
   * 处理钱包连接
   * 
   * 🔌 功能：触发指定连接器的钱包连接流程
   * 
   * 📝 参数：
   * - connector: Wagmi 连接器实例（MetaMask、Injected等）
   * 
   * 🔄 连接流程：
   * 1. 调用 connect 函数并传入连接器
   * 2. 钱包插件弹出连接请求
   * 3. 用户授权后建立连接
   * 4. useAccount Hook 自动更新连接状态
   */
  const handleConnect = (connector: Connector) => {
    connect({ connector });
  };

  /**
   * 处理 ETH 转账（支持附言）
   * 
   * 💸 核心转账逻辑函数
   * 
   * 🛡️ 安全检查：
   * - 验证接收地址、转账金额、发送方地址都存在
   * - 防止空值或无效参数导致的交易失败
   * 
   * 🔄 转账流程：
   * 1. 设置转账状态为进行中（禁用按钮）
   * 2. 编码附言为十六进制数据（如果有附言）
   * 3. 调用 sendTransaction 发起转账（带附言数据）
   * 4. 等待用户在钱包中确认
   * 5. 交易提交后状态管理由 useEffect 处理
   * 
   * ⚠️ 错误处理：
   * - 捕获所有可能的异常（用户拒绝、网络错误等）
   * - 失败时重置转账状态，允许重试
   * - 错误信息记录到控制台便于调试
   * 
   * 💡 类型转换说明：
   * - toAddress as `0x${string}`: 满足 Viem 的严格类型要求
   * - parseEther(amount): 将用户输入的 ETH 转换为 Wei（最小单位）
   *   * 1 ETH = 10^18 Wei
   *   * parseEther("1") = 1000000000000000000n (BigInt)
   * - str2hex(message): 将附言编码为十六进制数据
   */
  const handleTransfer = async () => {
    if (!toAddress || !amount || !address) return;

    try {
      setIsTransferring(true);
      
      // 准备交易参数
      const txParams: {
        to: `0x${string}`;
        value: bigint;
        data?: `0x${string}`;
      } = {
        to: toAddress as `0x${string}`,     // 接收方地址
        value: parseEther(amount),          // 转账金额（Wei 单位）
      };
      
      // 如果有附言，编码为交易数据
      if (message.trim()) {
        txParams.data = str2hex(message.trim()) as `0x${string}`;
      }
      
      await sendTransaction(txParams);
    } catch (error) {
      console.error('Transfer error:', error);
      setIsTransferring(false);  // 失败时重置状态
    }
  };

  // ==================== 副作用处理 ====================
  
  /**
   * 交易成功后的清理和回调处理
   * 
   * 🎯 触发条件：当交易被区块链确认时
   * 
   * 🧹 清理操作：
   * 1. 重置转账进行状态（恢复按钮可用）
   * 2. 清空表单输入（地址和金额）
   * 3. 触发成功回调（如果提供）
   * 
   * 📞 回调功能：
   * - onTransactionSuccess 是可选的回调函数
   * - 典型用途：自动填充交易查询表单
   * - 传递交易哈希供后续查询使用
   * 
   * 🔄 依赖数组：
   * - isConfirmed: 交易确认状态变化时触发
   * - txHash: 确保有有效的交易哈希
   * - onTransactionSuccess: 回调函数变化时重新绑定
   * 
   * 💡 React.useEffect 最佳实践：
   * - 只有在确实需要时才执行副作用
   * - 清理操作防止内存泄漏
   * - 依赖数组确保正确的重新执行时机
   */
  React.useEffect(() => {
    if (isConfirmed && txHash) {
      setIsTransferring(false);         // 重置转账状态
      setToAddress('');                 // 清空地址输入
      setAmount('');                    // 清空金额输入
      setMessage('');                   // 清空附言输入
      onTransactionSuccess?.(txHash);   // 触发成功回调（可选）
    }
  }, [isConfirmed, txHash, onTransactionSuccess]);

  // ==================== 工具函数 ====================
  
  /**
   * 截断以太坊地址显示
   * 
   * 🎨 UI 优化函数：将完整地址缩短为可读格式
   * 
   * 📝 格式转换：
   * - 输入: "0x1234567890123456789012345678901234567890"
   * - 输出: "0x1234...7890"
   * 
   * 💡 实现逻辑：
   * - 保留前6个字符（0x + 4位十六进制）
   * - 保留后4个字符
   * - 中间用省略号连接
   * 
   * 🎯 使用场景：
   * - 界面空间有限时显示地址
   * - 保持地址可识别性的同时节省空间
   */
  const truncateAddress = (addr: string): string => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  /**
   * 验证以太坊地址格式
   * 
   * 🔍 验证规则：
   * - 必须以 "0x" 开头
   * - 后跟40位十六进制字符 (a-f, A-F, 0-9)
   * - 总长度为42个字符
   * 
   * 📋 以太坊地址规范：
   * - 地址长度：20字节 = 160位
   * - 十六进制表示：40个字符
   * - 前缀 "0x" 表示十六进制
   * 
   * ⚠️ 注意事项：
   * - 此函数只验证格式，不验证地址是否真实存在
   * - 不验证校验和（EIP-55 混合大小写）
   * - 足够满足基本的输入验证需求
   */
  const isValidAddress = (addr: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(addr);
  };

  /**
   * 检查是否为智能合约地址
   * 
   * ⚠️ 重要提醒：
   * - 当前智能合约不支持直接接收 ETH
   * - 向合约地址发送 ETH 会导致交易失败
   * - 如需与合约交互，请使用"智能合约演示"功能
   */
  const isContractAddress = (addr: string): boolean => {
    // 检查是否为项目中的智能合约地址
    const CONTRACT_ADDRESS = '0x830B796F55E6A3f86E924297e510B24192A0Ba1c';
    return addr.toLowerCase() === CONTRACT_ADDRESS.toLowerCase();
  };

  /**
   * 验证转账金额格式
   * 
   * ✅ 验证条件：
   * 1. 必须是有效的数字格式
   * 2. 必须大于 0
   * 3. 不能是 NaN（非数字）
   * 
   * 🛡️ 错误处理：
   * - 使用 try-catch 捕获解析异常
   * - parseFloat 失败时返回 false
   * - 防止无效输入导致程序崩溃
   * 
   * 💡 支持的格式：
   * - 整数: "1", "100"
   * - 小数: "0.5", "1.234"
   * - 科学计数法: "1e-3" (parseFloat 支持)
   * 
   * ❌ 拒绝的格式：
   * - 负数: "-1"
   * - 零: "0"
   * - 空字符串: ""
   * - 非数字: "abc"
   */
  const isValidAmount = (amt: string): boolean => {
    try {
      const num = parseFloat(amt);
      return num > 0 && !isNaN(num);  // 大于0且为有效数字
    } catch {
      return false;  // 解析失败时返回 false
    }
  };

  // ==================== 业务逻辑判断 ====================
  
  /**
   * 转账可执行性检查
   * 
   * 🔐 综合安全验证：确保所有转账条件都满足
   * 
   * ✅ 必要条件列表：
   * 
   * 1. isConnected - 钱包必须已连接
   *    * 没有连接的钱包无法发起交易
   *    * 用户必须先授权钱包连接
   * 
   * 2. isValidAddress(toAddress) - 接收地址格式正确
   *    * 防止向无效地址发送资金
   *    * 避免资金永久丢失
   * 
   * 3. isValidAmount(amount) - 转账金额有效
   *    * 必须是正数且为有效数字格式
   *    * 防止无效或恶意输入
   * 
   * 4. balance - 账户余额数据已加载
   *    * 确保有余额信息进行验证
   *    * 防止在余额未知情况下转账
   * 
   * 5. 余额充足验证
   *    * parseFloat(amount) <= parseFloat(formatEther(balance.value))
   *    * 将 Wei 单位的余额转换为 ETH 进行比较
   *    * 防止余额不足导致的交易失败
   * 
   * 6. !isTxPending - 没有正在提交的交易
   *    * 防止重复提交相同交易
   *    * 避免用户疯狂点击导致的问题
   * 
   * 7. !isConfirming - 没有正在确认的交易
   *    * 一次只处理一个交易
   *    * 提供清晰的用户状态反馈
   * 
   * 8. !isTransferring - 没有本地转账状态锁定
   *    * 本地状态管理的额外保护
   *    * 防止UI状态不同步问题
   * 
   * 🎯 用途：
   * - 控制转账按钮的可点击状态
   * - 提供视觉反馈（按钮颜色、鼠标样式）
   * - 确保交易的安全性和可靠性
   */
  const canTransfer = isConnected && 
    isValidAddress(toAddress) && 
    isValidAmount(amount) && 
    balance && 
    parseFloat(amount) <= parseFloat(formatEther(balance.value)) &&
    !isTxPending && 
    !isConfirming && 
    !isTransferring;

  return (
    <div>
      <h2 style={{ 
        textAlign: 'center', 
        marginBottom: '2rem',
        color: '#333',
        fontSize: '1.8rem'
      }}>💰 钱包转账</h2>

      {/* Wallet Connection Section */}
      <div style={{
        background: isConnected ? 'linear-gradient(135deg, #28a745 0%, #20c997 100%)' : '#f8f9fa',
        color: isConnected ? 'white' : '#333',
        padding: '20px',
        borderRadius: '15px',
        marginBottom: '2rem',
        textAlign: 'center',
        border: isConnected ? 'none' : '2px solid #e9ecef'
      }}>
        {!isConnected ? (
          <div>
            <h3 style={{ margin: '0 0 15px 0' }}>🔗 连接钱包</h3>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {connectors.map((connector) => (
                <button
                  key={connector.id}
                  onClick={() => handleConnect(connector)}
                  disabled={isConnecting}
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '25px',
                    cursor: isConnecting ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    opacity: isConnecting ? 0.7 : 1,
                    transition: 'all 0.3s'
                  }}
                >
                  {isConnecting ? '连接中...' : `连接 ${connector.name}`}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <h3 style={{ margin: '0 0 10px 0' }}>✅ 钱包已连接</h3>
            <div style={{ marginBottom: '15px' }}>
              <p style={{ margin: '5px 0', fontSize: '16px', fontWeight: '600' }}>
                地址: <span style={{ 
                  fontFamily: 'monospace',
                  background: 'rgba(255,255,255,0.2)',
                  padding: '4px 8px',
                  borderRadius: '4px'
                }}>{truncateAddress(address!)}</span>
              </p>
              <p style={{ margin: '5px 0', fontSize: '16px', fontWeight: '600' }}>
                余额: {isLoadingBalance ? '加载中...' : balance ? `${parseFloat(formatEther(balance.value)).toFixed(4)} ETH` : '0 ETH'}
              </p>
            </div>
            <button
              onClick={() => disconnect()}
              style={{
                padding: '8px 16px',
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '20px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              断开连接
            </button>
          </div>
        )}
      </div>

      {/* Transfer Section */}
      {isConnected && (
        <div style={{
          background: 'white',
          padding: '30px',
          borderRadius: '15px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          border: '1px solid #e9ecef'
        }}>
          <h3 style={{ 
            textAlign: 'center',
            color: '#495057',
            marginBottom: '25px',
            fontSize: '1.4rem'
          }}>🚀 发送 ETH</h3>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '600', 
              color: '#495057' 
            }}>
              接收地址
            </label>
            <input
              type="text"
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              placeholder="0x..."
              style={{
                width: '100%',
                padding: '15px',
                border: `2px solid ${isValidAddress(toAddress) || !toAddress ? '#e9ecef' : '#dc3545'}`,
                borderRadius: '12px',
                fontSize: '16px',
                outline: 'none',
                transition: 'border-color 0.3s',
                fontFamily: 'monospace'
              }}
              onFocus={(e) => {
                if (isValidAddress(toAddress) || !toAddress) {
                  e.target.style.borderColor = '#007bff';
                  e.target.style.boxShadow = '0 0 0 3px rgba(0, 123, 255, 0.1)';
                }
              }}
              onBlur={(e) => {
                e.target.style.borderColor = isValidAddress(toAddress) || !toAddress ? '#e9ecef' : '#dc3545';
                e.target.style.boxShadow = 'none';
              }}
            />
            {toAddress && !isValidAddress(toAddress) && (
              <p style={{ color: '#dc3545', fontSize: '14px', margin: '5px 0 0 0' }}>
                请输入有效的以太坊地址
              </p>
            )}
            {toAddress && isValidAddress(toAddress) && isContractAddress(toAddress) && (
              <div style={{ 
                color: '#856404', 
                backgroundColor: '#fff3cd',
                border: '1px solid #ffeaa7',
                borderRadius: '8px',
                padding: '10px',
                fontSize: '14px',
                margin: '5px 0 0 0'
              }}>
                ⚠️ <strong>注意：</strong>这是智能合约地址！
                <br />• 普通 ETH 转账会失败，因为合约不接受直接转账
                <br />• 如需与合约交互，请使用 <strong>"📝 智能合约演示"</strong> 功能
                <br />• 如需发送带附言的 ETH，请发送到普通钱包地址
              </div>
            )}
          </div>

          <div style={{ marginBottom: '25px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '600', 
              color: '#495057' 
            }}>
              转账金额 (ETH)
            </label>
            <input
              type="number"
              step="0.001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.001"
              style={{
                width: '100%',
                padding: '15px',
                border: `2px solid ${isValidAmount(amount) || !amount ? '#e9ecef' : '#dc3545'}`,
                borderRadius: '12px',
                fontSize: '16px',
                outline: 'none',
                transition: 'border-color 0.3s'
              }}
              onFocus={(e) => {
                if (isValidAmount(amount) || !amount) {
                  e.target.style.borderColor = '#007bff';
                  e.target.style.boxShadow = '0 0 0 3px rgba(0, 123, 255, 0.1)';
                }
              }}
              onBlur={(e) => {
                e.target.style.borderColor = isValidAmount(amount) || !amount ? '#e9ecef' : '#dc3545';
                e.target.style.boxShadow = 'none';
              }}
            />
            {amount && !isValidAmount(amount) && (
              <p style={{ color: '#dc3545', fontSize: '14px', margin: '5px 0 0 0' }}>
                请输入有效的转账金额
              </p>
            )}
            {balance && amount && isValidAmount(amount) && parseFloat(amount) > parseFloat(formatEther(balance.value)) && (
              <p style={{ color: '#dc3545', fontSize: '14px', margin: '5px 0 0 0' }}>
                余额不足
              </p>
            )}
          </div>

          <div style={{ marginBottom: '25px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '600', 
              color: '#495057' 
            }}>
              转账附言 (可选)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="添加转账备注信息...支持中文和 Emoji 🚀"
              maxLength={200}
              rows={3}
              style={{
                width: '100%',
                padding: '15px',
                border: '2px solid #e9ecef',
                borderRadius: '12px',
                fontSize: '16px',
                outline: 'none',
                transition: 'border-color 0.3s',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#007bff';
                e.target.style.boxShadow = '0 0 0 3px rgba(0, 123, 255, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e9ecef';
                e.target.style.boxShadow = 'none';
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666', margin: '5px 0 0 0' }}>
              <span>{message.length}/200 字符</span>
              {message.trim() && (
                <span>
                  编码后约 {getHexByteLength(message)} 字节 
                  (Gas 费用: +{Math.ceil(getHexByteLength(message) * 16 / 1000)}k)
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleTransfer}
            disabled={!canTransfer}
            style={{
              width: '100%',
              padding: '18px',
              background: canTransfer 
                ? 'linear-gradient(135deg, #28a745 0%, #20c997 100%)' 
                : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '18px',
              fontWeight: '600',
              cursor: canTransfer ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s',
              boxShadow: canTransfer ? '0 4px 15px rgba(40, 167, 69, 0.4)' : 'none'
            }}
          >
            {isTxPending || isTransferring ? '发送中...' : 
             isConfirming ? '确认中...' : 
             '发送转账'}
          </button>

          {/* Transaction Status */}
          {txHash && (
            <div style={{
              marginTop: '25px',
              padding: '20px',
              background: isConfirmed ? '#d4edda' : '#fff3cd',
              border: `1px solid ${isConfirmed ? '#c3e6cb' : '#ffeaa7'}`,
              borderRadius: '12px',
              textAlign: 'center'
            }}>
              <h4 style={{ 
                margin: '0 0 15px 0',
                color: isConfirmed ? '#155724' : '#856404'
              }}>
                {isConfirmed ? '✅ 转账成功!' : '⏳ 交易提交成功，等待确认...'}
              </h4>
              <p style={{ margin: '0 0 15px 0', fontSize: '14px' }}>
                交易哈希: <code style={{ 
                  background: 'rgba(0,0,0,0.1)', 
                  padding: '2px 6px', 
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  fontSize: '13px'
                }}>
                  {txHash.slice(0, 20)}...{txHash.slice(-10)}
                </code>
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <a
                  href={`https://sepolia.etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '8px 16px',
                    background: '#007bff',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  在 Etherscan 查看
                </a>
                {isConfirmed && onTransactionSuccess && (
                  <button
                    onClick={() => onTransactionSuccess(txHash)}
                    style={{
                      padding: '8px 16px',
                      background: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '20px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    查询此交易
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Error Display */}
          {(txError || receiptError) && (
            <div style={{
              marginTop: '20px',
              padding: '15px',
              background: '#f8d7da',
              color: '#721c24',
              borderRadius: '12px',
              border: '1px solid #f5c6cb'
            }}>
              <strong>❌ 转账失败:</strong> {(txError || receiptError)?.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WalletTransfer;