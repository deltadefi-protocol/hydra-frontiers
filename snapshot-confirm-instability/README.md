# Snapshot Confirm Instability

## Root Cause

**Two coupled problems:**

| Problem | Description |
|---------|-------------|
| **No backpressure** | Accepts txs faster than confirmable → unbounded queue growth |
| **Coupled processing** | Consensus (ReqSn/AckSn) blocked behind tx queue → starvation |

```
Load > Capacity → Queue explodes → Consensus starves → COMPLETE STALL

This happens at ANY capacity:
  - 10 TPS capacity + 15 TPS load → stall
  - 100 TPS capacity + 150 TPS load → stall
  - 1000 TPS capacity + 1500 TPS load → stall
```

## Key Code Locations

| File | Issue |
|------|-------|
| `hydra-node/src/Hydra/Node/InputQueue.hs` | Unbounded TQueue, no backpressure |
| `hydra-node/src/Hydra/Node.hs:294` | Single sequential loop |
| `hydra-node/src/Hydra/HeadLogic.hs:484` | WaitOnTxs stall |

## Solution: Two Parts

### Part 1: Backpressure (Prevent Overload)

```
Current:  [NewTx] → [Unbounded Queue] → Accept all → Explode

Fixed:    [NewTx] → [Bounded Queue] → Reject when full
                         │
                         └─► Return 503 "Busy" or rate limit
```

### Part 2: Decoupling (Graceful Degradation)

```
Current:  [All Events] → [Single Queue] → Consensus starves

Fixed:    [NewTx] → [Tx Queue] ──► [Mempool TVar] ◄── [Consensus Queue]

          Tx processing and consensus run independently
```

## Expected Behavior After Fix

| Scenario | Before | After |
|----------|--------|-------|
| Load < Capacity | Works | Works |
| Load > Capacity | **Complete stall** | Rejects excess, continues working |
| Recovery | Manual intervention | Automatic when load drops |

## Evidence Collection

```bash
grep -E "(WaitOnTxs|WaitOnSnapshotNumber)" hydra-node.log  # Stall indicator
```

## References

- [Cardano Mempool (bounded, backpressure)](https://ouroboros-consensus.cardano.intersectmbo.org/)
- [Ouroboros STM Discussion](https://github.com/input-output-hk/ouroboros-network/issues/786)
