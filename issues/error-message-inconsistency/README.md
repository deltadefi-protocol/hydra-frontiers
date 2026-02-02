# Error Message Inconsistency

## Status: Important

## Summary

There are occasions where hydra transaction submit returns error while the transaction is actually accepted by the snapshot eventually. This leads to inconsistent state mapping in the database.

## Impact

- Database state becomes out of sync with actual Hydra head state
- Requires manual reconciliation or recovery procedures
- Affects trading reliability

## Related

- PR adding `tx-ttl` to fix false `BadInputUtxo` error from timeout tx submit request: [#2434](https://github.com/cardano-scaling/hydra/pull/2434)

## Acceptance Criteria

- Transaction submit errors accurately reflect the actual outcome
- No false positive errors when transactions are actually accepted
