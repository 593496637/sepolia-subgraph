# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Frontend Development
```bash
cd frontend
pnpm install    # Install dependencies
pnpm dev        # Start development server (http://localhost:5176)
pnpm build      # Build for production
pnpm lint       # Run ESLint code checks
```

### Subgraph Development
```bash
cd subgraph
pnpm install    # Install dependencies
pnpm codegen    # Generate TypeScript types from GraphQL schema
pnpm build      # Build the subgraph
pnpm deploy     # Deploy to The Graph Studio
pnpm typecheck  # Type checking (codegen + build)
pnpm clean      # Clean generated files
```

### Testing and Validation
- No specific test commands are configured - always check package.json scripts before assuming test frameworks
- Use `pnpm lint` in frontend for code quality checks
- Use `pnpm typecheck` in subgraph for type validation

## Project Architecture

This is a Web3 educational project demonstrating **direct RPC queries vs The Graph indexing** for Ethereum data retrieval.

### Core Structure

**Frontend (`/frontend`)**:
- **Tech Stack**: React 19 + TypeScript + Vite + Wagmi + Apollo Client
- **Key Services**: 
  - `ethereumService.ts`: Multi-RPC provider service with failover mechanism
  - `wagmi.ts`: Wallet connection configuration (MetaMask support)
  - `apolloClient/client.ts`: GraphQL client for The Graph queries
- **Components**: Modular React components for transaction queries, wallet interaction, and data comparison

**Subgraph (`/subgraph`)**:
- **Purpose**: Index smart contract events using The Graph Protocol
- **Schema**: Tracks `TransferRecord` and `Account` entities from contract events
- **Mapping**: Processes `SimpleTransferContract` events on Sepolia testnet
- **Deployment**: Deployed to The Graph Studio with endpoint for GraphQL queries

**Smart Contract**:
- **Address**: `0x830B796F55E6A3f86E924297e510B24192A0Ba1c` (Sepolia)
- **Purpose**: Emits `TransferRecord` events for demonstration (no real ETH transfers)
- **Start Block**: `9053891`

### Data Flow Architecture

1. **User Interaction** → Frontend React components
2. **Wallet Connection** → Wagmi + MetaMask integration
3. **Data Queries**:
   - **Direct RPC**: `ethereumService.ts` with multi-provider failover
   - **Indexed Data**: Apollo Client → The Graph GraphQL API
4. **Smart Contract**: Events trigger both real-time RPC updates and The Graph indexing

### Key Technical Patterns

**Multi-RPC Provider Pattern** (`ethereumService.ts`):
- Automatic failover across multiple Sepolia RPC endpoints
- 10-second timeout with provider rotation
- Maintains state of successful providers for performance

**Dual Data Source Pattern**:
- Compare performance: RPC (real-time, slow) vs The Graph (fast, ~30s delay)
- Educational focus on trade-offs between different data access patterns

**Event-Driven Architecture**:
- Smart contract emits structured events
- The Graph indexes these events for efficient querying
- Frontend demonstrates both query approaches side-by-side

### Network Configuration

- **Target Network**: Sepolia Testnet only
- **Chain ID**: 11155111
- **RPC Endpoints**: Multiple public endpoints with automatic failover
- **Subgraph Endpoint**: `https://api.studio.thegraph.com/query/119398/sepolia-transactions/v1.1.1`

## Key Features

### Transfer Message Support
**NEW**: The application now supports transfer messages/memos in transactions.

**Implementation Details**:
- **Encoding**: Messages are encoded to hex format using `hexUtils.str2hex()` before sending
- **Storage**: Messages are stored in transaction `data` field on blockchain
- **Decoding**: Frontend automatically decodes hex data back to readable messages using `hexUtils.hex2str()`
- **Unicode Support**: Full support for Chinese characters, Emoji, and all Unicode characters

**Usage**:
1. **Adding Messages**: Use the message textarea in WalletTransfer component
2. **Viewing Messages**: Messages are automatically decoded and displayed in transaction details
3. **Gas Estimation**: UI shows estimated gas cost impact of message length

**Technical Implementation**:
- `utils/hexUtils.ts`: Core encoding/decoding utilities
- `WalletTransfer.tsx`: Message input with gas estimation
- `TransactionQuery.tsx`: Message decoding and display
- `ethereumService.ts`: Enhanced to capture transaction `data` field

### UI/UX Optimization
**LATEST**: Complete interface redesign with focus on complete information display.

**Key Features**:
- **Complete Address Display**: Full 42-character Ethereum addresses visible (no truncation)
- **Complete Hash Display**: Full 66-character transaction and block hashes visible
- **Card-based Layout**: Modern card design replacing traditional table layouts
- **Responsive Design**: Perfect adaptation for mobile, tablet, and desktop screens
- **Color Coding**: Semantic colors (sender=red, receiver=green) for better readability

**Layout Improvements**:
- **Information Hierarchy**: Clear visual grouping and structured information display
- **Auto-wrapping**: Smart text wrapping ensures all content is visible
- **Copy-friendly**: Complete addresses and hashes easy to select and copy
- **Touch Optimization**: Mobile-friendly tap targets and interactions
- **Loading States**: Enhanced feedback for all async operations

**Technical Implementation**:
- **CSS Grid**: Responsive grid system with auto-fit columns
- **Word Break**: `word-break: break-all` for address/hash display
- **Monospace Font**: Fixed-width fonts for addresses and hashes
- **Flexbox**: Flexible layouts that adapt to content
- **Media Queries**: Mobile-first responsive breakpoints

### Web3 Technology Stack
**COMPREHENSIVE**: Detailed explanations of all core Web3 technologies used in this project.

**Documentation**: `docs/10-Web3技术栈详解.md` - Essential reading for beginners

**Covered Technologies**:
- **Ethers.js**: Complete Ethereum JavaScript library guide with examples
- **The Graph**: Decentralized data indexing explanation and Subgraph development
- **Wagmi**: React Web3 Hooks integration with practical code snippets
- **GraphQL**: Query language fundamentals and usage patterns
- **Viem**: Modern Ethereum library with TypeScript safety features

**Learning Path**: Step-by-step progression from basic concepts to advanced integration patterns

## Important Notes

- This is an **educational project** - smart contract doesn't transfer real ETH
- All transaction records are demonstration data stored on Sepolia testnet
- The Graph indexing has ~30-60 second delay vs real-time RPC queries
- Multi-RPC setup provides resilience against individual node failures
- **Transfer messages** are encoded as hex data in transaction data field
- Extensive Chinese documentation available in `/docs` directory