function hasMeaningfulExtent(value, tolerance) {
  return !!value && (value.maxScrollLeft > tolerance || value.maxScrollTop > tolerance);
}

export function compareScrolling(expected, actual, incidentalExtentTolerancePx = 1) {
  const relevant = new Set([
    ...Object.entries(expected)
      .filter(([, value]) => hasMeaningfulExtent(value, incidentalExtentTolerancePx))
      .map(([id]) => id),
    ...Object.entries(actual)
      .filter(([, value]) => hasMeaningfulExtent(value, incidentalExtentTolerancePx))
      .map(([id]) => id),
  ]);
  const owners = [...relevant].map((id) => {
    const reference = expected[id];
    const astylar = actual[id];
    const ownershipMatches = !!reference === !!astylar;
    const reachabilityMatches = ownershipMatches && (!reference || (
      reference.canReachRight === astylar.canReachRight &&
      reference.canReachBottom === astylar.canReachBottom
    ));
    return {
      id,
      reference,
      astylar,
      ownershipMatches,
      reachabilityMatches,
      matches: ownershipMatches && reachabilityMatches,
    };
  });
  const ownershipMatches = owners.every((owner) => owner.ownershipMatches);
  const reachabilityMatches = owners.every((owner) => owner.reachabilityMatches);
  return { ownershipMatches, reachabilityMatches, matches: ownershipMatches && reachabilityMatches, owners };
}
