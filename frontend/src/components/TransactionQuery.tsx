/**
 * 交易查询组件 - 支持双数据源的交易哈希查询功能
 * 
 * 🎯 核心功能：
 * - 双数据源查询：The Graph 索引数据 + 直接 RPC 查询
 * - 实时数据获取：无需等待同步，直接从区块链获取最新数据
 * - 智能对比：展示两种查询方式的差异和特点
 * - 自动填充：支持外部传入交易哈希自动查询
 * - 数据格式化：友好的时间戳、以太币数量显示
 * 
 * 🔄 数据流程：
 * 1. 用户选择数据源（RPC 直查或 The Graph）
 * 2. 输入交易哈希进行查询
 * 3. 根据选择的数据源获取交易详情
 * 4. 格式化展示交易信息
 * 
 * 💡 技术特点：
 * - RPC 查询：实时性强，数据最新，但需要更多网络请求
 * - The Graph 查询：已处理索引数据，查询速度快，但可能有同步延迟
 * - 错误容错：完善的错误处理和用户反馈
 * - 状态管理：细致的加载状态和数据状态管理
 */

import React, { useState } from 'react';
import { useTransactionQuery } from '../hooks/useTransactionQuery';  // The Graph GraphQL 查询 Hook
import { ethereumService } from '../services/ethereumService';      // 直接 RPC 查询服务

/**
 * 交易查询组件属性接口
 * 
 * 📝 属性说明：
 * - initialTxHash: 初始交易哈希，用于自动填充和查询
 *   * 典型场景：从钱包转账组件传递交易哈希
 *   * 自动触发查询，提升用户体验
 * 
 * - onHashUsed: 哈希使用完毕回调函数
 *   * 用于通知父组件哈希已被消费
 *   * 避免重复使用相同的哈希
 */
interface TransactionQueryProps {
  initialTxHash?: string;  // 可选：外部传入的交易哈希
  onHashUsed?: () => void; // 可选：哈希使用完毕的回调
}

/**
 * RPC 交易数据接口定义
 * 
 * 🏗️ 结构说明：
 * 这个接口定义了直接从以太坊 RPC 节点获取的交易数据格式
 * 与 The Graph 的数据结构略有不同，需要适配处理
 * 
 * 📊 字段对应：
 * - hash: 交易唯一标识符
 * - from/to: 发送方和接收方地址
 * - value: 转账金额（Wei 单位字符串）
 * - gasUsed/gasPrice: Gas 相关信息
 * - blockNumber/timestamp: 区块相关信息
 * - status: 交易执行状态（"1"=成功，"0"=失败）
 * 
 * 💡 注意事项：
 * - 所有数值都是字符串格式（避免大数字精度问题）
 * - to 字段可能为 null（合约创建交易）
 * - 时间戳需要转换为可读格式
 */
interface RpcTransactionData {
  id: string;                // 交易唯一标识符
  hash: string;              // 交易哈希
  from: { address: string }; // 发送方账户对象
  to: { address: string } | null; // 接收方账户对象（可空）
  value: string;             // 转账金额（Wei 单位）
  gasUsed: string;           // 实际消耗的 Gas
  gasPrice: string;          // Gas 价格
  blockNumber: string;       // 所在区块号
  block: { hash: string; number: string }; // 区块信息对象
  timestamp: string;         // 交易时间戳
  status: string;            // 交易状态（1=成功，0=失败）
  transactionIndex: string;  // 交易在区块中的索引
}

const TransactionQuery: React.FC<TransactionQueryProps> = ({ initialTxHash, onHashUsed }) => {
  // ==================== 本地状态管理 ====================
  
  /**
   * 用户输入的交易哈希
   * 🎯 用途：绑定到输入框，实时反映用户输入
   * 📝 说明：这是用户正在编辑的哈希，未必是正在搜索的哈希
   */
  const [txHash, setTxHash] = useState<string>('');
  
  /**
   * 实际用于搜索的交易哈希
   * 🔍 用途：只有当用户点击搜索按钮时才更新
   * 💡 设计：分离输入和搜索状态，避免实时查询造成的性能问题
   */
  const [searchHash, setSearchHash] = useState<string>('');

  /**
   * 数据源选择状态
   * 
   * 🔀 支持的数据源：
   * - 'rpc': 直接从以太坊节点查询
   *   * 优点：数据实时，无需等待同步
   *   * 缺点：每次都需要网络请求，速度可能较慢
   * 
   * - 'graph': 从 The Graph 索引查询
   *   * 优点：查询速度快，数据已预处理
   *   * 缺点：需要等待同步，可能有延迟
   * 
   * 💡 默认选择 RPC：
   * - 确保用户能获取到最新的交易数据
   * - 对于刚刚发生的交易更友好
   * - 避免同步延迟导致的"找不到交易"问题
   */
  const [dataSource, setDataSource] = useState<'graph' | 'rpc'>('rpc');

  // ==================== 副作用处理 - 自动填充功能 ====================
  
  /**
   * 自动填充和搜索交易哈希
   * 
   * 🎯 使用场景：
   * - 用户在钱包转账组件完成转账后
   * - 自动跳转到查询组件并填充交易哈希
   * - 无需用户手动复制粘贴
   * 
   * 🔄 执行逻辑：
   * 1. 检查是否有新的 initialTxHash 传入
   * 2. 如果哈希与当前搜索哈希不同，则更新
   * 3. 同时更新输入框和搜索状态
   * 4. 调用回调通知父组件哈希已被使用
   * 
   * 🚀 用户体验：
   * - 自动填充：无需手动输入长串哈希
   * - 自动搜索：立即显示交易详情
   * - 状态同步：确保组件状态正确更新
   * 
   * 📌 依赖数组说明：
   * - initialTxHash: 外部传入的哈希变化时执行
   * - searchHash: 避免重复处理相同哈希
   * - onHashUsed: 回调函数变化时重新绑定
   */
  React.useEffect(() => {
    if (initialTxHash && initialTxHash !== searchHash) {
      setTxHash(initialTxHash);       // 更新输入框内容
      setSearchHash(initialTxHash);   // 触发查询
      onHashUsed?.();                 // 通知父组件哈希已使用
    }
  }, [initialTxHash, searchHash, onHashUsed]);
  
  // ==================== The Graph 查询 ====================
  
  /**
   * The Graph GraphQL 查询
   * 
   * 🔍 查询条件：
   * - 只有当数据源选择为 'graph' 且有搜索哈希时才执行
   * - 使用条件查询避免不必要的 GraphQL 请求
   * 
   * 📊 返回数据结构：
   * - data: GraphQL 查询结果，包含 transaction 对象
   * - loading: 查询加载状态
   * - error: 查询错误信息
   * 
   * 💡 优化特性：
   * - 自动缓存：Apollo Client 自动缓存查询结果
   * - 条件查询：避免无效查询浪费资源
   * - 类型安全：完整的 TypeScript 类型支持
   */
  const { data: graphData, loading: graphLoading, error: graphError } = useTransactionQuery(
    dataSource === 'graph' ? searchHash : ''  // 条件查询：只有选择 Graph 数据源时才查询
  );
  
  // ==================== RPC 查询状态管理 ====================
  
  /**
   * RPC 查询数据状态
   * 🗃️ 存储从以太坊节点直接获取的交易数据
   * 📋 数据格式：RpcTransactionData 接口定义的结构
   */
  const [rpcData, setRpcData] = useState<RpcTransactionData | null>(null);
  
  /**
   * RPC 查询加载状态
   * ⏳ 控制查询按钮和加载提示的显示
   * 🔄 生命周期：查询开始时设为 true，结束时设为 false
   */
  const [rpcLoading, setRpcLoading] = useState<boolean>(false);
  
  /**
   * RPC 查询错误信息
   * ❌ 存储查询失败时的错误消息
   * 📝 用户友好：转换技术错误为用户可理解的信息
   */
  const [rpcError, setRpcError] = useState<string>('');

  // ==================== 数据源统一抽象 ====================
  
  /**
   * 统一数据接口适配
   * 
   * 🔧 设计目的：
   * - 抽象不同数据源的差异
   * - 为 UI 渲染提供统一的数据接口
   * - 简化组件逻辑，避免到处判断数据源
   * 
   * 📊 数据结构适配：
   * - Graph 数据：直接返回 graphData（已包含 transaction 结构）
   * - RPC 数据：包装为 { transaction: rpcData } 结构
   * 
   * 💡 这样设计的好处：
   * - UI 组件不需要关心数据来源
   * - 渲染逻辑保持一致
   * - 便于后续添加新的数据源
   */
  const data = dataSource === 'graph' ? graphData : { transaction: rpcData };
  
  /**
   * 统一加载状态抽象
   * ⏳ 根据当前数据源返回对应的加载状态
   * 🎯 用于控制 UI 的加载提示显示
   */
  const loading = dataSource === 'graph' ? graphLoading : rpcLoading;
  
  /**
   * 统一错误状态抽象
   * 
   * 🚨 错误格式标准化：
   * - Graph 错误：Apollo Client 返回的错误对象（已有 message 属性）
   * - RPC 错误：字符串错误信息，需要包装为对象格式
   * 
   * 💡 统一格式的意义：
   * - UI 组件可以统一使用 error.message 显示错误
   * - 简化错误处理逻辑
   * - 便于后续扩展错误信息（如错误代码、建议操作等）
   */
  const error = dataSource === 'graph' ? graphError : (rpcError ? { message: rpcError } : null);

  // ==================== 事件处理函数 ====================
  
  /**
   * 处理交易查询提交
   * 
   * 🎯 核心查询逻辑函数
   * 
   * 🔄 执行流程：
   * 1. 阻止表单默认提交行为
   * 2. 验证输入是否为空
   * 3. 清理和标准化输入（转小写）
   * 4. 更新搜索哈希状态
   * 5. 根据数据源执行对应的查询逻辑
   * 
   * 🚀 RPC 查询流程：
   * 1. 设置加载状态，清空之前的数据和错误
   * 2. 调用 ethereumService 进行网络请求
   * 3. 处理查询结果或错误
   * 4. 更新 UI 状态
   * 
   * 🛡️ 安全措施：
   * - 输入验证：检查哈希不为空
   * - 输入清理：转换为标准格式（小写）
   * - 错误捕获：全面的异常处理
   * - 状态重置：每次查询前清空之前的结果
   * 
   * 💡 用户体验优化：
   * - 加载状态：禁用按钮，显示加载提示
   * - 错误友好：将技术错误转换为用户可理解的信息
   * - 控制台日志：便于开发调试
   * 
   * 📝 Graph 查询说明：
   * - Graph 查询由 useTransactionQuery Hook 自动处理
   * - 只需要更新 searchHash，Hook 会自动重新查询
   * - 无需手动管理加载状态和错误处理
   */
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();                    // 阻止表单默认提交
    if (!txHash.trim()) return;          // 验证输入不为空

    const cleanHash = txHash.toLowerCase(); // 标准化哈希格式
    setSearchHash(cleanHash);              // 触发查询

    // RPC 查询需要手动处理
    if (dataSource === 'rpc') {
      setRpcLoading(true);     // 开始加载
      setRpcError('');         // 清空之前的错误
      setRpcData(null);        // 清空之前的数据
      
      try {
        console.log('Searching transaction via RPC:', cleanHash);
        // 调用以太坊服务查询交易
        const transaction = await ethereumService.getTransactionByHash(cleanHash);
        setRpcData(transaction);
        
        // 处理未找到交易的情况
        if (!transaction) {
          setRpcError('未找到该交易，请检查交易哈希是否正确');
        }
      } catch (err) {
        // 错误处理和用户友好提示
        console.error('RPC search error:', err);
        setRpcError(err instanceof Error ? err.message : '查询失败');
      } finally {
        setRpcLoading(false);    // 结束加载状态
      }
    }
    // Graph 查询由 Hook 自动处理，无需额外代码
  };

  /**
   * 清除搜索结果和输入
   * 
   * 🧹 清理功能：
   * - 重置输入框内容
   * - 清空搜索状态
   * - 清除 RPC 查询结果和错误
   * 
   * 🎯 使用场景：
   * - 用户想要重新开始搜索
   * - 清理当前界面状态
   * - 准备输入新的交易哈希
   * 
   * 💡 设计考虑：
   * - 只清理 RPC 相关状态，Graph 状态由 Hook 自动管理
   * - 保持数据源选择不变（用户偏好）
   * - 提供干净的重新开始体验
   */
  const handleClear = () => {
    setTxHash('');        // 清空输入框
    setSearchHash('');    // 清空搜索状态（会导致 Graph Hook 停止查询）
    setRpcData(null);     // 清空 RPC 数据
    setRpcError('');      // 清空 RPC 错误
  };

  /**
   * 处理数据源切换
   * 
   * 🔀 切换逻辑：
   * - 更新数据源选择
   * - 清空之前数据源的查询结果
   * - 重置搜索状态以避免混乱
   * 
   * 🧹 清理策略：
   * - 清空 RPC 查询的本地状态
   * - 重置搜索哈希（Graph Hook 会自动停止查询）
   * - 保持输入框内容不变（用户可能想用相同哈希重新查询）
   * 
   * 💡 用户体验：
   * - 切换数据源时提供清爽的开始状态
   * - 避免显示之前数据源的过时结果
   * - 让用户明确知道正在使用的数据源
   * 
   * 🎯 典型场景：
   * - 用户想对比两种数据源的结果
   * - Graph 数据同步延迟，切换到 RPC 获取最新数据
   * - RPC 查询失败，切换到 Graph 使用缓存数据
   */
  const handleDataSourceChange = (source: 'graph' | 'rpc') => {
    setDataSource(source);  // 更新数据源选择
    // 清理切换数据源时的状态
    setRpcData(null);       // 清空 RPC 数据
    setRpcError('');        // 清空 RPC 错误
    setSearchHash('');      // 重置搜索状态
  };

  // ==================== 数据格式化工具函数 ====================
  
  /**
   * 将 Wei 单位转换为 ETH 单位并格式化显示
   * 
   * 💰 以太币单位转换：
   * - Wei 是以太币的最小单位
   * - 1 ETH = 10^18 Wei
   * - 区块链上所有数值都以 Wei 为单位存储
   * 
   * 🔢 转换过程：
   * 1. 将字符串转换为 BigInt（处理大数字）
   * 2. 除以 10^18 转换为 ETH
   * 3. 保留 6 位小数，便于阅读
   * 
   * ⚠️ 精度处理：
   * - 使用 BigInt 避免 JavaScript 数字精度问题
   * - Number() 转换可能损失精度，但对显示足够
   * - 生产环境建议使用 ethers.js 的 formatEther
   * 
   * 💡 显示考虑：
   * - 6 位小数平衡精度和可读性
   * - 对于大多数交易金额，6 位小数已足够精确
   * - 避免显示过长的小数影响界面美观
   */
  const formatEther = (wei: string): string => {
    const weiNum = BigInt(wei);                           // 安全处理大数字
    const etherValue = Number(weiNum) / Math.pow(10, 18); // 转换为 ETH
    return etherValue.toFixed(6);                         // 保留 6 位小数
  };

  /**
   * 将 Unix 时间戳转换为本地化时间字符串
   * 
   * ⏰ 时间戳处理：
   * - 区块链时间戳通常是 Unix 时间戳（秒）
   * - JavaScript Date 构造函数需要毫秒
   * - 需要乘以 1000 进行单位转换
   * 
   * 🌍 本地化显示：
   * - toLocaleString() 自动根据用户地区显示
   * - 包含日期和时间信息
   * - 用户友好的可读格式
   * 
   * 📅 示例输出：
   * - 英文环境："12/25/2023, 3:30:45 PM"
   * - 中文环境："2023/12/25 下午3:30:45"
   * 
   * 💡 扩展可能：
   * - 可添加相对时间显示（"3 小时前"）
   * - 可添加 UTC 时间选项
   * - 可自定义时间格式
   */
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(parseInt(timestamp) * 1000);  // Unix 秒转毫秒
    return date.toLocaleString();                       // 本地化时间字符串
  };

  return (
    <div style={{ margin: '0 auto' }}>
      <h2 style={{ 
        textAlign: 'center', 
        marginBottom: '1rem',
        color: '#333',
        fontSize: '1.8rem'
      }}>🔎 交易哈希查询</h2>

      {/* ==================== 数据源切换区域 ==================== */}
      {/* 
        🔀 数据源选择界面
        
        设计理念：
        - 让用户直观理解两种查询方式的差异
        - 通过视觉设计突出当前选择的数据源
        - 响应式设计适配不同屏幕尺寸
        
        交互特性：
        - 选中状态有明显的视觉反馈（渐变色、阴影）
        - 未选中状态保持简洁（灰色边框）
        - 悬停效果增强交互性
      */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        marginBottom: '2rem',
        gap: '10px',
        flexWrap: 'wrap'  // 响应式：小屏幕时按钮换行
      }}>
        <button
          onClick={() => handleDataSourceChange('rpc')}
          style={{
            padding: '10px 20px',
            background: dataSource === 'rpc' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#f8f9fa',
            color: dataSource === 'rpc' ? 'white' : '#333',
            border: dataSource === 'rpc' ? 'none' : '2px solid #e9ecef',
            borderRadius: '25px',
            cursor: 'pointer',
            transition: 'all 0.3s',
            fontSize: '14px',
            fontWeight: '600',
            boxShadow: dataSource === 'rpc' ? '0 4px 15px rgba(102, 126, 234, 0.4)' : 'none'
          }}
        >
          🚀 直接查询 (实时数据)
        </button>
        <button
          onClick={() => handleDataSourceChange('graph')}
          style={{
            padding: '10px 20px',
            background: dataSource === 'graph' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#f8f9fa',
            color: dataSource === 'graph' ? 'white' : '#333',
            border: dataSource === 'graph' ? 'none' : '2px solid #e9ecef',
            borderRadius: '25px',
            cursor: 'pointer',
            transition: 'all 0.3s',
            fontSize: '14px',
            fontWeight: '600',
            boxShadow: dataSource === 'graph' ? '0 4px 15px rgba(102, 126, 234, 0.4)' : 'none'
          }}
        >
          📊 The Graph (索引数据)
        </button>
      </div>

      {/* Data Source Info */}
      <div style={{
        background: dataSource === 'rpc' ? '#e8f5e8' : '#fff3cd',
        color: dataSource === 'rpc' ? '#2d5a2d' : '#856404',
        padding: '12px',
        borderRadius: '8px',
        marginBottom: '20px',
        textAlign: 'center',
        fontSize: '14px'
      }}>
        {dataSource === 'rpc' ? (
          <>
            ✅ <strong>直接查询模式</strong> - 从 Sepolia 网络实时获取数据，无需等待同步
          </>
        ) : (
          <>
            ⏳ <strong>The Graph 模式</strong> - 查询已索引数据，可能需要等待同步 (当前同步到较早区块)
          </>
        )}
      </div>
      
      <form onSubmit={handleSearch} style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
            placeholder="输入交易哈希 (0x...)"
            style={{
              flex: 1,
              padding: '15px',
              border: '2px solid #e9ecef',
              borderRadius: '12px',
              fontSize: '16px',
              outline: 'none',
              transition: 'border-color 0.3s, box-shadow 0.3s',
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
          <button
            type="submit"
            disabled={loading || !txHash.trim()}
            style={{
              padding: '15px 25px',
              background: loading || !txHash.trim() ? '#6c757d' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: loading || !txHash.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s',
              fontSize: '16px',
              fontWeight: '600',
              minWidth: '100px',
              boxShadow: loading || !txHash.trim() ? 'none' : '0 4px 15px rgba(102, 126, 234, 0.4)'
            }}
          >
            {loading ? '查询中...' : '查询'}
          </button>
          {(txHash || searchHash) && (
            <button
              type="button"
              onClick={handleClear}
              style={{
                padding: '15px 20px',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s',
                fontSize: '16px',
                fontWeight: '600'
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.background = '#5a6268';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.background = '#6c757d';
              }}
            >
              清除
            </button>
          )}
        </div>
      </form>

      {loading && (
        <div style={{
          textAlign: 'center',
          padding: '20px',
          background: '#f8f9fa',
          borderRadius: '12px',
          marginBottom: '20px'
        }}>
          <p style={{ margin: 0, color: '#666' }}>🔍 {dataSource === 'rpc' ? '正在查询 Sepolia 网络...' : '正在查询 The Graph 数据...'}</p>
        </div>
      )}
      
      {error && (
        <div style={{
          background: '#ffebee',
          color: '#c62828',
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          错误: {error.message}
        </div>
      )}

      {data?.transaction && (
        <div style={{
          background: '#f5f5f5',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #ddd'
        }}>
          <h2>交易详情</h2>
          <div style={{ display: 'grid', gap: '10px' }}>
            <div>
              <strong>交易哈希:</strong> {data.transaction.hash}
            </div>
            <div>
              <strong>发送方:</strong> {data.transaction.from.address}
            </div>
            <div>
              <strong>接收方:</strong> {data.transaction.to?.address || '合约创建'}
            </div>
            <div>
              <strong>金额:</strong> {formatEther(data.transaction.value)} ETH
            </div>
            <div>
              <strong>Gas 使用量:</strong> {data.transaction.gasUsed}
            </div>
            <div>
              <strong>Gas 价格:</strong> {data.transaction.gasPrice} wei
            </div>
            <div>
              <strong>区块号:</strong> {data.transaction.blockNumber}
            </div>
            <div>
              <strong>区块哈希:</strong> {data.transaction.block.hash}
            </div>
            <div>
              <strong>时间戳:</strong> {formatTimestamp(data.transaction.timestamp)}
            </div>
            <div>
              <strong>状态:</strong> {data.transaction.status === '1' ? '成功' : '失败'}
            </div>
            <div>
              <strong>交易索引:</strong> {data.transaction.transactionIndex}
            </div>
          </div>
        </div>
      )}

      {searchHash && !loading && !data?.transaction && (
        <div style={{
          background: '#fff3cd',
          color: '#856404',
          padding: '10px',
          borderRadius: '4px'
        }}>
          未找到交易记录，请检查交易哈希是否正确或等待 Subgraph 同步。
        </div>
      )}
    </div>
  );
};

export default TransactionQuery;