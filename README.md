# DeltaDeFi Hydra Frontiers

## Foreword

This repository documents DeltaDeFi's experience integrating and operating [Hydra](https://hydra.family/) - the Layer 2 scaling solution for Cardano.

We extend our appreciation to the [Hydra team at IOG/Cardano Scaling](https://github.com/cardano-scaling/hydra) for their groundbreaking work on this technology. The issues documented here arise from stress-testing Hydra under production-like conditions for our DEX use case, and we hope this documentation contributes back to the ecosystem.

**Purpose**: Document issues, investigations, and fixes related to Hydra usage in DeltaDeFi's trading infrastructure.

## Why Hydra

Hydra is the only approach that delivers DeltaDeFi's product requirements (sub-second confirmation, zero-cost orders, API trading) without sacrificing decentralization. See [deltadefi/deltadefi.md](./deltadefi/deltadefi.md) for details.

## Layout

```
hydra-issues/
├── README.md                 # This file - overview and top issues
├── issues/                   # Detailed issue documentation
│   ├── incremental/          # IC/ID stale snapshot issues
│   ├── stress-test/          # TPS and load testing
│   ├── snapshot-confirm-instability/  # Snapshot confirmation issues
│   ├── error-message-inconsistency/   # False error responses
│   ├── sideload-instability/          # Sideload recovery issues
│   └── memory-bloat/         # Memory usage issues (resolved)
├── knowledge-base/           # Research and documentation
└── debug/                    # Debug scripts and tools
```

## Top Issues

### BLOCKING

| Issue                                   | Description                                                                                                                       | Details                                                                         | Upstream                                                      |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| TPS Limitation                          | Hydra processes transactions sequentially, limiting throughput to ~10 TPS. Need 1k TPS for multi-pair trading.                    | [stress-test](./issues/stress-test/README.md)                                   | -                                                             |
| Snapshot Confirm Instability            | At ~10 TPS, snapshots fail to confirm. Head becomes unresponsive due to single sequential event queue blocking consensus.         | [snapshot-confirm-instability](./issues/snapshot-confirm-instability/README.md) | -                                                             |
| Incremental Commit/Decommit Instability | IC/ID operations become stale after L1 finalization due to version race conditions. Recovery via sideload possible but not ideal. | [incremental](./issues/incremental/README.md)                                   | [#2446](https://github.com/cardano-scaling/hydra/issues/2446) |

### IMPORTANT

| Issue                       | Description                                                                           | Details                                                                       | Related                                                     |
| --------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Error Message Inconsistency | Tx submit returns error but transaction accepted by snapshot, causing state mismatch. | [error-message-inconsistency](./issues/error-message-inconsistency/README.md) | [#2434](https://github.com/cardano-scaling/hydra/pull/2434) |
| Sideload Instability        | Sideload snapshot timeout during recovery. Edge case only.                            | [sideload-instability](./issues/sideload-instability/README.md)               | -                                                           |

### RESOLVED

| Issue                       | Resolution                                                                                           | Details                                                             |
| --------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Make 1.3.0 changes optional | [#2432](https://github.com/cardano-scaling/hydra/pull/2432)                                          | Random downtime from security fix not applicable to our trust model |
| Memory Bloat                | [StrictData](https://github.com/cardano-scaling/hydra/tree/a5214afa6ea54c9088b4377a5830f266f92aeb7a) | Higher than linear space complexity with UTXO growth                |

## Contributing

Issues and fixes are tracked in the [DeltaDeFi Hydra Fork](https://github.com/deltadefi-protocol/hydra).
