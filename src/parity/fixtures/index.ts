import { boxModelBasicFixture } from './box-model-basic.fixture';
import { borderBoxBasicFixture } from './border-box-basic.fixture';
import { nestedPositioningFixture } from './nested-positioning.fixture';
import { percentageSizingFixture } from './percentage-sizing.fixture';
import { cascadeSpecificityFixture } from './cascade-specificity.fixture';
import { textInheritanceFixture } from './text-inheritance.fixture';
import { ParityFixture } from '../parity.types';

const fixtures: readonly ParityFixture[] = [
  boxModelBasicFixture,
  borderBoxBasicFixture,
  percentageSizingFixture,
  nestedPositioningFixture,
  cascadeSpecificityFixture,
  textInheritanceFixture
];

const fixturesById = new Map(fixtures.map((fixture) => [fixture.id, fixture]));

export function getParityFixture(id: string): ParityFixture | undefined {
  return fixturesById.get(id);
}

export function getParityFixtures(): readonly ParityFixture[] {
  return fixtures;
}
