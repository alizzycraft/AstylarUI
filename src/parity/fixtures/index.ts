import { boxModelBasicFixture } from './box-model-basic.fixture';
import { borderBoxBasicFixture } from './border-box-basic.fixture';
import { nestedPositioningFixture } from './nested-positioning.fixture';
import { percentageSizingFixture } from './percentage-sizing.fixture';
import { cascadeSpecificityFixture } from './cascade-specificity.fixture';
import { textInheritanceFixture } from './text-inheritance.fixture';
import { blockFlowFixture } from './block-flow.fixture';
import { inlineBlockFlowFixture } from './inline-block-flow.fixture';
import { multilineWrappingFixture } from './multiline-wrapping.fixture';
import { preLineAlignmentFixture } from './pre-line-alignment.fixture';
import { flexRowAlignmentFixture } from './flex-row-alignment.fixture';
import { flexColumnAlignmentFixture } from './flex-column-alignment.fixture';
import { flexGrowGapFixture } from './flex-grow-gap.fixture';
import { semanticDefaultFlowFixture } from './semantic-default-flow.fixture';
import { unorderedListLayoutFixture } from './unordered-list-layout.fixture';
import { orderedListLayoutFixture } from './ordered-list-layout.fixture';
import { tableFixedLayoutFixture } from './table-fixed-layout.fixture';
import { tableColumnWidthsFixture } from './table-column-widths.fixture';
import { imageIntrinsicSizeFixture } from './image-intrinsic-size.fixture';
import { imageObjectFitContainFixture } from './image-object-fit-contain.fixture';
import { imageObjectFitCoverFixture } from './image-object-fit-cover.fixture';
import { styledButtonFixture } from './styled-button.fixture';
import { styledTextInputFixture } from './styled-text-input.fixture';
import { checkboxStatesFixture } from './checkbox-states.fixture';
import { zIndexOverlapFixture } from './z-index-overlap.fixture';
import { minMaxConstraintsFixture } from './min-max-constraints.fixture';
import { textSpacingFixture } from './text-spacing.fixture';
import { inlineFlexFlowFixture } from './inline-flex-flow.fixture';
import { ParityFixture } from '../parity.types';

const fixtures: readonly ParityFixture[] = [
  boxModelBasicFixture,
  borderBoxBasicFixture,
  percentageSizingFixture,
  nestedPositioningFixture,
  cascadeSpecificityFixture,
  textInheritanceFixture,
  blockFlowFixture,
  inlineBlockFlowFixture,
  multilineWrappingFixture,
  preLineAlignmentFixture,
  flexRowAlignmentFixture,
  flexColumnAlignmentFixture,
  flexGrowGapFixture,
  semanticDefaultFlowFixture,
  unorderedListLayoutFixture,
  orderedListLayoutFixture,
  tableFixedLayoutFixture,
  tableColumnWidthsFixture,
  imageIntrinsicSizeFixture,
  imageObjectFitContainFixture,
  imageObjectFitCoverFixture,
  styledButtonFixture,
  styledTextInputFixture,
  checkboxStatesFixture,
  zIndexOverlapFixture,
  minMaxConstraintsFixture,
  textSpacingFixture,
  inlineFlexFlowFixture
];

const fixturesById = new Map(fixtures.map((fixture) => [fixture.id, fixture]));

export function getParityFixture(id: string): ParityFixture | undefined {
  return fixturesById.get(id);
}

export function getParityFixtures(): readonly ParityFixture[] {
  return fixtures;
}
