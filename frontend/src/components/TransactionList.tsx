import React from 'react';
import { useTransactionsQuery, useBlocksQuery, useMetaQuery } from '../hooks/useTransactionQuery';

interface Account {
  address: string;
}

interface Transaction {
  id: string;
  hash: string;
  from: Account;
  to?: Account;
  value: string;
  gasUsed: string;
  gasPrice: string;
  blockNumber: string;
  timestamp: string;
  status: string;
}

interface Block {
  id: string;
  number: string;
  hash: string;
  timestamp: string;
  gasUsed: string;
  gasLimit: string;
  transactionCount: string;
}

interface TransactionListProps {
  enabled?: boolean;
}

const TransactionList: React.FC<TransactionListProps> = ({ enabled = true }) => {
  const { data, loading, error } = useTransactionsQuery(20, 0, enabled);
  const { data: blockData, loading: blockLoading, error: blockError } = useBlocksQuery(10, 0, enabled);
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

  const truncateAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const truncateHash = (hash: string): string => {
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

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
    <div>
      <h2 style={{ 
        textAlign: 'center', 
        marginBottom: '2rem',
        color: '#333',
        fontSize: '1.8rem'
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
      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ 
          color: '#495057',
          fontSize: '1.4rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
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
        
        {blockLoading && <p>加载区块数据中...</p>}
        {blockError && (
          <div style={{
            background: '#ffebee',
            color: '#c62828',
            padding: '10px',
            borderRadius: '4px'
          }}>
            区块数据错误: {blockError.message}
          </div>
        )}
        
        {blockData?.blocks && blockData.blocks.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              background: 'white',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>区块号</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>区块哈希</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Gas 使用量</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Gas 限制</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>交易数量</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>时间</th>
                </tr>
              </thead>
              <tbody>
                {blockData.blocks.map((block: Block, index: number) => (
                  <tr key={block.id} style={{ 
                    borderBottom: '1px solid #eee',
                    background: index % 2 === 0 ? '#fff' : '#fafafa'
                  }}>
                    <td style={{ padding: '12px' }}>
                      {block.number}
                    </td>
                    <td style={{ padding: '12px', fontFamily: 'monospace' }}>
                      {truncateHash(block.hash)}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {parseInt(block.gasUsed).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {parseInt(block.gasLimit).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {block.transactionCount}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {formatTimestamp(block.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{
            background: '#fff3cd',
            color: '#856404',
            padding: '20px',
            borderRadius: '4px',
            textAlign: 'center'
          }}>
            暂无区块记录
          </div>
        )}
      </div>

      {/* Transactions section */}
      <div>
        <h3 style={{ 
          color: '#495057',
          fontSize: '1.4rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          💳 交易记录 <span style={{ 
            background: '#dc3545',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '12px',
            fontSize: '0.8rem',
            fontWeight: '600'
          }}>待配置</span>
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

        {data?.transactions && data.transactions.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              background: 'white',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>交易哈希</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>发送方</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>接收方</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>金额 (ETH)</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>区块号</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>时间</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>状态</th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((tx: Transaction, index: number) => (
                  <tr key={tx.id} style={{ 
                    borderBottom: '1px solid #eee',
                    background: index % 2 === 0 ? '#fff' : '#fafafa'
                  }}>
                    <td style={{ padding: '12px', fontFamily: 'monospace' }}>
                      {truncateHash(tx.hash)}
                    </td>
                    <td style={{ padding: '12px', fontFamily: 'monospace' }}>
                      {truncateAddress(tx.from.address)}
                    </td>
                    <td style={{ padding: '12px', fontFamily: 'monospace' }}>
                      {tx.to ? truncateAddress(tx.to.address) : '合约创建'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {formatEther(tx.value)}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {tx.blockNumber}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {formatTimestamp(tx.timestamp)}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        background: tx.status === '1' ? '#d4edda' : '#f8d7da',
                        color: tx.status === '1' ? '#155724' : '#721c24'
                      }}>
                        {tx.status === '1' ? '成功' : '失败'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{
            background: '#e3f2fd',
            color: '#1565c0',
            padding: '20px',
            borderRadius: '4px',
            textAlign: 'center'
          }}>
            <h4>⚠️ 交易数据索引问题</h4>
            <p>当前 Subgraph 配置只索引区块数据，不包含交易记录。</p>
            <p>需要重新配置 Subgraph 以支持交易索引功能。</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionList;