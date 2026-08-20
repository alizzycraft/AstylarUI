# AstylarUI compatibility sources

[`capabilities.json`](capabilities.json) is the machine-readable inventory for
HTML/CSS-to-Astylar translation. It is repository and future Phase 15 skill
source material, not a claim that Astylar implements the complete web platform.

The catalog classifies behavior as `direct`, `compatible`, `different`,
`unsupported`, or `plugin`. Its grouped entries cover every public built-in
element identity, `DOMElement` field, and `StyleRule` field. Each group records
value or unit constraints where applicable, inheritance/default behavior,
important Astylar differences, alternatives, plugin extensibility, and evidence.
Unsupported examples are explicit so an agent does not infer support merely
from familiar web syntax.

The authoritative implementation remains the public types and registries named
under `freshness.authoritativeSources`. Run:

```bash
npm run capabilities:check
```

The check parses the TypeScript definitions and requires exact element, DOM
field, and style-field coverage. It also verifies normalized source
fingerprints, evidence paths, parity-fixture IDs, classifications, and basic
schema invariants. Consequently, changing a public capability or one of the
tracked parsing/default/rendering sources requires an intentional catalog review
instead of allowing the reference to drift silently.

The source fingerprints are deliberately review gates, not generated timestamps.
When a tracked implementation changes, inspect its public effect, update the
catalog statement and evidence if needed, then replace only the affected
fingerprint with the value reported by the failing check.

The catalog is intentionally structured so paired translation examples can add
human-sized teaching material without duplicating its exhaustive public-name
coverage. The future Phase 15 skill should consume both kinds of source material
instead of treating the JSON alone as teaching prose.
