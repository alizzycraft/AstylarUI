// Shared classification vocabulary has no collector dependencies. Collectors
// may depend on one another's functions, but module initialization must not
// read classification constants from a partially initialized collector.
export const rangeCaretAttribution = 'reviewed-range-caret-observation-stage';
export const motionCaretAttribution = 'reviewed-motion-caret-request-omission';
