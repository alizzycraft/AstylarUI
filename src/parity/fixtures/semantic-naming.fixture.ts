import { SiteData } from '../../app/types/site-data';
import { ParityFixture } from '../parity.types';

const shellStyles = [
  { selector: 'root', background: '#f8fafc', fontFamily: 'Arial, sans-serif' },
  { selector: '#naming-shell', position: 'absolute', left: '40px', top: '36px', width: '720px', height: '520px', opacity: '0' },
  { selector: '#naming-shell *', opacity: '0', color: 'transparent', background: 'transparent', borderColor: 'transparent' },
] as SiteData['styles'];

function namingSiteData(state: 0 | 1 | 2): SiteData {
  const updated = state > 0;
  const missingReferences = state === 2;
  const label = updated ? 'Workspace name' : 'Project name';
  const help = updated ? 'Visible to teammates.' : 'Shown on shared reports.';
  return {
    styles: shellStyles,
    root: {
      children: [{
        type: 'div', id: 'naming-shell', children: [
          { type: 'label', id: 'name-label', for: 'name-control', textContent: label },
          {
            type: 'input', id: 'name-control', inputType: 'text', value: 'Atlas',
            ariaLabel: missingReferences ? 'Fallback explicit name' : undefined,
            ariaLabelledby: missingReferences ? 'removed-label' : undefined,
            ariaDescribedby: missingReferences ? 'removed-help' : 'name-help',
          },
          { type: 'p', id: 'name-help', textContent: help },
          {
            type: 'button', id: 'named-action', inputType: 'button',
            textContent: updated ? 'Continue' : 'Add',
            ariaLabel: updated ? 'Create workspace' : 'Create project',
          },
          {
            type: 'section', id: 'labelled-panel',
            ariaLabelledby: missingReferences ? 'removed-title' : 'panel-title panel-title',
            ariaDescribedby: missingReferences ? 'removed-description' : 'panel-description',
            children: [
              ...(missingReferences ? [] : [
                { type: 'h2' as const, id: 'panel-title', textContent: updated ? 'Workspace details' : 'Project details' },
                { type: 'p' as const, id: 'panel-description', textContent: updated ? 'Current workspace metadata.' : 'Current project metadata.' },
              ]),
              { type: 'p', textContent: 'Panel body.' },
            ],
          },
          { type: 'img', id: 'named-image', src: '/assets/parity/checker.svg', alt: updated ? 'Workspace preview' : 'Project preview' },
        ],
      }],
    },
  };
}

function referenceShell(state: 1 | 2): string {
  const missingReferences = state === 2;
  return `
    <label id="name-label" for="name-control">Workspace name</label>
    <input id="name-control" type="text" value="Atlas" ${missingReferences
      ? 'aria-label="Fallback explicit name" aria-labelledby="removed-label" aria-describedby="removed-help"'
      : 'aria-describedby="name-help"'}>
    <p id="name-help">Visible to teammates.</p>
    <button id="named-action" type="button" aria-label="Create workspace">Continue</button>
    <section id="labelled-panel" ${missingReferences
      ? 'aria-labelledby="removed-title" aria-describedby="removed-description"'
      : 'aria-labelledby="panel-title panel-title" aria-describedby="panel-description"'}>
      ${missingReferences ? '' : '<h2 id="panel-title">Workspace details</h2><p id="panel-description">Current workspace metadata.</p>'}
      <p>Panel body.</p>
    </section>
    <img id="named-image" src="/assets/parity/checker.svg" alt="Workspace preview">`;
}

export const semanticNamingFixture: ParityFixture = {
  id: 'semantic-naming',
  title: 'Accessible names and descriptions',
  category: 'accessibility-semantics',
  expectedBehavior:
    'Native labels, element text and alt text, aria-label, aria-labelledby, and aria-describedby produce browser-equivalent names/descriptions and remain synchronized through updates with safe missing, repeated, and removed references.',
  measurementIds: ['naming-shell'],
  semanticIds: [
    'name-label', 'name-control', 'name-help', 'named-action',
    'labelled-panel', 'panel-title', 'panel-description', 'named-image',
  ],
  reference: {
    html: `
      <div id="naming-shell">
        <label id="name-label" for="name-control">Project name</label>
        <input id="name-control" type="text" value="Atlas" aria-describedby="name-help">
        <p id="name-help">Shown on shared reports.</p>
        <button id="named-action" type="button" aria-label="Create project">Add</button>
        <section id="labelled-panel" aria-labelledby="panel-title panel-title" aria-describedby="panel-description">
          <h2 id="panel-title">Project details</h2><p id="panel-description">Current project metadata.</p><p>Panel body.</p>
        </section>
        <img id="named-image" src="/assets/parity/checker.svg" alt="Project preview">
      </div>`,
    css: `
      #parity-reference-viewport{position:relative;overflow:hidden;background:#f8fafc;font-family:Arial,sans-serif}
      #naming-shell{position:absolute;left:40px;top:36px;width:720px;height:520px;opacity:0}
      #naming-shell *{opacity:0!important;color:transparent!important;background:transparent!important;border-color:transparent!important}
    `,
  },
  siteData: namingSiteData(0),
  dynamicSteps: [
    {
      id: 'updated-names',
      referenceMutations: [
        { type: 'set-children', elementId: 'naming-shell', html: referenceShell(1) },
      ],
      siteData: namingSiteData(1),
    },
    {
      id: 'missing-references',
      referenceMutations: [
        { type: 'set-children', elementId: 'naming-shell', html: referenceShell(2) },
      ],
      siteData: namingSiteData(2),
    },
  ],
};
