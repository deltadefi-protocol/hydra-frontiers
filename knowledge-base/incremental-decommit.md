# Incremental Commit (IC) - Complete Analysis

> Analysis of the Hydra Head protocol's incremental commit feature based on `hydra-node` source code.

## Table of Contents

1. [Lifecycle Overview](#1-lifecycle-overview)
2. [State Structures](#2-state-structures)
3. [Step-by-Step Lifecycle](#3-step-by-step-lifecycle)
4. [When Exactly is Snapshot Requested](#4-when-exactly-is-snapshot-requested)
5. [Persisted State (Event Log)](#5-persisted-state-event-log)
6. [Critical Invariants](#6-critical-invariants)
7. [State Diagram](#7-state-diagram)

---

## 1. Lifecycle Overview

```
L1 Deposit → Recorded → Activated → Snapshot Request → Snapshot Confirmed → IncrementTx → Finalized
```

The incremental commit allows adding UTxO to an already-open Hydra Head without closing it. The process involves:

1. **L1 Deposit**: User locks UTxO in a deposit script on Cardano
2. **Recording**: Node observes deposit and tracks it as `Inactive`
3. **Activation**: After `depositPeriod` elapses, deposit becomes `Active`
4. **Snapshot**: Leader includes deposit in next snapshot via `ReqSn`
5. **Confirmation**: All parties sign, snapshot is confirmed
6. **Increment**: `IncrementTx` posted to L1 to finalize
7. **Finalization**: L1 confirms, UTxO now available in head

---

## 2. State Structures

### NodeState

**Location**: `hydra-node/src/Hydra/Node/State.hs:19-26`

```haskell
data NodeState tx = NodeState
  { headState :: HeadState tx           -- Protocol state (Open/Closed/etc)
  , pendingDeposits :: PendingDeposits tx  -- Map depositTxId → Deposit
  , currentSlot :: ChainSlot
  }
```

### Deposit

**Location**: `hydra-node/src/Hydra/Node/State.hs:47-53`

```haskell
data Deposit tx = Deposit
  { headId :: HeadId
  , deposited :: UTxOType tx    -- UTxO being deposited
  , created :: UTCTime          -- When deposit observed
  , deadline :: UTCTime         -- Recovery deadline
  , status :: DepositStatus     -- Inactive | Active | Expired
  }

data DepositStatus = Inactive | Active | Expired
```

### CoordinatedHeadState

**Location**: `hydra-node/src/Hydra/HeadLogic/State.hs:161-183`

```haskell
data CoordinatedHeadState tx = CoordinatedHeadState
  { localUTxO :: UTxOType tx              -- Current UTxO (L̂)
  , localTxs :: [tx]                      -- Pending txs for next snapshot (T̂)
  , allTxs :: Map (TxIdType tx) tx        -- All seen txs not in snapshot
  , confirmedSnapshot :: ConfirmedSnapshot tx  -- Last confirmed (S̅)
  , seenSnapshot :: SeenSnapshot tx       -- Snapshot being signed (Û, ŝ, Σ̂)
  , currentDepositTxId :: Maybe (TxIdType tx)  -- Active IC tx (Uα)
  , decommitTx :: Maybe tx                -- Pending decommit (txω)
  , version :: SnapshotVersion            -- L1 state version (v̂)
  }
```

### SeenSnapshot States

**Location**: `hydra-node/src/Hydra/HeadLogic/State.hs:196-212`

```haskell
data SeenSnapshot tx
  = NoSeenSnapshot                        -- Never saw a ReqSn
  | LastSeenSnapshot {lastSeen :: SnapshotNumber}  -- No snapshot in flight
  | RequestedSnapshot                     -- ReqSn sent, waiting
      { lastSeen :: SnapshotNumber
      , requested :: SnapshotNumber
      }
  | SeenSnapshot                          -- ReqSn received, collecting sigs
      { snapshot :: Snapshot tx
      , signatories :: Map Party (Signature (Snapshot tx))
      }
```

---

## 3. Step-by-Step Lifecycle

### Step 1: Deposit on L1

User submits deposit transaction on Cardano L1 → Chain observer sees `OnDepositTx`.

**Handler**: `HeadLogic.hs:1471`

```haskell
(_, ChainInput Observation{observedTx = OnDepositTx{headId, depositTxId, deposited, created, deadline}}) ->
  newState DepositRecorded{...}
```

**Memory Changes**: `aggregateNodeState` at line 1499-1500

```haskell
DepositRecorded{headId, depositTxId, deposited, created, deadline} ->
  ns{pendingDeposits = Map.insert depositTxId
       Deposit{headId, deposited, created, deadline, status = Inactive}
       pendingDeposits}
```

| Storage | Field | Value |
|---------|-------|-------|
| NodeState | `pendingDeposits[depositTxId]` | `Deposit{status=Inactive, ...}` |
| Event Log | Appended | `DepositRecorded{...}` |

**Client Output**: `CommitRecorded{utxoToCommit, pendingDeposit, deadline}`

---

### Step 2: Deposit Activation (Time-Based)

On each `ChainTick`, the node evaluates deposit status based on time.

**Handler**: `HeadLogic.hs:955-978`

```haskell
determineNextDepositStatus env pendingDeposits chainTime =
  Map.foldlWithKey updateDeposit mempty pendingDeposits
 where
  determineStatus Deposit{created, deadline}
    | chainTime > created + depositPeriod = Active   -- Ready for inclusion
    | chainTime > deadline - depositPeriod = Expired -- Too late
    | otherwise = Inactive                           -- Still waiting
```

**Memory Changes**: `aggregateNodeState` at line 1501-1502

```haskell
DepositActivated{depositTxId, deposit} ->
  ns{pendingDeposits = Map.insert depositTxId deposit pendingDeposits}
```

| Storage | Field | Value |
|---------|-------|-------|
| NodeState | `pendingDeposits[depositTxId].status` | `Active` |
| Event Log | Appended | `DepositActivated{depositTxId, chainTime, deposit}` |

**Client Output**: `DepositActivated{depositTxId, deadline, chainTime}`

---

### Step 3: Snapshot Request with Deposit

**Trigger Conditions**: `onOpenChainTick` at line 1013-1024

```haskell
if isNothing decommitTx           -- No decommit in progress
   && isNothing currentDepositTxId -- No IC already in flight
   && not snapshotInFlight         -- No snapshot in flight
   && isLeader parameters party nextSn  -- I'm the leader
  then
    newState SnapshotRequestDecided{snapshotNumber = nextSn}
    <> cause (NetworkEffect $ ReqSn version nextSn txIds Nothing (Just depositTxId))
```

**Also triggered after snapshot confirmation**: `maybeRequestNextSnapshot` at line 701-727

```haskell
depositToInclude =
  if isNothing nextDepositTxId && isNothing nextDecommitTx
    then getNextActiveDeposit pendingDeposits  -- Pick FIFO active deposit
    else nextDepositTxId
```

**Network Message** (`ReqSn`):

```haskell
ReqSn {
  snapshotVersion :: SnapshotVersion,
  snapshotNumber :: SnapshotNumber,
  transactionIds :: [TxIdType tx],
  decommitTx :: Maybe tx,
  depositTxId :: Maybe (TxIdType tx)  -- ← THE DEPOSIT REFERENCE
}
```

**Memory Changes on Receive**: `aggregate` at line 1651-1663

```haskell
SnapshotRequested{snapshot, newCurrentDepositTxId, ...} ->
  coordinatedHeadState {
    seenSnapshot = SeenSnapshot snapshot mempty,  -- Waiting for sigs
    localTxs = newLocalTxs,
    localUTxO = newLocalUTxO,
    allTxs = foldr Map.delete allTxs requestedTxIds,
    currentDepositTxId = newCurrentDepositTxId    -- ← SET HERE
  }
```

| Storage | Field | Value |
|---------|-------|-------|
| CoordinatedHeadState | `seenSnapshot` | `SeenSnapshot{snapshot, signatories=empty}` |
| CoordinatedHeadState | `currentDepositTxId` | `Just depositTxId` |
| Event Log | Appended | `SnapshotRequested{..., newCurrentDepositTxId}` |

**Snapshot includes** (`Snapshot` type):

```haskell
Snapshot {
  utxoToCommit = Just depositedUTxO  -- ← THE UTxO BEING COMMITTED
}
```

---

### Step 4: Signature Collection

Each party receives `ReqSn`, validates, and sends `AckSn{signature}`.

**Memory Changes**: `aggregate` at line 1668-1686

```haskell
PartySignedSnapshot{party, signature} ->
  seenSnapshot = ss{signatories = Map.insert party signature signatories}
```

| Storage | Field | Value |
|---------|-------|-------|
| CoordinatedHeadState | `seenSnapshot.signatories` | Accumulates signatures |
| Event Log | Appended | `PartySignedSnapshot{snapshot, party, signature}` |

---

### Step 5: Snapshot Confirmed

When all signatures collected: `onOpenNetworkAckSn` at line 621

**Memory Changes**: `aggregate` at line 1688-1711

```haskell
SnapshotConfirmed{snapshot, signatures} ->
  coordinatedHeadState {
    confirmedSnapshot = ConfirmedSnapshot{snapshot, signatures},
    seenSnapshot = LastSeenSnapshot number  -- Reset
  }
```

| Storage | Field | Value |
|---------|-------|-------|
| CoordinatedHeadState | `confirmedSnapshot` | `ConfirmedSnapshot{snapshot, signatures}` |
| CoordinatedHeadState | `seenSnapshot` | `LastSeenSnapshot{lastSeen=N}` |
| Event Log | Appended | `SnapshotConfirmed{headId, snapshot, signatures}` |

**Note**: `currentDepositTxId` remains set until `CommitFinalized`.

---

### Step 6: Post IncrementTx

Immediately after confirmation, `maybePostIncrementTx` fires: `HeadLogic.hs:729-745`

```haskell
maybePostIncrementTx snapshot@Snapshot{utxoToCommit} signatures outcome =
  case find (\(_, Deposit{deposited}) -> Just deposited == utxoToCommit)
            (Map.toList pendingDeposits) of
    Just (depositTxId, Deposit{deposited}) ->
      outcome
        <> newState CommitApproved{headId, utxoToCommit = deposited}
        <> cause OnChainEffect{postChainTx = IncrementTx{...}}
```

| Storage | Field | Value |
|---------|-------|-------|
| Event Log | Appended | `CommitApproved{headId, utxoToCommit}` |
| Effect | Posted to chain | `IncrementTx{headId, incrementingSnapshot, depositTxId}` |

**Client Output**: `CommitApproved{utxoToCommit}`

---

### Step 7: IncrementTx Observed on Chain

Chain observer sees `OnIncrementTx` → `onOpenChainIncrementTx`: `HeadLogic.hs:1066-1077`

```haskell
onOpenChainIncrementTx openState newChainState newVersion depositTxId =
  newState CommitFinalized{chainState = newChainState, headId, newVersion, depositTxId}
```

**Memory Changes**: `aggregateNodeState` at line 1507-1534

```haskell
CommitFinalized{chainState, newVersion, depositTxId} ->
  let deposit = Map.lookup depositTxId pendingDeposits
      newUTxO = maybe mempty (\Deposit{deposited} -> deposited) deposit
   in ns {
     headState = Open os {
       chainState,
       coordinatedHeadState = coordinatedHeadState {
         version = newVersion,              -- Bump version
         currentDepositTxId = Nothing,      -- Clear IC reference
         localUTxO = localUTxO <> newUTxO   -- Add deposited UTxO
       }
     },
     pendingDeposits = Map.delete depositTxId pendingDeposits  -- Remove deposit
   }
```

| Storage | Field | Value |
|---------|-------|-------|
| CoordinatedHeadState | `version` | `newVersion` (incremented) |
| CoordinatedHeadState | `currentDepositTxId` | `Nothing` |
| CoordinatedHeadState | `localUTxO` | `localUTxO <> depositedUTxO` |
| NodeState | `pendingDeposits` | Deposit removed |
| Event Log | Appended | `CommitFinalized{...}` |

**Client Output**: `CommitFinalized{depositTxId}`

---

## 4. When Exactly is Snapshot Requested

### Three Triggers

| Trigger | Location | Condition |
|---------|----------|-----------|
| **ChainTick with active deposit** | `onOpenChainTick` (line 1001) | `isNothing decommitTx && isNothing currentDepositTxId && not snapshotInFlight && isLeader` |
| **Transaction received** | `onOpenNetworkReqTx` (line 337) | `not snapshotInFlight && isLeader` |
| **Post-snapshot confirmation** | `maybeRequestNextSnapshot` (line 701) | `isLeader && hasPendingWork` (localTxs OR decommit OR active deposit) |

### Deposit Selection Logic

**Location**: `withNextActive` at line 1028-1036

```haskell
-- FIFO by creation time, only non-empty Active deposits
withNextActive deposits cont = do
  let p (_, Deposit{deposited, status}) = deposited /= mempty && status == Active
  case filter p (Map.toList deposits) of
    [] -> noop
    xs -> cont (fst (minimumBy (comparing ((\Deposit{created} -> created) . snd)) xs))
```

### Snapshot Request Decision Flow

```
ChainTick received
    │
    ▼
┌───────────────────────────────┐
│ Any active deposits?          │──No──► noop
└───────────────┬───────────────┘
                │ Yes
                ▼
┌───────────────────────────────┐
│ decommitTx == Nothing?        │──No──► noop (can't have IC+ID)
└───────────────┬───────────────┘
                │ Yes
                ▼
┌───────────────────────────────┐
│ currentDepositTxId == Nothing?│──No──► noop (IC already in flight)
└───────────────┬───────────────┘
                │ Yes
                ▼
┌───────────────────────────────┐
│ snapshotInFlight?             │──Yes─► noop
└───────────────┬───────────────┘
                │ No
                ▼
┌───────────────────────────────┐
│ isLeader for nextSn?          │──No──► noop
└───────────────┬───────────────┘
                │ Yes
                ▼
        Send ReqSn with depositTxId
```

---

## 5. Persisted State (Event Log)

Events are persisted as **append-only JSONL** in the state directory:

```
state/
  events.log   ← StateChanged events, one per line
```

### Events During IC Lifecycle

1. `DepositRecorded{chainState, headId, depositTxId, deposited, created, deadline}`
2. `DepositActivated{depositTxId, chainTime, deposit}`
3. `SnapshotRequestDecided{snapshotNumber}`
4. `SnapshotRequested{snapshot, requestedTxIds, newLocalUTxO, newLocalTxs, newCurrentDepositTxId}`
5. `PartySignedSnapshot{snapshot, party, signature}` (×N parties)
6. `SnapshotConfirmed{headId, snapshot, signatures}`
7. `CommitApproved{headId, utxoToCommit}`
8. `CommitFinalized{chainState, headId, newVersion, depositTxId}`

### Recovery Semantics

On restart, all events are replayed through `aggregateNodeState` to reconstruct full state:

```haskell
-- Replay events to rebuild state
foldl' aggregateNodeState initialNodeState events
```

### Event Rotation

**Location**: `Events/FileBased.hs:51-61`

- Original file renamed to `state-N`
- New `Checkpoint` event written containing full `NodeState`
- Allows recovery from any point in time

---

## 6. Critical Invariants

| Invariant | Enforcement |
|-----------|-------------|
| Only one IC in flight | `isNothing currentDepositTxId` checked before requesting |
| No IC + ID simultaneously | `isNothing decommitTx` checked |
| Deposit must be Active | `status == Active` filter in `withNextActive` |
| Version sync with L1 | `CommitFinalized` bumps `version` |
| Leader-only snapshot requests | `isLeader parameters party nextSn` |
| Non-empty deposits only | `deposited /= mempty` filter |

### Version Race Condition (Known Issue)

**Problem Sequence**:

```
Time T1: IC snapshot (s=5, v=V) confirmed
Time T2: Leader sends ReqSn(v=V, s=6)
Time T3: L1 IncrementTx confirms → CommitFinalized bumps version to V+1
Time T4: ReqSn(v=V, s=6) processed by non-leader
Time T5: requireReqSn checks: V /= V+1 → REJECTED (Error)
Time T6: Leader stuck with snapshotInFlight=True
```

**Solution**: `allowStaleVersion` check at lines 467-470

```haskell
allowStaleVersion =
  sv == version - 1
  && isNothing mDecommitTx
  && isNothing mDepositTxId
```

Allows `ReqSn` with prior version if no IC/ID content (stale request is safe as it doesn't mutate L1 state).

---

## 7. State Diagram

```
                        ┌─────────────────┐
                        │  Deposit on L1  │
                        └────────┬────────┘
                                 │
                    ┌────────────▼────────────┐
                    │     DepositRecorded     │
                    │ pendingDeposits[tx]=    │
                    │   Deposit{Inactive}     │
                    └────────────┬────────────┘
                                 │ (time passes: chainTime > created + depositPeriod)
                    ┌────────────▼────────────┐
                    │    DepositActivated     │
                    │ pendingDeposits[tx]=    │
                    │   Deposit{Active}       │
                    └────────────┬────────────┘
                                 │ (leader on tick, conditions met)
             ┌───────────────────▼───────────────────┐
             │         SnapshotRequested             │
             │ seenSnapshot = SeenSnapshot{...}      │
             │ currentDepositTxId = Just tx          │
             │ snapshot.utxoToCommit = deposited     │
             └───────────────────┬───────────────────┘
                                 │ (all parties sign)
             ┌───────────────────▼───────────────────┐
             │         SnapshotConfirmed             │
             │ confirmedSnapshot = Confirmed{...}    │
             │ seenSnapshot = LastSeenSnapshot       │
             └───────────────────┬───────────────────┘
                                 │ (immediately after confirmation)
             ┌───────────────────▼───────────────────┐
             │          CommitApproved               │
             │ Effect: IncrementTx posted to L1      │
             └───────────────────┬───────────────────┘
                                 │ (L1 confirms IncrementTx)
             ┌───────────────────▼───────────────────┐
             │          CommitFinalized              │
             │ version++                             │
             │ currentDepositTxId = Nothing          │
             │ localUTxO += deposited                │
             │ pendingDeposits.delete(tx)            │
             └───────────────────────────────────────┘
```

---

## Appendix: Key Source Files

| File | Purpose |
|------|---------|
| `hydra-node/src/Hydra/HeadLogic.hs` | Main state machine, event handlers |
| `hydra-node/src/Hydra/HeadLogic/State.hs` | State type definitions |
| `hydra-node/src/Hydra/HeadLogic/Outcome.hs` | Effects and StateChanged events |
| `hydra-node/src/Hydra/Node/State.hs` | NodeState, Deposit, PendingDeposits |
| `hydra-tx/src/Hydra/Tx/Increment.hs` | IncrementTx building and observation |
| `hydra-node/src/Hydra/Network/Message.hs` | ReqSn, AckSn message types |

---

## Appendix: Client API Outputs

During incremental commit, clients observe these `ServerOutput` messages:

| Event | Output | Meaning |
|-------|--------|---------|
| Deposit observed | `CommitRecorded{utxoToCommit, pendingDeposit, deadline}` | Deposit recorded on L1 |
| Deposit active | `DepositActivated{depositTxId, deadline, chainTime}` | Ready for L2 inclusion |
| Snapshot confirmed | `SnapshotConfirmed{snapshot{utxoToCommit}, signatures}` | L2 consensus achieved |
| Increment posted | `CommitApproved{utxoToCommit}` | IncrementTx sent to L1 |
| Increment confirmed | `CommitFinalized{depositTxId}` | Assets now in head |
