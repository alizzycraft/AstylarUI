import { ParityFixture } from '../parity.types';

export const tableCellControlContentBoxFixture: ParityFixture = {
  id: 'table-cell-control-content-box',
  title: 'Control inside a padded table cell',
  category: 'lists-tables-images',
  expectedBehavior:
    'A nested visual control is positioned from the padded content origin of its table cell at every representative viewport.',
  measurementIds: [
    'cell-control-table',
    'cell-control-row',
    'cell-control-copy-cell',
    'cell-control-action-cell',
    'cell-control-action',
  ],
  viewportIds: ['desktop', 'tablet', 'mobile'],
  reference: {
    html: '<table id="cell-control-table"><colgroup><col style="width:210px"><col style="width:150px"></colgroup><tbody><tr id="cell-control-row"><td id="cell-control-copy-cell"><div id="cell-control-copy">Selected record</div></td><td id="cell-control-action-cell"><input id="cell-control-action" type="button" value="View record"></td></tr></tbody></table>',
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #f8fafc; font-family: Arial, sans-serif; color: #172554; }
      #cell-control-table { box-sizing: border-box; position: absolute; left: 220px; top: 160px; width: 360px; height: 120px; margin: 0; padding: 0; border: 0; border-spacing: 0; table-layout: fixed; background: #ffffff; font: 14px/20px Arial, sans-serif; }
      #cell-control-row { height: 120px; margin: 0; padding: 0; border: 0; }
      #cell-control-copy-cell, #cell-control-action-cell { box-sizing: border-box; height: 120px; margin: 0; padding: 20px 16px; border: 0; vertical-align: top; }
      #cell-control-copy-cell { background: #dbeafe; }
      #cell-control-action-cell { background: #e0e7ff; }
      #cell-control-copy { box-sizing: border-box; width: 178px; height: 36px; margin: 0; padding: 8px; border: 0; background: #bfdbfe; color: #1e3a8a; font: 700 14px/20px Arial, sans-serif; }
      #cell-control-action { appearance: none; box-sizing: border-box; width: 118px; height: 36px; margin: 0; padding: 7px 10px; border: 0; border-radius: 4px; background: #4338ca; color: #ffffff; font: 700 13px/22px Arial, sans-serif; text-align: center; }
      @media (max-width: 700px) { #cell-control-table { left: 140px; top: 180px; } }
      @media (max-width: 500px) { #cell-control-table { left: 15px; top: 160px; } }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f8fafc', fontFamily: 'Arial, sans-serif', color: '#172554' },
      { selector: '#cell-control-table', boxSizing: 'border-box', position: 'absolute', left: '220px', top: '160px', width: '360px', height: '120px', margin: '0', padding: '0', borderWidth: '0', borderStyle: 'none', background: '#ffffff', fontFamily: 'Arial, sans-serif', fontSize: '14px', lineHeight: '20px' },
      { selector: '#cell-control-row', height: '120px', margin: '0', padding: '0', borderWidth: '0', borderStyle: 'none' },
      { selector: '#cell-control-copy-cell, #cell-control-action-cell', boxSizing: 'border-box', height: '120px', margin: '0', padding: '20px 16px', borderWidth: '0', borderStyle: 'none', verticalAlign: 'top' },
      { selector: '#cell-control-copy-cell', background: '#dbeafe' },
      { selector: '#cell-control-action-cell', background: '#e0e7ff' },
      { selector: '#cell-control-copy', boxSizing: 'border-box', width: '178px', height: '36px', margin: '0', padding: '8px', borderWidth: '0', borderStyle: 'none', background: '#bfdbfe', color: '#1e3a8a', fontFamily: 'Arial, sans-serif', fontSize: '14px', fontWeight: '700', lineHeight: '20px' },
      { selector: '#cell-control-action', boxSizing: 'border-box', width: '118px', height: '36px', margin: '0', padding: '7px 10px', borderWidth: '0', borderStyle: 'none', borderRadius: '4px', background: '#4338ca', color: '#ffffff', fontFamily: 'Arial, sans-serif', fontSize: '13px', fontWeight: '700', lineHeight: '22px', textAlign: 'center' },
      { selector: '#cell-control-table', mediaMaxWidth: '700px', left: '140px', top: '180px' },
      { selector: '#cell-control-table', mediaMaxWidth: '500px', left: '15px', top: '160px' },
    ],
    root: {
      children: [{
        type: 'table',
        id: 'cell-control-table',
        children: [
          {
            type: 'colgroup',
            children: [
              { type: 'col', tableProperties: { width: '210px' } },
              { type: 'col', tableProperties: { width: '150px' } },
            ],
          },
          {
            type: 'tbody',
            children: [{
              type: 'tr',
              id: 'cell-control-row',
              children: [
                {
                  type: 'td',
                  id: 'cell-control-copy-cell',
                  children: [{ type: 'div', id: 'cell-control-copy', textContent: 'Selected record' }],
                },
                {
                  type: 'td',
                  id: 'cell-control-action-cell',
                  children: [{ type: 'input', inputType: 'button', id: 'cell-control-action', value: 'View record' }],
                },
              ],
            }],
          },
        ],
      }],
    },
  },
};
