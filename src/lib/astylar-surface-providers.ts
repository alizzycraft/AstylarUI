import type { Provider } from '@angular/core';
import { TextSelectionStore } from '../app/store/text-selection.store';
import { BabylonCameraService } from '../app/services/babylon-camera.service';
import { BabylonMeshService } from '../app/services/babylon-mesh.service';
import { TextureService } from '../app/services/texture.service';
import { TextStyleParserService } from '../app/services/text/text-style-parser.service';
import { MultiLineTextRendererService } from '../app/services/text/multi-line-text-renderer.service';
import { TextRenderingService } from '../app/services/text/text-rendering.service';
import { TextSelectionService } from '../app/services/text/text-selection.service';
import { TextCanvasRendererService } from '../app/services/text/text-canvas-renderer.service';
import { BabylonInteractionService } from '../app/services/dom/interaction.service';
import { BabylonElementManagerService } from '../app/services/dom/element-manager.service';
import { DOMAncestryService } from '../app/services/dom/dom-ancestry.service';
import { StyleDefaultsService } from '../app/services/dom/style-defaults.service';
import { StyleService } from '../app/services/dom/style.service';
import { BabylonDOMRendererService } from '../app/services/dom/renderer.service';
import { PointerInteractionService } from '../app/services/dom/interaction/pointer-interaction.service';
import { TextInteractionRegistryService } from '../app/services/dom/interaction/text-interaction-registry.service';
import { TextHighlightMeshFactory } from '../app/services/dom/interaction/text-highlight-mesh.factory';
import { TextSelectionKeyboardService } from '../app/services/dom/interaction/text-selection-keyboard.service';
import { TextSelectionControllerService } from '../app/services/dom/interaction/text-selection-controller.service';
import { TextSelectionClipboardService } from '../app/services/dom/interaction/text-selection-clipboard.service';
import { ElementCreationService } from '../app/services/dom/elements/element-creation.service';
import { ElementBorderService } from '../app/services/dom/elements/element-border.service';
import { ElementInteractionService } from '../app/services/dom/elements/element-interaction.service';
import { ElementDimensionService } from '../app/services/dom/elements/element-dimension.service';
import { ElementService } from '../app/services/dom/elements/element.service';
import { ElementMaterialService } from '../app/services/dom/elements/element-material.service';
import { ElementStyleParserService } from '../app/services/dom/elements/element-style-parser.service';
import { FlexLayoutService } from '../app/services/dom/elements/flex-layout.service';
import { FlexService } from '../app/services/dom/elements/flex.service';
import { GridService } from '../app/services/dom/elements/grid.service';
import { ImageLayoutService } from '../app/services/dom/elements/image-layout.service';
import { ImageResourceService } from '../app/services/dom/elements/image-resource.service';
import { ListService } from '../app/services/dom/elements/list.service';
import { OverflowClipService } from '../app/services/dom/elements/overflow-clip.service';
import { RootService } from '../app/services/dom/elements/root.service';
import { TableService } from '../app/services/dom/elements/table.service';
import { PositionCalculator } from '../app/services/dom/positioning/position-calculator.service';
import { ViewportService } from '../app/services/dom/positioning/viewport.service';
import { PositioningIntegrationService } from '../app/services/dom/positioning/positioning-integration.service';
import { PositioningService } from '../app/services/dom/positioning/positioning.service';
import { ContainingBlockManager } from '../app/services/dom/positioning/containing-block.manager';
import { StackingContextManager } from '../app/services/dom/positioning/stacking-context.manager';
import { RelativePositioningService } from '../app/services/dom/positioning/modes/relative-positioning.service';
import { FixedPositioningService } from '../app/services/dom/positioning/modes/fixed-positioning.service';
import { AbsolutePositioningService } from '../app/services/dom/positioning/modes/absolute-positioning.service';
import { TextInputManager } from '../app/services/dom/input/text-input.manager';
import { FocusManager } from '../app/services/dom/input/focus.manager';
import { ButtonManager } from '../app/services/dom/input/button.manager';
import { CheckboxManager } from '../app/services/dom/input/checkbox.manager';
import { FormManager } from '../app/services/dom/input/form.manager';
import { KeyboardInputHandler } from '../app/services/dom/input/keyboard-input.handler';
import { TextCursorRenderer } from '../app/services/dom/input/text-cursor.renderer';
import { InputElementService } from '../app/services/dom/input/input-element.service';
import { FormValidatorService } from '../app/services/dom/input/form-validator.service';
import { SelectManager } from '../app/services/dom/input/select.manager';
import { RangeManager } from '../app/services/dom/input/range.manager';
import { AstylarDiagnostics } from './astylar-diagnostics';
import { AstylarDocumentRecovery } from './astylar-document-recovery';
import { AstylarPluginHost } from './astylar-plugin-host';
import { AstylarDocumentStyleSource } from './astylar-document-style-source';
import { AstylarDocumentStyleResolver } from './astylar-document-style-resolver';

/** Complete renderer dependency scope. Every mount receives new instances. */
export const ASTYLAR_SURFACE_SERVICE_PROVIDERS: Provider[] = [
  AstylarDiagnostics,
  AstylarDocumentRecovery,
  AstylarPluginHost,
  AstylarDocumentStyleSource,
  AstylarDocumentStyleResolver,
  TextSelectionStore,
  BabylonCameraService,
  BabylonMeshService,
  TextureService,
  TextStyleParserService,
  MultiLineTextRendererService,
  TextRenderingService,
  TextSelectionService,
  TextCanvasRendererService,
  BabylonInteractionService,
  BabylonElementManagerService,
  DOMAncestryService,
  StyleDefaultsService,
  StyleService,
  BabylonDOMRendererService,
  PointerInteractionService,
  TextInteractionRegistryService,
  TextHighlightMeshFactory,
  TextSelectionKeyboardService,
  TextSelectionControllerService,
  TextSelectionClipboardService,
  ElementCreationService,
  ElementBorderService,
  ElementInteractionService,
  ElementDimensionService,
  ElementService,
  ElementMaterialService,
  ElementStyleParserService,
  FlexLayoutService,
  FlexService,
  GridService,
  ImageLayoutService,
  ImageResourceService,
  ListService,
  OverflowClipService,
  RootService,
  TableService,
  PositionCalculator,
  ViewportService,
  PositioningIntegrationService,
  PositioningService,
  ContainingBlockManager,
  StackingContextManager,
  RelativePositioningService,
  FixedPositioningService,
  AbsolutePositioningService,
  TextInputManager,
  FocusManager,
  ButtonManager,
  CheckboxManager,
  FormManager,
  KeyboardInputHandler,
  TextCursorRenderer,
  InputElementService,
  FormValidatorService,
  SelectManager,
  RangeManager,
];
