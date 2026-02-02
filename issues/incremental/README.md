# Hydra IC/ID Stale Snapshot Issues

Tracking database for Incremental Commit (IC) and Incremental Decommit (ID) issues that cause Hydra head snapshots to become stale/frozen.

## Issue Summary

| ID  | Issue                                         | Type  | State         | Sideload | Pressure | Status  | Fix                                                                                                            | Official Fix                                                                                                                 |
| --- | --------------------------------------------- | ----- | ------------- | -------- | -------- | ------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 5   | ID → finalized → stale                        | ID    | Finalized     | No       | No       | Testing | [6bc19bc](https://github.com/deltadefi-protocol/hydra/pull/7/commits/6bc19bc6f8ab736c2c655a5434f8b96133d24a7d) | -                                                                                                                            |
| 7   | IC → finalized → stale                        | IC    | Finalized     | No       | 10-50TPS | Testing | [3da07f0](https://github.com/deltadefi-protocol/hydra/commit/3da07f04da0e7014c17281238cce908f847cc72b)         | [dont-check-sn-versions-offchain](https://github.com/cardano-scaling/hydra/compare/master...dont-check-sn-versions-offchain) |
| 9   | IC → stale → ID → sideload stale              | ID    | Not Finalized | Yes      | No       | Testing | [9606d98](https://github.com/deltadefi-protocol/hydra/pull/7/commits/9606d98fcca057331ff71a5a6d6754703117f510) | -                                                                                                                            |
| 10  | IC → stale → ID → stale → sideload → stale    | ID    | Finalized     | Yes      | No       | Pending | -                                                                                                              | -                                                                                                                            |
| 11  | IC → finalized → stale → sideload → stale     | IC    | Finalized     | Yes      | No       | Testing | [66cb2aa](https://github.com/deltadefi-protocol/hydra/pull/7/commits/66cb2aa4717f2892d5e3fd3f4442b245c93fb4e2) | -                                                                                                                            |
| 12  | IC → not finalized → stale → sideload → stale | IC    | Not Finalized | Yes      | No       | Testing | [f000398](https://github.com/deltadefi-protocol/hydra/pull/7/commits/f00039839c401b8f80e7beb2d79ab9d51b2a6332) | -                                                                                                                            |
| 13  | IC ID when highload → stale                   | IC/ID | Finalized     | No       | 10-50TPS | Testing | [3b3b7b9](https://github.com/deltadefi-protocol/hydra/pull/7/commits/3b3b7b961552ed81582afa4d4929dae53522cec4) | -                                                                                                                            |

## Terminology

- **IC (Incremental Commit)**: Adding funds to an open Hydra head via L1 deposit
- **ID (Incremental Decommit)**: Removing funds from an open Hydra head via L1 decrement
- **Stale**: Head becomes frozen, no new snapshots can be created
- **Sideload**: Recovery mechanism via `POST /snapshot` API to force state synchronization
- **Finalized**: L1 transaction (IncrementTx/DecrementTx) confirmed on-chain

## Root Causes

### Issue #7: IC → finalized → stale (ReqSn Version Race)

After `CommitFinalized` on L1, in-flight `ReqSn` messages with the old version are rejected.

**Error**: `ReqSvNumberInvalid{lastSeenSv:1, requestedSv:0}`

**Root cause**: `allowStaleVersion` check in `HeadLogic.hs` doesn't account for deposits that were already finalized and removed from `pendingDeposits`.

**Timeline**:

```
CommitFinalized: v=0→1, deposit removed from pendingDeposits
ReqSn(v=0, deposit=X) arrives 88ms later
→ allowStaleVersion=False (depositTxId exists but not in pendingDeposits)
→ ERROR: ReqSvNumberInvalid
→ Head frozen
```

**Fix**: Modify `allowStaleVersion` to check `Map.notMember depositTxId pendingDeposits` instead of `isNothing mDepositTxId`.

### Issue #5: ID → finalized → stale (UTxO Double-Spend)

After `DecommitApproved`, a snapshot confirmed WITHOUT the decommit tx, allowing another transaction to spend the same UTxO.

**Error**: `SnapshotDoesNotApply - BadInputsUTxO`

**Timeline**:

```
DecommitApproved: decommit tx uses UTxO X
Snapshot 5030 confirms WITHOUT decommit (decommitTx: null)
Snapshot 5030 includes tx that spends UTxO X
Snapshot 5031 tries to include decommit
→ ERROR: BadInputsUTxO (UTxO X already spent)
→ Head frozen
```

**Fix**: Lock decommit UTxO inputs after `DecommitApproved`, reject conflicting transactions until `DecommitFinalized`.

## Acceptance Criteria

| Level          | Requirement                             |
| -------------- | --------------------------------------- |
| **Minimal**    | Can recover state via sideload          |
| **Production** | After recovery → can confirm snapshots  |
| **Ideal**      | Never need to trigger recovery workflow |

## Related Links

- [GitHub Issue #2446](https://github.com/cardano-scaling/hydra/issues/2446) - Upstream tracking
- [DeltaDeFi Hydra Fork PR #7](https://github.com/deltadefi-protocol/hydra/pull/7) - All fixes
- [Official Fix Branch](https://github.com/cardano-scaling/hydra/compare/master...dont-check-sn-versions-offchain)
- [Notion Database](https://deltadefi.notion.site/hydra-icid-issues?source=copy_link)
