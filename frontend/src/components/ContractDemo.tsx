/**
 * 智能合约演示组件 - 展示如何与部署的智能合约进行交互
 * 
 * 🎯 组件功能：
 * - 连接用户钱包并显示连接状态
 * - 读取智能合约的状态数据（总记录数、用户记录数）
 * - 调用智能合约函数记录转账事件
 * - 实时显示交易状态和结果
 * - 提供用户友好的操作界面和错误处理
 * 
 * 🔧 技术要点：
 * - 使用 Wagmi Hooks 进行 Web3 交互
 * - 类型安全的合约调用
 * - 实时状态管理和更新
 * - 用户体验优化（加载状态、错误提示）
 */

import React, { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseEther } from 'viem';
import SimpleTransferContractABI from '../contracts/SimpleTransferContract.json';

/**
 * 智能合约配置对象
 * 
 * 📝 配置说明：
 * - address: 已部署的智能合约地址（在 Sepolia 测试网）
 * - abi: 合约的 ABI（应用程序二进制接口），定义了合约的函数和事件
 * 
 * 🔍 ABI 的作用：
 * - 告诉前端如何与合约交互
 * - 定义函数参数类型和返回值
 * - 编码/解码合约调用数据
 */
const CONTRACT_CONFIG = {
  address: '0x830B796F55E6A3f86E924297e510B24192A0Ba1c' as `0x${string}`, // ✅ 实际部署的合约地址
  abi: SimpleTransferContractABI,
};

/**
 * 组件 Props 接口定义
 */
interface ContractDemoProps {
  onRecordSuccess?: (txHash: string) => void;  // 记录成功后的回调函数
}

/**
 * 智能合约演示主组件
 */
const ContractDemo: React.FC<ContractDemoProps> = ({ onRecordSuccess }) => {
  // ==================== 组件状态管理 ====================
  
  /**
   * 表单输入状态
   * 
   * 📝 状态说明：
   * - toAddress: 接收方以太坊地址
   * - amount: 转账金额（ETH 单位）
   * - message: 转账备注信息
   */
  const [toAddress, setToAddress] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  // ==================== Wagmi Hooks 使用 ====================
  
  /**
   * 钱包账户信息 Hook
   * 
   * 🔗 useAccount 功能：
   * - address: 当前连接的钱包地址
   * - isConnected: 钱包是否已连接
   * - 自动监听钱包状态变化
   */
  const { address, isConnected } = useAccount();

  /**
   * 读取合约状态 - 总记录数
   * 
   * 🔍 useReadContract 特点：
   * - 自动调用合约的只读函数
   * - 实时更新数据，无需手动刷新
   * - 不消耗 Gas 费用（view/pure 函数）
   */
  const { data: totalRecords } = useReadContract({
    ...CONTRACT_CONFIG,
    functionName: 'totalRecords',  // 调用合约的 totalRecords() 函数
  });

  /**
   * 读取合约状态 - 用户记录数
   * 
   * 📊 条件查询：
   * - args: [address] - 传递当前用户地址作为参数
   * - enabled: !!address - 只有当地址存在时才执行查询
   */
  const { data: userRecordCount } = useReadContract({
    ...CONTRACT_CONFIG,
    functionName: 'userRecordCount',  // 调用合约的 userRecordCount(address) 函数
    args: [address],                  // 传递参数：当前用户地址
  });

  /**
   * 智能合约写入操作 Hook
   * 
   * ✍️ useWriteContract 功能：
   * - writeContract: 执行合约写入函数的方法
   * - data: txHash - 交易提交后返回的交易哈希
   * - isPending: 交易提交中状态
   * - error: 交易提交过程中的错误
   */
  const {
    writeContract,      // 执行合约写入的函数
    data: txHash,       // 交易哈希（交易提交成功后获得）
    isPending: isWritePending,  // 交易提交中状态
    error: writeError,  // 交易提交错误
  } = useWriteContract();

  /**
   * 交易确认状态监听 Hook
   * 
   * ⏳ useWaitForTransactionReceipt 功能：
   * - 监听指定交易哈希的确认状态
   * - isLoading: 等待区块确认中
   * - isSuccess: 交易成功确认
   * - error: 交易执行失败
   */
  const {
    isLoading: isConfirming,  // 交易确认中状态
    isSuccess: isConfirmed,   // 交易成功确认状态
    error: receiptError,      // 交易执行错误
  } = useWaitForTransactionReceipt({
    hash: txHash,  // 监听的交易哈希
  });

  // ==================== 业务逻辑函数 ====================

  /**
   * 处理智能合约记录转账操作
   * 
   * 🔄 执行流程：
   * 1. 验证输入参数有效性
   * 2. 调用智能合约的 recordTransfer 函数
   * 3. 传递参数：接收地址、金额（wei）、备注信息
   * 4. 等待用户在 MetaMask 中确认交易
   * 5. 交易提交成功后获得交易哈希
   */
  const handleRecordTransfer = async () => {
    // 输入验证：确保所有必要字段都已填写
    if (!toAddress || !amount || !message.trim()) return;

    try {
      // 调用智能合约写入函数
      await writeContract({
        ...CONTRACT_CONFIG,
        functionName: 'recordTransfer',  // 合约函数名
        args: [
          toAddress as `0x${string}`,    // 接收方地址（需要类型转换）
          parseEther(amount),            // 金额转换为 wei 单位
          message,                       // 转账备注信息
        ],
      });
    } catch (error) {
      console.error('合约调用错误:', error);
    }
  };

  /**
   * 交易成功确认后的处理逻辑
   * 
   * 🎉 成功处理：
   * - 调用父组件传入的成功回调
   * - 清空表单输入
   * - 重置组件状态
   */
  React.useEffect(() => {
    if (isConfirmed && txHash) {
      // 调用成功回调，传递交易哈希
      onRecordSuccess?.(txHash);
      
      // 清空表单数据，准备下次操作
      setToAddress('');
      setAmount('');
      setMessage('');
    }
  }, [isConfirmed, txHash, onRecordSuccess]);

  // ==================== 工具函数 ====================

  /**
   * 验证以太坊地址格式是否正确
   * 
   * 🔍 验证规则：
   * - 必须以 0x 开头
   * - 后跟 40 个十六进制字符
   * - 总长度为 42 个字符
   */
  const isValidAddress = (addr: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(addr);
  };

  /**
   * 验证转账金额是否有效
   * 
   * 💰 验证规则：
   * - 必须是数字
   * - 必须大于 0
   * - 不能是 NaN
   */
  const isValidAmount = (amt: string): boolean => {
    try {
      const num = parseFloat(amt);
      return num > 0 && !isNaN(num);
    } catch {
      return false;
    }
  };

  /**
   * 判断是否可以执行记录操作
   * 
   * ✅ 可执行条件：
   * - 钱包已连接
   * - 接收地址格式正确
   * - 金额有效
   * - 备注信息不为空
   * - 没有正在进行的交易
   */
  const canRecord = isConnected && 
    isValidAddress(toAddress) && 
    isValidAmount(amount) && 
    message.trim().length > 0 &&
    !isWritePending && 
    !isConfirming;

  /**
   * 截断地址显示（用于 UI 显示）
   * 
   * 📱 显示格式：0x1234...5678
   * - 保留前 6 位和后 4 位
   * - 中间用省略号连接
   */
  const truncateAddress = (addr: string): string => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // ==================== 渲染 UI ====================

  return (
    <div>
      {/* 组件标题 */}
      <h2 style={{ 
        textAlign: 'center', 
        marginBottom: '2rem',
        color: '#333',
        fontSize: '1.8rem'
      }}>📝 智能合约演示</h2>

      {/* 合约状态显示区域 */}
      <div style={{
        background: 'linear-gradient(135deg, #6f42c1 0%, #e83e8c 100%)',
        color: 'white',
        padding: '20px',
        borderRadius: '15px',
        marginBottom: '2rem',
        textAlign: 'center'
      }}>
        <h3 style={{ margin: '0 0 15px 0' }}>📊 合约统计</h3>
        <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '20px' }}>
          {/* 总记录数显示 */}
          <div>
            <p style={{ margin: '0', fontSize: '14px', opacity: 0.9 }}>总记录数</p>
            <p style={{ margin: '5px 0 0 0', fontSize: '24px', fontWeight: 'bold' }}>
              {totalRecords?.toString() || '0'}
            </p>
          </div>
          {/* 用户记录数显示 */}
          <div>
            <p style={{ margin: '0', fontSize: '14px', opacity: 0.9 }}>我的记录数</p>
            <p style={{ margin: '5px 0 0 0', fontSize: '24px', fontWeight: 'bold' }}>
              {userRecordCount?.toString() || '0'}
            </p>
          </div>
          {/* 合约地址显示 */}
          <div>
            <p style={{ margin: '0', fontSize: '14px', opacity: 0.9 }}>合约地址</p>
            <p style={{ 
              margin: '5px 0 0 0', 
              fontSize: '14px', 
              fontFamily: 'monospace',
              background: 'rgba(255,255,255,0.2)',
              padding: '4px 8px',
              borderRadius: '4px'
            }}>
              {truncateAddress(CONTRACT_CONFIG.address)}
            </p>
          </div>
        </div>
      </div>

      {/* 钱包未连接提示 */}
      {!isConnected ? (
        <div style={{
          background: '#fff3cd',
          color: '#856404',
          padding: '20px',
          borderRadius: '12px',
          textAlign: 'center',
          border: '1px solid #ffeaa7'
        }}>
          <h3>⚠️ 请先连接钱包</h3>
          <p>请切换到 "💰 钱包转账" 标签页连接您的 MetaMask 钱包</p>
        </div>
      ) : CONTRACT_CONFIG.address === '0x0000000000000000000000000000000000000000' ? (
        /* 合约未部署提示 */
        <div style={{
          background: '#ffebee',
          color: '#c62828',
          padding: '20px',
          borderRadius: '12px',
          textAlign: 'center',
          border: '1px solid #ffcdd2'
        }}>
          <h3>🚨 合约未部署</h3>
          <p>请按照教程部署智能合约，然后更新合约地址配置</p>
        </div>
      ) : (
        /* 主要操作区域 */
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
          }}>🚀 记录转账事件</h3>

          {/* 功能说明 */}
          <p style={{
            background: '#e3f2fd',
            color: '#1565c0',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '25px',
            fontSize: '14px'
          }}>
            💡 <strong>说明：</strong>这里不是真实转账，而是在合约中记录转账意图。
            这些记录会触发区块链事件，供 The Graph 索引和查询。
          </p>

          {/* 接收地址输入 */}
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
                fontFamily: 'monospace'
              }}
            />
          </div>

          {/* 金额输入 */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '600', 
              color: '#495057' 
            }}>
              金额 (ETH) - 仅用于记录
            </label>
            <input
              type="number"
              step="0.001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1.0"
              style={{
                width: '100%',
                padding: '15px',
                border: `2px solid ${isValidAmount(amount) || !amount ? '#e9ecef' : '#dc3545'}`,
                borderRadius: '12px',
                fontSize: '16px',
                outline: 'none'
              }}
            />
          </div>

          {/* 备注输入 */}
          <div style={{ marginBottom: '25px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '600', 
              color: '#495057' 
            }}>
              转账备注
            </label>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="转账备注信息..."
              maxLength={100}
              style={{
                width: '100%',
                padding: '15px',
                border: `2px solid ${message.trim().length > 0 || !message ? '#e9ecef' : '#dc3545'}`,
                borderRadius: '12px',
                fontSize: '16px',
                outline: 'none'
              }}
            />
            <p style={{ fontSize: '12px', color: '#666', margin: '5px 0 0 0' }}>
              {message.length}/100 字符
            </p>
          </div>

          {/* 提交按钮 */}
          <button
            onClick={handleRecordTransfer}
            disabled={!canRecord}
            style={{
              width: '100%',
              padding: '18px',
              background: canRecord 
                ? 'linear-gradient(135deg, #6f42c1 0%, #e83e8c 100%)' 
                : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '18px',
              fontWeight: '600',
              cursor: canRecord ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s',
              boxShadow: canRecord ? '0 4px 15px rgba(111, 66, 193, 0.4)' : 'none'
            }}
          >
            {isWritePending ? '提交中...' : 
             isConfirming ? '确认中...' : 
             '记录到合约'}
          </button>

          {/* 交易状态显示 */}
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
                {isConfirmed ? '✅ 记录成功!' : '⏳ 交易提交成功，等待确认...'}
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
                {/* Etherscan 查看链接 */}
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
                {/* 查询交易按钮 */}
                {isConfirmed && onRecordSuccess && (
                  <button
                    onClick={() => onRecordSuccess(txHash)}
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

          {/* 错误信息显示 */}
          {(writeError || receiptError) && (
            <div style={{
              marginTop: '20px',
              padding: '15px',
              background: '#f8d7da',
              color: '#721c24',
              borderRadius: '12px',
              border: '1px solid #f5c6cb'
            }}>
              <strong>❌ 操作失败:</strong> {(writeError || receiptError)?.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ContractDemo;