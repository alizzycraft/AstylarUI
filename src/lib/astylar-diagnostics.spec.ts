import {
  AstylarDiagnosticError,
  AstylarDiagnostics,
  type AstylarDiagnostic,
} from './astylar-diagnostics';

describe('AstylarDiagnostics', () => {
  let diagnostics: AstylarDiagnostics;
  let reported: AstylarDiagnostic[];

  beforeEach(() => {
    diagnostics = new AstylarDiagnostics();
    reported = [];
    diagnostics.configure({
      logLevel: 'silent',
      onDiagnostic: (diagnostic) => reported.push(diagnostic),
    });
  });

  it('rejects malformed roots with a typed deterministic diagnostic', () => {
    expect(() => diagnostics.validate({ styles: [], root: {} }))
      .toThrowError(AstylarDiagnosticError, /invalid-root/);
    expect(reported).toEqual([jasmine.objectContaining({
      code: 'invalid-root',
      severity: 'error',
      path: '$.root.children',
    })]);
  });

  it('rejects invalid element types at their authored path', () => {
    const siteData = {
      styles: [],
      root: { children: [{ id: 'bad', type: 'blink' }] },
    };

    expect(() => diagnostics.validate(siteData))
      .toThrowError(AstylarDiagnosticError, /invalid-element-type/);
    expect(reported[0]).toEqual(jasmine.objectContaining({
      code: 'invalid-element-type',
      path: '$.root.children[0].type',
      elementId: 'bad',
      value: 'blink',
    }));
  });

  it('identifies a missing namespaced element contribution without mutating data', () => {
    const element = {
      id: 'missing-widget',
      type: 'missing.widgets:card',
      data: { retained: true },
    };

    expect(() => diagnostics.validate({ styles: [], root: { children: [element] } }))
      .toThrowError(AstylarDiagnosticError, /invalid-element-type/);
    expect(reported[0]).toEqual(jasmine.objectContaining({
      code: 'invalid-element-type',
      pluginId: 'missing.widgets',
      contributionId: 'missing.widgets:card',
      elementId: 'missing-widget',
    }));
    expect(element.data).toEqual({ retained: true });
  });

  it('warns for a missing namespaced property contribution and preserves its value', () => {
    const extensions = { 'missing.widgets:depth': { authored: 0.25 } };

    diagnostics.validate({
      styles: [{ selector: '#card', extensions }],
      root: { children: [{ id: 'card', type: 'div' }] },
    });

    expect(reported).toEqual([jasmine.objectContaining({
      code: 'unsupported-style-property',
      pluginId: 'missing.widgets',
      contributionId: 'missing.widgets:depth',
      property: 'missing.widgets:depth',
    })]);
    expect(extensions['missing.widgets:depth']).toEqual({ authored: 0.25 });
  });

  it('warns deterministically for duplicate IDs and unsupported styles', () => {
    diagnostics.validate({
      styles: [{ selector: '#same', madeUpStyle: 'yes' }],
      root: {
        children: [
          { id: 'same', type: 'div', style: { anotherFakeStyle: 1 } },
          { id: 'same', type: 'button' },
        ],
      },
    });

    expect(reported.map(({ code, path, severity }) => ({ code, path, severity })))
      .toEqual([
        {
          code: 'unsupported-style-property',
          path: '$.styles[0].madeUpStyle',
          severity: 'warning',
        },
        {
          code: 'unsupported-style-property',
          path: '$.root.children[0].style.anotherFakeStyle',
          severity: 'warning',
        },
        {
          code: 'duplicate-element-id',
          path: '$.root.children[1].id',
          severity: 'warning',
        },
      ]);
  });

  it('keeps callback delivery independent from console logging', () => {
    const consoleError = spyOn(console, 'error');
    diagnostics.report({
      code: 'asset-load-failed',
      severity: 'error',
      message: 'missing',
    });

    expect(reported.length).toBe(1);
    expect(consoleError).not.toHaveBeenCalled();
    expect(diagnostics.snapshot).not.toBe(diagnostics.snapshot);
  });

  it('deduplicates repeated diagnostics from later updates', () => {
    const siteData = {
      styles: [{ selector: '#card', unknown: 'value' }],
      root: { children: [{ id: 'card', type: 'div' }] },
    };

    diagnostics.validate(siteData);
    diagnostics.validate(siteData);

    expect(reported.length).toBe(1);
    expect(diagnostics.snapshot.length).toBe(1);
  });
});
