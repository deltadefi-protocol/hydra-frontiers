# Sideload Snapshot Instability

## Status: Important

## Summary

From time to time, sideload snapshot operations timeout during recovery scenarios.

## Symptoms

```json
{
  "tag": "SideLoadSnapshotSubmitted",
  "timeout": "Operation timed out after 300s seconds"
}
```

## Root Cause

Investigating inside we see snapshot number validation failures:

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

## Impact

- This is not critical since we only experience it at edge usage (recovering old snapshot)
- Recovery procedures may require multiple attempts

## Acceptance Criteria

- Confirmation that sideload snapshot works in normal circumstances
- Clear documentation of scenarios that would fail
- Table showing expected behavior for different recovery scenarios
