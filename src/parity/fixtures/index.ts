import { boxModelBasicFixture } from './box-model-basic.fixture';
import { ParityFixture } from '../parity.types';

const fixtures: readonly ParityFixture[] = [boxModelBasicFixture];

const fixturesById = new Map(fixtures.map((fixture) => [fixture.id, fixture]));

export function getParityFixture(id: string): ParityFixture | undefined {
  return fixturesById.get(id);
}

export function getParityFixtures(): readonly ParityFixture[] {
  return fixtures;
}

