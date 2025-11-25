import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";
import { storage } from "./storage";
import { uploadToIPFS, getStorageMode } from "./lib/ipfs";
import { generateHash } from "./lib/hash";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  }
});

function getContractAddress(): string | null {
  if (process.env.CONTRACT_ADDRESS) {
    return process.env.CONTRACT_ADDRESS;
  }
  try {
    const configPath = path.join(process.cwd(), 'contract-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return config.address;
    }
  } catch (error) {
    console.log('No contract config found');
  }
  return null;
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Serve locally stored files (for local storage fallback)
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
  
  // GET /api/contract-address - Get deployed contract address for client
  app.get("/api/contract-address", (_req, res) => {
    const address = getContractAddress();
    res.json({ address });
  });
  
  // GET /api/status - Check service status
  app.get("/api/status", (_req, res) => {
    res.json({
      storageMode: getStorageMode(),
      hasPinataJwt: !!process.env.PINATA_JWT,
      hasWeb3Token: !!process.env.WEB3_STORAGE_TOKEN,
      hasPolygonKey: !!process.env.POLYGON_PRIVATE_KEY,
      hasContractAddress: !!getContractAddress(),
    });
  });
  
  // GET /api/records - Fetch all verified news records
  app.get("/api/records", async (_req, res) => {
    try {
      const records = await storage.getAllRecords();
      res.json(records);
    } catch (error) {
      console.error("Error fetching records:", error);
      res.status(500).json({ 
        error: "Failed to fetch records",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // POST /api/prepare-upload - Upload to IPFS and generate hash (client will handle blockchain)
  app.post("/api/prepare-upload", upload.single('file'), async (req, res) => {
    try {
      const { text } = req.body;
      const file = req.file;

      if (!text || !file) {
        return res.status(400).json({ 
          error: "Missing required fields",
          message: "Both text and file are required"
        });
      }

      // 1. Upload file to IPFS
      console.log('📤 Uploading to IPFS...');
      const cid = await uploadToIPFS(file.buffer, file.originalname);
      console.log('✅ IPFS upload complete:', cid);
      
      // 2. Generate timestamp
      const timestamp = new Date().toISOString();
      
      // 3. Generate SHA-256 hash
      const hash = generateHash(text, cid, timestamp);
      console.log('🔐 Hash generated:', hash.substring(0, 16) + '...');

      // Return data for client-side blockchain signing
      res.json({
        success: true,
        cid,
        hash,
        timestamp,
        fileName: file.originalname,
        fileType: file.mimetype,
      });
      
    } catch (error) {
      console.error("Prepare upload error:", error);
      res.status(500).json({ 
        error: "Upload preparation failed",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // POST /api/save-record - Save record after client-side blockchain transaction
  app.post("/api/save-record", async (req, res) => {
    try {
      const { text, cid, hash, tx, fileName, fileType, timestamp, walletAddress } = req.body;

      if (!text || !cid || !hash || !tx || !timestamp) {
        return res.status(400).json({ 
          error: "Missing required fields",
          message: "All fields are required"
        });
      }

      // Verify the hash is correct
      const expectedHash = generateHash(text, cid, timestamp);
      if (expectedHash !== hash) {
        return res.status(400).json({ 
          error: "Hash verification failed",
          message: "The provided hash does not match the content"
        });
      }

      // Check for duplicate records
      const existingRecords = await storage.getAllRecords();
      const isDuplicate = existingRecords.some(r => r.hash === hash || r.tx === tx);
      if (isDuplicate) {
        return res.status(409).json({
          error: "Duplicate record",
          message: "This content has already been verified"
        });
      }

      // Verify the transaction on-chain with event log decoding
      const contractAddr = getContractAddress();
      if (contractAddr) {
        const { ethers } = await import('ethers');
        const provider = new ethers.JsonRpcProvider('https://polygon-rpc.com/');
        
        const receipt = await provider.getTransactionReceipt(tx);
        
        if (!receipt) {
          return res.status(400).json({
            error: "Transaction verification failed",
            message: "Transaction not found on blockchain"
          });
        }
        
        if (receipt.status === 0) {
          return res.status(400).json({
            error: "Transaction verification failed", 
            message: "Transaction failed on blockchain"
          });
        }
        
        if (receipt.to?.toLowerCase() !== contractAddr.toLowerCase()) {
          return res.status(400).json({
            error: "Transaction verification failed",
            message: "Transaction was not sent to the TruthChain contract"
          });
        }

        // Decode RecordStored event from logs
        const eventSignature = ethers.id("RecordStored(bytes32,string,address,uint256)");
        const recordStoredLog = receipt.logs.find(
          log => log.topics[0] === eventSignature && 
                 log.address.toLowerCase() === contractAddr.toLowerCase()
        );

        if (!recordStoredLog) {
          return res.status(400).json({
            error: "Event verification failed",
            message: "RecordStored event not found in transaction"
          });
        }

        // Verify the hash in the event matches
        const eventHash = recordStoredLog.topics[1];
        const expectedHashBytes32 = '0x' + hash.replace(/^0x/, '').toLowerCase();
        
        if (eventHash?.toLowerCase() !== expectedHashBytes32) {
          return res.status(400).json({
            error: "Hash mismatch",
            message: "The hash in the blockchain event does not match"
          });
        }

        // Verify the submitter matches the wallet address
        if (walletAddress) {
          const eventSubmitter = '0x' + recordStoredLog.topics[2]?.slice(-40);
          if (eventSubmitter.toLowerCase() !== walletAddress.toLowerCase()) {
            return res.status(400).json({
              error: "Submitter mismatch",
              message: "The transaction was not submitted by the provided wallet"
            });
          }
        }
        
        console.log('✅ Transaction and event verified on-chain:', tx);
      }

      // Save to database
      const record = await storage.createRecord({
        text,
        cid,
        hash,
        tx,
        fileName: fileName || 'unknown',
        fileType: fileType || 'application/octet-stream',
        timestamp,
        walletAddress: walletAddress || null,
      });

      console.log('✅ Record saved:', record.id);

      res.json({
        success: true,
        record,
      });
      
    } catch (error) {
      console.error("Save record error:", error);
      res.status(500).json({ 
        error: "Save failed",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
