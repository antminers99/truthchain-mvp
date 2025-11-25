# TruthChain MVP

**Decentralized News Verification Platform**

An open-source platform that verifies news authenticity using IPFS storage and Polygon blockchain technology with MetaMask wallet integration.

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Polygon](https://img.shields.io/badge/Polygon-Mainnet-purple.svg)
![IPFS](https://img.shields.io/badge/IPFS-Web3.Storage-blue.svg)

---

## Live Demo

**Try it now:** [https://truthchain.replit.app/](https://truthchain.replit.app/)

---

## Screenshots

### Homepage - Connect Wallet
![Homepage](https://via.placeholder.com/800x500.png?text=TruthChain+Homepage+-+Connect+Your+MetaMask+Wallet)

*Connect your MetaMask wallet to start verifying news on the blockchain*

### Upload News for Verification
![Upload Form](https://via.placeholder.com/800x500.png?text=Upload+Form+-+Submit+News+with+Media+Files)

*Submit news content with supporting images or videos for permanent verification*

### Verified Records Table
![Records Table](https://via.placeholder.com/800x500.png?text=Verified+Records+-+Blockchain+Proof+with+IPFS+Links)

*View all verified records with IPFS links, transaction hashes, and verification status*

---

## What is TruthChain?

TruthChain is a decentralized news verification platform where users connect their own MetaMask wallets to create immutable, verifiable records of news content. When users submit news with supporting media:

1. **Upload** media files to IPFS (Web3.Storage) for permanent, decentralized storage
2. **Generate** a SHA-256 cryptographic hash of the news package (text + IPFS CID + timestamp)
3. **Sign** the blockchain transaction with MetaMask (users pay their own gas fees)
4. **Record** the verification hash on the Polygon blockchain for immutable proof
5. **Store** metadata in PostgreSQL database for fast querying

This creates a tamper-proof, verifiable record of news content that can be independently validated.

---

## Key Features

- **MetaMask Integration** - Connect your own wallet, control your transactions
- **User-Paid Gas Fees** - Complete decentralization with no server-side signing
- **IPFS Storage** - Permanent, decentralized media storage via Web3.Storage
- **Polygon Mainnet** - Fast, low-cost blockchain verification
- **Event Verification** - Server validates blockchain events before saving
- **Duplicate Prevention** - Database constraints prevent duplicate records

---

## How It Works

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     User Browser                             │
│  ┌───────────────┐    ┌─────────────────────────────────┐   │
│  │   React App   │────│        MetaMask Wallet          │   │
│  │  (Frontend)   │    │   (Transaction Signing)         │   │
│  └───────┬───────┘    └─────────────┬───────────────────┘   │
└──────────┼──────────────────────────┼───────────────────────┘
           │                          │
           ▼                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend API (Express)                     │
│  ┌──────────────┐  ┌────────────────┐  ┌────────────────┐   │
│  │    IPFS      │  │   PostgreSQL   │  │   Event        │   │
│  │   Upload     │  │    Database    │  │   Verifier     │   │
│  └──────────────┘  └────────────────┘  └────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Polygon Mainnet                           │
│                  TruthChain Smart Contract                   │
│              0x8473fCf963A0b71994F16dFba2DeE53993377316      │
└─────────────────────────────────────────────────────────────┘
```

### Verification Flow

1. **User connects** MetaMask wallet to the app
2. **Network validation** ensures user is on Polygon Mainnet (chainId: 137)
3. **User submits** news text + media file (image/video)
4. **Server prepares** by uploading media to IPFS and generating SHA-256 hash
5. **User signs** the blockchain transaction in MetaMask
6. **User pays** gas fees from their own wallet (MATIC/POL)
7. **Transaction confirmed** on Polygon blockchain
8. **Server verifies** the transaction receipt and decodes RecordStored event
9. **Server validates** hash, CID, and submitter from event logs
10. **Record saved** to PostgreSQL with wallet address

---

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (provided by Replit)
- Web3.Storage account and API token
- MetaMask browser extension with MATIC for gas fees

### Environment Variables

Create a `.env` file or use Replit Secrets:

```bash
# Required
DATABASE_URL=postgresql://...           # PostgreSQL connection
WEB3_STORAGE_TOKEN=your_token_here     # From https://web3.storage
SESSION_SECRET=random_secret_string    # For session management

# Auto-configured by Replit
PGHOST=...
PGPORT=5432
PGUSER=...
PGPASSWORD=...
PGDATABASE=...
```

### Installation

```bash
# Install dependencies
npm install

# Push database schema
npm run db:push

# Start development server
npm run dev
```

The app will be available at `http://localhost:5000`

### Getting Web3.Storage Token

1. Go to [web3.storage](https://web3.storage)
2. Create a free account
3. Generate an API token
4. Add to your environment as `WEB3_STORAGE_TOKEN`

### Getting MATIC for Gas Fees

1. Install MetaMask browser extension
2. Add Polygon network or switch to Polygon Mainnet
3. Purchase MATIC/POL from an exchange and send to your wallet
4. You only need a small amount (~$0.10 USD) for several transactions

---

## API Documentation

### `GET /api/records`

Fetch all verified news records.

**Response:**
```json
[
  {
    "id": "uuid",
    "text": "News content...",
    "cid": "bafybei...",
    "hash": "0xa1b2c3...",
    "tx": "0x1234...",
    "fileName": "image.jpg",
    "fileType": "image/jpeg",
    "timestamp": "2024-01-15T10:30:00Z",
    "walletAddress": "0xAbCd..."
  }
]
```

### `POST /api/prepare-upload`

Prepare news for blockchain verification (IPFS upload + hash generation).

**Request (multipart/form-data):**
- `text` (string): News content
- `file` (file): Media file (JPG, PNG, GIF, MP4, WebM)

**Response:**
```json
{
  "success": true,
  "cid": "bafybei...",
  "hash": "0xa1b2c3d4e5f...",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "fileName": "image.jpg",
  "fileType": "image/jpeg"
}
```

### `POST /api/save-record`

Save verified record after blockchain transaction.

**Request (JSON):**
```json
{
  "text": "News content...",
  "cid": "bafybei...",
  "hash": "0xa1b2c3...",
  "tx": "0x1234...",
  "fileName": "image.jpg",
  "fileType": "image/jpeg",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "walletAddress": "0xAbCd..."
}
```

**Response:**
```json
{
  "success": true,
  "record": { ... }
}
```

---

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Shadcn UI** component library
- **TanStack Query** for data fetching
- **Wouter** for routing
- **ethers.js** for MetaMask integration
- **Lucide React** for icons

### Backend
- **Node.js + Express** REST API
- **PostgreSQL** with Drizzle ORM
- **Multer** for file uploads
- **ethers.js** for blockchain verification
- **Web3.Storage** SDK for IPFS

### Blockchain
- **Polygon Mainnet** (chainId: 137)
- **Solidity 0.8.x** smart contract
- **TruthChain.sol** - verification contract

---

## Project Structure

```
truthchain/
├── client/                  # Frontend React app
│   ├── src/
│   │   ├── components/     # UI components (WalletButton, etc.)
│   │   ├── contexts/       # WalletContext for MetaMask state
│   │   ├── pages/          # Page components (home.tsx)
│   │   ├── lib/            # Utilities
│   │   └── hooks/          # Custom React hooks
│   └── index.html
├── server/                  # Backend Express server
│   ├── lib/
│   │   ├── ipfs.ts        # IPFS/Web3.Storage integration
│   │   ├── blockchain.ts  # Contract ABI for verification
│   │   └── hash.ts        # SHA-256 utilities
│   ├── routes.ts          # API endpoints
│   └── storage.ts         # Database interface
├── contracts/              # Smart contracts
│   └── TruthChain.sol     # Verification contract
├── contract-config.json   # Deployed contract address
├── shared/                 # Shared types/schemas
│   └── schema.ts          # Database schema
└── README.md              # This file
```

---

## Smart Contract

### TruthChain.sol

Deployed on Polygon Mainnet at: `0x8473fCf963A0b71994F16dFba2DeE53993377316`

```solidity
contract TruthChain {
    event RecordStored(bytes32 indexed hash, string cid, address indexed submitter);
    
    mapping(bytes32 => bool) public records;
    
    function storeRecord(bytes32 hash, string memory cid) public {
        require(!records[hash], "Record already exists");
        records[hash] = true;
        emit RecordStored(hash, cid, msg.sender);
    }
}
```

**Features:**
- Stores hash + IPFS CID mapping
- Prevents duplicate records
- Emits events with submitter address
- Minimal gas costs (~30,000 gas per record)

---

## Security Features

### Current Implementation

- **Client-side signing** - No server private key, users control transactions
- **Event verification** - Server decodes RecordStored events using ABI
- **Hash validation** - Proper bytes32 formatting with ethers.getBytes/hexlify
- **Duplicate prevention** - Database unique constraints on hash and tx
- **Network validation** - Only accepts Polygon Mainnet transactions
- **Submitter verification** - Validates wallet address from event logs

### MVP Limitations

- No rate limiting on uploads
- No content moderation system
- Basic error handling
- No user authentication

---

## Roadmap

### Phase 1: MVP (Complete)
- [x] MetaMask wallet integration
- [x] IPFS file upload (Web3.Storage)
- [x] SHA-256 hash generation
- [x] Client-side transaction signing
- [x] Polygon Mainnet deployment
- [x] Event log verification
- [x] PostgreSQL persistence
- [x] English UI

### Phase 2: Enhanced Features
- [ ] User authentication
- [ ] Personal dashboards
- [ ] Record search and filtering
- [ ] Rate limiting

### Phase 3: Community Features
- [ ] Fact-checking voting
- [ ] Source reputation scores
- [ ] Browser extension
- [ ] Mobile app

### Phase 4: Full Decentralization
- [ ] Multi-chain support
- [ ] DAO governance
- [ ] Token incentives

---

## Contributing

We welcome contributions! Here's how to get started:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to the branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Use existing component patterns (Shadcn UI)
- Add proper error handling
- Test with MetaMask on Polygon Mainnet
- Write clear commit messages

---

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- **Web3.Storage** for decentralized file storage
- **Polygon** for scalable blockchain infrastructure
- **MetaMask** for wallet integration
- **Shadcn UI** for beautiful components
- **Drizzle ORM** for type-safe database queries

---

## Support

- **Live Demo:** [https://truthchain.replit.app/](https://truthchain.replit.app/)
- **Issues:** [GitHub Issues](https://github.com/yourusername/truthchain/issues)

---

**Built for a more transparent internet**

*TruthChain MVP - Decentralized News Verification*
