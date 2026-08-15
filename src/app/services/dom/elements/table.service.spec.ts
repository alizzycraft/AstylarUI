import { TableService } from './table.service';

describe('TableService', () => {
  it('honors explicit pixel column definitions', () => {
    const service = new TableService();

    const widths = service['resolveColumnWidths'](
      [{ width: '120px', span: 1 }, { width: '240px', span: 1 }],
      360,
      2,
    );

    expect(widths).toEqual([120, 240]);
  });

  it('distributes remaining width across undefined columns', () => {
    const service = new TableService();

    const widths = service['resolveColumnWidths'](
      [{ width: '25%', span: 1 }, { span: 1 }, { span: 1 }],
      400,
      3,
    );

    expect(widths).toEqual([100, 150, 150]);
  });
});
