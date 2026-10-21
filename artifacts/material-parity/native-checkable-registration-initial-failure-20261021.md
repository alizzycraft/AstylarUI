# Initial registration guard failure

Retained diagnostic excerpt from the first combined Node test invocation in this
registration increment (terminal exit 1, session 24831). This is a transcription
of the tool output, not an original redirected stdout file.

Command: `node --test tests/material-parity/native-checkable-inputs.spec.mjs tests/material-parity/button-touch-inputs.spec.mjs`

Result: nine tests; eight passed, one failed. All six original shared-button tests
and both public-pixel/radio-ring checks passed. The new registration-conservation
test failed at its expected-exception assertion, original line 25:

```text
not ok 7 - native checkable registration preserves all prior findings and distinct core authoring causes
failureType: 'testCodeFailure'
error: 'Missing expected exception.'
code: 'ERR_ASSERTION'
operator: 'throws'
```

Cause: replacing only the first new finding identifier made the new policy
restoration function return early, despite the second new finding still being
present. The guard now rejects that partial registration. No original assertion,
captured receipt, renderer behavior or reference input was changed. The subsequent
three-test focused run passes; the immutable rendering failures remain failures.
