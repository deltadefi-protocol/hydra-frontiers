# Hydra Memory Bloat Issue

## Problem

Hydra nodes exhaust 4GB memory allocation with only ~2,300 UTXOs in the head.

## Observed Metrics

| Resource                     | Value           |
| ---------------------------- | --------------- |
| UTXOs in snapshot            | 2,327           |
| Snapshot file size           | 5.2 MB          |
| State file sizes             | 600 MB - 1.1 GB |
| Hydra node memory (alice)    | 2,865 MB        |
| Hydra node memory (bob)      | 2,534 MB        |
| Hydra node memory (david)    | 2,513 MB        |
| Persistence storage per node | ~6 GB           |

## Memory Characteristics

- **Memory per UTXO**: ~1.1 MB (2,600 MB / 2,327 UTXOs)
- **State serialization overhead**: ~430x snapshot size (1 GB state vs 5.2 MB snapshot)

## Scalability Impact

| Target Users | UTXOs (50/user) | Estimated Memory | Feasibility   |
| ------------ | --------------- | ---------------- | ------------- |
| 40           | 2,000           | ~2.2 GB          | Current limit |
| 100          | 5,000           | ~5.5 GB          | Requires 8 GB |
| 1,000        | 50,000          | ~55 GB           | Impractical   |
| 4,000        | 200,000         | ~220 GB          | Infeasible    |

## Root Cause

Hydra maintains full UTXO state in memory with high per-UTXO overhead. The in-memory representation is orders of magnitude larger than the serialized snapshot.

## Conclusion

Current architecture cannot scale beyond ~50 users per Hydra head with practical memory limits. Addressing this requires changes to Hydra's UTXO storage model (e.g., disk-backed storage, pruning, or compression).
