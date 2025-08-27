import React from 'react';
import { useTransactionsQuery, useMetaQuery } from '../hooks/useTransactionQuery';
// hex utils imports 已移除，因为当前不需要在此组件中使用

interface Account {
  address: string;
}

interface Transaction {
  id: string;
  recordId?: string;        // 可选，因为RPC数据可能没有
  transactionHash?: string; // 可选，适配不同数据源
  hash?: string;           // 可选，适配RPC数据
  from: Account;
  to?: Account;            // 可选，合约创建交易可能没有
  value: string;
  message?: string;        // 可选，不是所有交易都有附言
  blockNumber: string;
  timestamp: string;
}

// Block 接口已被移除，因为 Schema 中没有定义 Block 实体

interface TransactionListProps {
  enabled?: boolean;
}

const TransactionList: React.FC<TransactionListProps> = ({ enabled = true }) => {
  const { data, loading, error } = useTransactionsQuery(20, 0, enabled);
  const { data: metaData, error: metaError } = useMetaQuery(enabled);

  const formatEther = (wei: string): string => {
    const weiNum = BigInt(wei);
    const etherValue = Number(weiNum) / Math.pow(10, 18);
    return etherValue.toFixed(6);
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(parseInt(timestamp) * 1000);
    return date.toLocaleString();
  };

  const formatAddress = (address: string): string => {
    if (!address) return '';
    return address;
  };

  const formatHash = (hash: string): string => {
    if (!hash) return '';
    return hash;
  };

  // parseMessage 函数已移除，因为当前不需要在此组件中解析附言

  if (loading) return <p>加载最新交易中...</p>;
  
  if (error) return (
    <div style={{
      background: '#ffebee',
      color: '#c62828',
      padding: '10px',
      borderRadius: '4px'
    }}>
      错误: {error instanceof Error ? error.message : '未知错误'}
    </div>
  );

  return (
    <div style={{
      width: '100%',
      maxWidth: '100%',
      margin: '0',
      padding: '0'
    }}>
      <h2 style={{ 
        textAlign: 'center', 
        marginBottom: '2rem',
        color: '#333',
        fontSize: '1.8rem',
        margin: '0 0 2rem 0'
      }}>📊 数据概览</h2>

      {/* Sync Status */}
      {metaData && (
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '15px',
          marginBottom: '2rem',
          textAlign: 'center',
          boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)'
        }}>
          <h4 style={{ margin: 0, marginBottom: '10px', fontSize: '1.2rem' }}>
            🔄 The Graph 同步状态
          </h4>
          <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>
            当前同步区块: <span style={{ 
              background: 'rgba(255, 255, 255, 0.2)',
              padding: '4px 12px',
              borderRadius: '20px',
              fontFamily: 'monospace'
            }}>#{metaData._meta.block.number}</span>
          </p>
        </div>
      )}
      
      {metaError && (
        <div style={{
          background: 'rgba(255, 193, 7, 0.1)',
          color: '#856404',
          padding: '15px',
          borderRadius: '12px',
          marginBottom: '2rem',
          textAlign: 'center',
          border: '1px solid rgba(255, 193, 7, 0.3)'
        }}>
          <p style={{ margin: 0, fontSize: '14px' }}>
            ⚠️ The Graph 同步状态查询失败，这不影响直接查询功能的使用
          </p>
        </div>
      )}
      
      {/* Show blocks data while transactions are not available */}
      <div style={{ marginBottom: '40px', width: '100%' }}>
        <h3 style={{ 
          color: '#495057',
          fontSize: '1.4rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          flexWrap: 'wrap'
        }}>
          🧱 最新区块记录 <span style={{ 
            background: '#28a745',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '12px',
            fontSize: '0.8rem',
            fontWeight: '600'
          }}>已同步</span>
        </h3>
        
        {/* 区块查询已被移除，因为 Schema 中没有 Block 实体 */}
        
        {/* 数据统计 */}
        {data?.transferRecords && data.transferRecords.length > 0 && (
          <div className="grid grid-auto" style={{
            marginBottom: '20px'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '20px',
              borderRadius: '12px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '5px' }}>
                {data.transferRecords.length}
              </div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>转账记录总数</div>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
              color: 'white',
              padding: '20px',
              borderRadius: '12px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '5px' }}>
                {new Set(data.transferRecords.map(tx => tx.from.address)).size}
              </div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>活跃发送地址</div>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #fd7e14 0%, #e83e8c 100%)',
              color: 'white',
              padding: '20px',
              borderRadius: '12px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '5px' }}>
                {Math.round(data.transferRecords.reduce((sum, tx) => 
                  sum + parseFloat(formatEther(tx.value)), 0) * 1000) / 1000
                }
              </div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>总转账金额 (ETH)</div>
            </div>
          </div>
        )}
      </div>

      {/* Transactions section */}
      <div style={{ width: '100%' }}>
        <h3 style={{ 
          color: '#495057',
          fontSize: '1.4rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          flexWrap: 'wrap'
        }}>
          💳 转账记录 <span style={{ 
            background: '#28a745',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '12px',
            fontSize: '0.8rem',
            fontWeight: '600'
          }}>合约记录</span>
        </h3>
        {loading && <p>加载最新交易中...</p>}
        
        {error && (
          <div style={{
            background: '#ffebee',
            color: '#c62828',
            padding: '10px',
            borderRadius: '4px'
          }}>
            交易数据错误: {String(error)}
          </div>
        )}

        {data?.transferRecords && data.transferRecords.length > 0 ? (
          <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            width: '100%'
          }}>
            {data.transferRecords.map((tx: Transaction) => (
              <div 
                key={tx.id} 
                style={{
                  background: 'white',
                  border: '1px solid #e0e0e0',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  transition: 'box-shadow 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                }}
              >
                {/* 交易哈希 */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ 
                    display: 'block',
                    fontSize: '12px',
                    color: '#666',
                    marginBottom: '4px',
                    fontWeight: '600'
                  }}>
                    📋 交易哈希
                  </label>
                  <div style={{
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    background: '#f8f9fa',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #e9ecef',
                    wordBreak: 'break-all',
                    color: '#495057'
                  }}>
                    {formatHash(tx.transactionHash || tx.hash || '') || 'N/A'}
                  </div>
                </div>

                {/* 地址信息 */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px',
                  marginBottom: '12px'
                }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '12px',
                      color: '#666',
                      marginBottom: '4px',
                      fontWeight: '600'
                    }}>
                      📤 发送方
                    </label>
                    <div style={{
                      fontFamily: 'monospace',
                      fontSize: '14px',
                      background: '#fff5f5',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #fed7d7',
                      wordBreak: 'break-all',
                      color: '#c53030'
                    }}>
                      {formatAddress(tx.from?.address) || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '12px',
                      color: '#666',
                      marginBottom: '4px',
                      fontWeight: '600'
                    }}>
                      📥 接收方
                    </label>
                    <div style={{
                      fontFamily: 'monospace',
                      fontSize: '14px',
                      background: '#f0fff4',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #c6f6d5',
                      wordBreak: 'break-all',
                      color: '#38a169'
                    }}>
                      {formatAddress(tx.to?.address || '') || '合约创建'}
                    </div>
                  </div>
                </div>

                {/* 交易详情 */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '12px',
                  marginBottom: '12px'
                }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '12px',
                      color: '#666',
                      marginBottom: '4px',
                      fontWeight: '600'
                    }}>
                      💰 金额 (ETH)
                    </label>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#2d3748',
                      padding: '4px 0'
                    }}>
                      {formatEther(tx.value)}
                    </div>
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '12px',
                      color: '#666',
                      marginBottom: '4px',
                      fontWeight: '600'
                    }}>
                      🧱 区块号
                    </label>
                    <div style={{
                      fontSize: '14px',
                      color: '#4a5568',
                      fontFamily: 'monospace',
                      padding: '4px 0'
                    }}>
                      #{tx.blockNumber}
                    </div>
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '12px',
                      color: '#666',
                      marginBottom: '4px',
                      fontWeight: '600'
                    }}>
                      ⏰ 时间
                    </label>
                    <div style={{
                      fontSize: '14px',
                      color: '#4a5568',
                      padding: '4px 0'
                    }}>
                      {formatTimestamp(tx.timestamp)}
                    </div>
                  </div>
                </div>

                {/* 附言 */}
                {tx.message && (
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '12px',
                      color: '#666',
                      marginBottom: '4px',
                      fontWeight: '600'
                    }}>
                      💬 附言
                    </label>
                    <div style={{
                      fontSize: '14px',
                      background: '#ebf8ff',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #bee3f8',
                      color: '#2c5282',
                      wordBreak: 'break-word'
                    }}>
                      {tx.message}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            background: '#e3f2fd',
            color: '#1565c0',
            padding: '20px',
            borderRadius: '4px',
            textAlign: 'center'
          }}>
            <h4>📋 数据说明</h4>
            <p>当前显示的是智能合约 TransferRecord 事件记录</p>
            <p>这些是演示用的合约记录，不是实际的 ETH 转账交易</p>
            <p>如需显示真正的以太坊交易，请使用"交易查询"功能</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionList;