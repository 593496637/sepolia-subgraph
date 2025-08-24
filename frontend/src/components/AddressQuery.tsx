import React, { useState } from 'react';
import { ethereumService } from '../services/ethereumService';

interface Transaction {
  id: string;
  hash: string;
  from: { address: string };
  to: { address: string } | null;
  value: string;
  gasUsed: string;
  gasPrice: string;
  blockNumber: string;
  timestamp: string;
  status: string;
  transactionIndex: string;
}

const AddressQuery: React.FC = () => {
  const [address, setAddress] = useState<string>('');
  const [searchAddress, setSearchAddress] = useState<string>('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return;

    setLoading(true);
    setError('');
    setTransactions([]);
    
    try {
      const searchAddr = address.toLowerCase();
      setSearchAddress(searchAddr);
      
      console.log('Searching transactions for address:', searchAddr);
      const txs = await ethereumService.getTransactionsByAddress(searchAddr, 20);
      if (txs) {
        setTransactions(txs);
        
        if (txs.length === 0) {
          setError('未找到该地址的交易记录，可能该地址没有交易或需要搜索更多区块');
        }
      }
    } catch (err) {
      console.error('Address search error:', err);
      setError(err instanceof Error ? err.message : '查询失败');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setAddress('');
    setSearchAddress('');
    setTransactions([]);
    setError('');
  };

  const formatEther = (wei: string): string => {
    try {
      const weiNum = BigInt(wei);
      const etherValue = Number(weiNum) / Math.pow(10, 18);
      return etherValue.toFixed(6);
    } catch {
      return '0.000000';
    }
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(parseInt(timestamp) * 1000);
    return date.toLocaleString();
  };

  const truncateAddress = (addr: string): string => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const truncateHash = (hash: string): string => {
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  return (
    <div>
      <h2 style={{ 
        textAlign: 'center', 
        marginBottom: '2rem',
        color: '#333',
        fontSize: '1.8rem'
      }}>👤 钱包地址查询</h2>

      <form onSubmit={handleSearch} style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="输入钱包地址 (0x...)"
            style={{
              flex: 1,
              minWidth: '300px',
              padding: '15px',
              border: '2px solid #e9ecef',
              borderRadius: '12px',
              fontSize: '16px',
              outline: 'none',
              transition: 'border-color 0.3s, box-shadow 0.3s'
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
            disabled={loading || !address.trim()}
            style={{
              padding: '15px 25px',
              background: loading || !address.trim() ? '#6c757d' : 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: loading || !address.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s',
              fontSize: '16px',
              fontWeight: '600',
              minWidth: '120px',
              boxShadow: loading || !address.trim() ? 'none' : '0 4px 15px rgba(40, 167, 69, 0.4)'
            }}
          >
            {loading ? '搜索中...' : '搜索交易'}
          </button>
          {(address || searchAddress) && (
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
          <p style={{ margin: 0, color: '#666' }}>🔍 正在搜索最近1000个区块中的交易记录...</p>
        </div>
      )}

      {error && (
        <div style={{
          background: '#ffebee',
          color: '#c62828',
          padding: '15px',
          borderRadius: '12px',
          marginBottom: '20px',
          border: '1px solid #ffcdd2'
        }}>
          <strong>❌ 错误:</strong> {error}
        </div>
      )}

      {searchAddress && !loading && transactions.length === 0 && !error && (
        <div style={{
          background: '#fff3cd',
          color: '#856404',
          padding: '15px',
          borderRadius: '12px',
          marginBottom: '20px',
          border: '1px solid #ffeaa7'
        }}>
          <strong>⚠️ 未找到交易记录</strong>
          <p style={{ margin: '10px 0 0 0', fontSize: '14px' }}>
            搜索地址: <code style={{ background: '#fff', padding: '2px 6px', borderRadius: '4px' }}>{searchAddress}</code>
          </p>
        </div>
      )}

      {transactions.length > 0 && (
        <div>
          <div style={{
            background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
            color: 'white',
            padding: '15px',
            borderRadius: '12px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: 0 }}>
              📋 找到 {transactions.length} 条交易记录
            </h3>
            <p style={{ margin: '5px 0 0 0', opacity: 0.9 }}>
              地址: <code style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '4px' }}>
                {truncateAddress(searchAddress)}
              </code>
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              background: 'white',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>交易哈希</th>
                  <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>方向</th>
                  <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>对方地址</th>
                  <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>金额 (ETH)</th>
                  <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>区块号</th>
                  <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>时间</th>
                  <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>状态</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, index) => {
                  const isReceived = tx.to?.address.toLowerCase() === searchAddress.toLowerCase();
                  const counterparty = isReceived ? tx.from.address : (tx.to?.address || '合约创建');
                  
                  return (
                    <tr key={tx.id} style={{ 
                      borderBottom: '1px solid #eee',
                      background: index % 2 === 0 ? '#fff' : '#fafafa'
                    }}>
                      <td style={{ padding: '15px', fontFamily: 'monospace', fontSize: '14px' }}>
                        <a 
                          href={`https://sepolia.etherscan.io/tx/${tx.hash}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ color: '#007bff', textDecoration: 'none' }}
                        >
                          {truncateHash(tx.hash)}
                        </a>
                      </td>
                      <td style={{ padding: '15px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: isReceived ? '#d4edda' : '#fff3cd',
                          color: isReceived ? '#155724' : '#856404'
                        }}>
                          {isReceived ? '📥 接收' : '📤 发送'}
                        </span>
                      </td>
                      <td style={{ padding: '15px', fontFamily: 'monospace', fontSize: '14px' }}>
                        {counterparty === '合约创建' ? (
                          <span style={{ color: '#6c757d', fontStyle: 'italic' }}>合约创建</span>
                        ) : (
                          <a 
                            href={`https://sepolia.etherscan.io/address/${counterparty}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ color: '#007bff', textDecoration: 'none' }}
                          >
                            {truncateAddress(counterparty)}
                          </a>
                        )}
                      </td>
                      <td style={{ padding: '15px', fontWeight: '600' }}>
                        {formatEther(tx.value)}
                      </td>
                      <td style={{ padding: '15px' }}>
                        <a 
                          href={`https://sepolia.etherscan.io/block/${tx.blockNumber}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ color: '#007bff', textDecoration: 'none' }}
                        >
                          {tx.blockNumber}
                        </a>
                      </td>
                      <td style={{ padding: '15px', fontSize: '14px' }}>
                        {formatTimestamp(tx.timestamp)}
                      </td>
                      <td style={{ padding: '15px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: tx.status === '1' ? '#d4edda' : '#f8d7da',
                          color: tx.status === '1' ? '#155724' : '#721c24'
                        }}>
                          {tx.status === '1' ? '✅ 成功' : '❌ 失败'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddressQuery;