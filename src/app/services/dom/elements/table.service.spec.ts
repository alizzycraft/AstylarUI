import { TableService } from './table.service';
import { DOMAncestryService } from '../dom-ancestry.service';

describe('TableService', () => {
  function createService(): { service: TableService; ancestry: DOMAncestryService } {
    const ancestry = new DOMAncestryService();
    return { service: new TableService(ancestry), ancestry };
  }

  it('honors explicit pixel column definitions', () => {
    const { service } = createService();

    const widths = service['resolveColumnWidths'](
      [{ width: '120px', span: 1 }, { width: '240px', span: 1 }],
      360,
      2,
    );

    expect(widths).toEqual([120, 240]);
  });

  it('distributes remaining width across undefined columns', () => {
    const { service } = createService();

    const widths = service['resolveColumnWidths'](
      [{ width: '25%', span: 1 }, { span: 1 }, { span: 1 }],
      400,
      3,
    );

    expect(widths).toEqual([100, 150, 150]);
  });

  it('positions rows locally within an offset semantic section', () => {
    const { service } = createService();
    const createRow = spyOn<any>(service, 'createTableRow').and.callFake(
      (_dom: unknown, _render: unknown, row: { id: string }) => ({ name: row.id }),
    );
    spyOn<any>(service, 'processTableCells');

    service['processTableRowsWithSharedDimensions'](
      {} as any,
      {} as any,
      [
        { type: 'tr', id: 'row-one' },
        { type: 'tr', id: 'row-two' },
      ],
      { name: 'body-section' } as any,
      [],
      { sharedRowHeight: 75, sharedColumnWidths: [200], sectionStartY: 75 },
      'body-section',
    );

    expect(createRow.calls.argsFor(0)[5]).toBe(0);
    expect(createRow.calls.argsFor(1)[5]).toBe(75);
  });

  it('registers semantic table descendants for selector matching', () => {
    const { service, ancestry } = createService();
    const table = { type: 'table' as const, id: 'table' };
    const body = { type: 'tbody' as const, children: [] as any[] };
    const row = { type: 'tr' as const, children: [] as any[] };
    const cell = { type: 'td' as const, id: 'cell' };
    body.children = [row];
    row.children = [cell];

    service['registerTableAncestry']([body], table);

    expect(ancestry.getParent(body)).toBe(table);
    expect(ancestry.getParent(row)).toBe(body);
    expect(ancestry.getParent(cell)).toBe(row);
  });
});
