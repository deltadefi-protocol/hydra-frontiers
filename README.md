# Summary of Issues

This readme serves a summary of issues that DeltaDeFi is facing surrounding Hydra. Current issues are all produced by stress-testing hydra node. So can be summarized as derived issues from scalability.

## BLOCKING

This is grouped by issues that affect seriously

1. TPS

   - Rationale: We will be running multiple pairs on same hydra machine. Currently limitation can roughly support 1 order per second on each pair (assume we have 5 pairs).
   - Hydra core seems to process transaction one by one which can only serves up to 10TPS. Ideally it can serve up to 1k mark.
   - Details: [stress-test](./stress-test/README.md)
   - Acceptance criteria: 1k TPS

2. Snapshot confirm instability

   - Rationale: At ~10 TPS, snapshots fail to confirm. The Head becomes unresponsive as transactions accumulate but no new snapshots are finalized, affecting fund safety and result in stale head.
   - Root cause: Hydra's single sequential event queue causes consensus (snapshot confirmation) and transaction ingestion to block each other.
   - It happens in high load situation (like in [stress-test](./stress-test/)).
   - Details: [snapshot-confirm-instability](./snapshot-confirm-instability/README.md)
   - Acceptance criteria: Snapshots confirm at 20+ TPS

## CRITICAL

1. Incremental commit instability

   - For now we use deposit period of 300s (5 minutes), however, there is more often than not the deposit event is not processed appropriately within deposit window deadline.
   - This is non-blocking as we can keep retrying with recovery
   - We see below logs from hydra-node then it ends there without processing:

     ```sh
     2026-01-15 15:51:13.428001951 UTC | Commit deposit recorded with  deposit tx id "374e9038bc283246504b4e1d88a3ca8b8c0a5dc345d402ec0869e9dc1c4f1412"and                                                                          |[R]ecover
     pending for approval 746bf15427#0 ↦ 5000001 lovelace + 1 8516d6c94f15a040537b3f8ac5be09123fe01e02d60dcc8dd1276628
     ```

## IMPORTANT

1. Error message inconsistency

   - There are occasions where hydra transaction submit returns error which the transaction being accepted by the snapshot eventually. It would lead to inconsistent of state mapping in database.
   - Related PR - adding `tx-ttl` to fix false `BadInputUtxo` error from timeout tx submit request [#2434](https://github.com/cardano-scaling/hydra/pull/2434)

2. Sideload snapshot instability

   - From time to time, we see sideload snapshot timeout:

   ```json
   {
     "tag": "SideLoadSnapshotSubmitted",
     "timeout": "Operation timed out after 300s seconds"
   }
   ```

   - This is not critical since we only experience it at edge usage (recovering old snapshot), investigating inside we see:

   ```json
   {
     "timestamp": "2026-01-05T07:28:17.153461661Z",
     "threadId": 93,
     "namespace": "HydraNode-\"alice-node\"",
     "message": {
       "node": {
         "by": {
           "vkey": "9d0ef705011396676ae1ed5f49924613d27d00c8d60eae28d3f9afeb7d2a6a39"
         },
         "outcome": {
           "error": {
             "sideLoadRequirementFailure": {
               "lastSeenSn": 760,
               "requestedSn": 7,
               "tag": "SideLoadSnNumberInvalid"
             },
             "tag": "SideLoadSnapshotFailed"
           },
           "tag": "Error"
         },
         "tag": "LogicOutcome"
       },
       "tag": "Node"
     }
   }
   ```

   - Acceptance criteria: confirmation of sideload snapshot will work in normal circumstances. Ideally with a table showing what scenario would fail.

## Resolved

1. Make [1.3.0](https://github.com/cardano-scaling/hydra/blob/master/CHANGELOG.md) changes optional

   - Resolved by PR [#2432](https://github.com/cardano-scaling/hydra/pull/2432)
   - Rationale: This change introduces random downtime for duration of a few seconds, which severely affect trading reliability.
   - The security concern is legit, but not applicable to our case. In DeltaDeFi usage we disgard the contestant period logics since the trust assumption we apply is reputation based. So the fix is irrelevant but introduce UX overhaul in our case.
   - This is blocking since we can not updating hydra node and stay at version 1.2.0, and above issues cannot be resolved.

2. Memory bloat

   - Resolved by [StrictData](https://github.com/cardano-scaling/hydra/tree/a5214afa6ea54c9088b4377a5830f266f92aeb7a)
   - Rationale: When UTXOs set grows, we observed a higher than linear space complexity, resulting in unpractical machine cose.
   - This is non-blocking since we can simply scale machine at start, but this is not sustainable if DeltaDeFi grows traction.
   - Details: [memory-bloat](./memory-bloat/issue-summary.md)
