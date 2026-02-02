# Hydra Node Stress Test

A stress testing tool for [Hydra](https://hydra.family/) nodes. Submits batched transactions at configurable rates to measure throughput and latency.

## Overview

This tool:

1. Runs a local Hydra node in offline mode via Docker
2. Signs pre-built transactions using MeshSDK
3. Submits transactions in parallel batches at configurable rates
4. Records response times and status codes to JSON

## Prerequisites

- Docker
- Node.js

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

## Usage

### 1. Start Hydra Node

```bash
docker compose up
```

This starts a Hydra node (v1.2.0) in offline mode with:

- API endpoint: `http://127.0.0.1:4009`
- Initial UTxO set from `config/utxo.json`
- Protocol parameters from `config/protocol-parameters.json`

### 2. Configure Request Rate

Edit `src/index.ts` line 14:

```typescript
const REQUEST_PER_SECOND = 100;
```

### 3. Run Stress Test

```bash
npm start
```

### 4. View Results

Results are saved to `./result/batch-{REQUEST_PER_SECOND}.json` with the following structure:

```json
[
  {
    "order": 0,
    "batchNum": 1,
    "txHash": "abc123...",
    "status": 200,
    "elapsedMs": 12.34
  }
]
```

Also can check `docker stats` -> showing the memory [memory-bloat](../memory-bloat/) issue as well:

It eats up 1GB memory by only submitting 140 txs
![image](./image.png)
