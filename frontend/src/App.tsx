import { useState } from 'react';
import { ApolloProvider } from '@apollo/client/react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apolloClient } from './apolloClient/client';
import { wagmiConfig } from './config/wagmi';
import TransactionQuery from './components/TransactionQuery';
import TransactionList from './components/TransactionList';
import AddressQuery from './components/AddressQuery';
import WalletTransfer from './components/WalletTransfer';
import ErrorBoundary from './components/ErrorBoundary';

// Create a react-query client
const queryClient = new QueryClient();

type TabType = 'transaction' | 'address' | 'wallet' | 'overview';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('transaction');
  const [pendingTxHash, setPendingTxHash] = useState<string>('');

  // Handle successful transfer - switch to transaction query tab and populate hash
  const handleTransferSuccess = (txHash: string) => {
    setPendingTxHash(txHash);
    setActiveTab('transaction');
  };

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <ApolloProvider client={apolloClient}>
          <div className="App" style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <header style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
          color: 'white',
          padding: '2rem 0',
          marginBottom: '2rem',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
        }}>
          <div className="container" style={{ textAlign: 'center' }}>
            <h1 style={{ 
              margin: 0, 
              fontSize: '2.5rem', 
              fontWeight: 'bold',
              textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
              marginBottom: '0.5rem'
            }}>
              🔍 Ethereum Sepolia 交易查询系统
            </h1>
            <p style={{ 
              margin: '0 0 1.5rem 0', 
              opacity: 0.9, 
              fontSize: '1.1rem',
              textShadow: '0 1px 5px rgba(0, 0, 0, 0.2)'
            }}>
              支持实时数据查询 | 无需等待同步
            </p>

            {/* Tab Navigation */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '10px',
              flexWrap: 'wrap',
              width: '100%'
            }}>
              <button
                onClick={() => setActiveTab('transaction')}
                style={{
                  padding: '12px 24px',
                  background: activeTab === 'transaction' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  color: 'white',
                  border: activeTab === 'transaction' ? '2px solid rgba(255, 255, 255, 0.4)' : '2px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '25px',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  fontSize: '16px',
                  fontWeight: '600',
                  backdropFilter: 'blur(5px)'
                }}
              >
                🔎 交易查询
              </button>
              <button
                onClick={() => setActiveTab('address')}
                style={{
                  padding: '12px 24px',
                  background: activeTab === 'address' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  color: 'white',
                  border: activeTab === 'address' ? '2px solid rgba(255, 255, 255, 0.4)' : '2px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '25px',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  fontSize: '16px',
                  fontWeight: '600',
                  backdropFilter: 'blur(5px)'
                }}
              >
                👤 地址查询
              </button>
              <button
                onClick={() => setActiveTab('wallet')}
                style={{
                  padding: '12px 24px',
                  background: activeTab === 'wallet' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  color: 'white',
                  border: activeTab === 'wallet' ? '2px solid rgba(255, 255, 255, 0.4)' : '2px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '25px',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  fontSize: '16px',
                  fontWeight: '600',
                  backdropFilter: 'blur(5px)'
                }}
              >
                💰 钱包转账
              </button>
              <button
                onClick={() => setActiveTab('overview')}
                style={{
                  padding: '12px 24px',
                  background: activeTab === 'overview' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  color: 'white',
                  border: activeTab === 'overview' ? '2px solid rgba(255, 255, 255, 0.4)' : '2px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '25px',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  fontSize: '16px',
                  fontWeight: '600',
                  backdropFilter: 'blur(5px)'
                }}
              >
                📊 数据概览
              </button>
            </div>
          </div>
        </header>

        <main className="container">
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            padding: '2rem',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
            minHeight: '400px',
            width: '100%'
          }}>
            <ErrorBoundary>
              {activeTab === 'transaction' && <TransactionQuery initialTxHash={pendingTxHash} onHashUsed={() => setPendingTxHash('')} />}
              {activeTab === 'address' && <AddressQuery />}
              {activeTab === 'wallet' && <WalletTransfer onTransactionSuccess={handleTransferSuccess} />}
              {activeTab === 'overview' && <TransactionList enabled={true} />}
            </ErrorBoundary>
          </div>
        </main>

        <footer style={{
          marginTop: '3rem',
          padding: '2rem 20px',
          textAlign: 'center',
          color: 'rgba(255, 255, 255, 0.8)',
          borderTop: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <p style={{ 
            margin: 0,
            textShadow: '0 1px 3px rgba(0, 0, 0, 0.3)'
          }}>
            🚀 技术栈: React + TypeScript + Wagmi + Ethers.js + Apollo Client + The Graph + Vite
          </p>
        </footer>
          </div>
        </ApolloProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}

export default App
