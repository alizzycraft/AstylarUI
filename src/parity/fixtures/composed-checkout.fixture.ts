import { ParityFixture } from '../parity.types';

export const composedCheckoutFixture: ParityFixture = {
  id: 'composed-checkout',
  title: 'Composed checkout form',
  category: 'composed-application',
  expectedBehavior:
    'A semantic checkout form composes a positioned fieldset, mixed controls, aligned actions, and a flex order summary without renderer-specific structure.',
  measurementIds: [
    'checkout-shell', 'checkout-form', 'checkout-title', 'checkout-fields', 'checkout-legend',
    'checkout-name-label', 'checkout-name', 'checkout-plan-label', 'checkout-plan',
    'checkout-consent', 'checkout-consent-label', 'checkout-actions', 'checkout-back', 'checkout-submit',
    'checkout-summary', 'checkout-summary-title', 'checkout-subtotal', 'checkout-tax', 'checkout-total',
  ],
  reference: {
    html: `
      <section id="checkout-shell">
        <form id="checkout-form">
          <h1 id="checkout-title">Complete your order</h1>
          <fieldset id="checkout-fields">
            <legend id="checkout-legend">Billing details</legend>
            <label id="checkout-name-label">Account name</label><input id="checkout-name" type="text" value="Astylar Studio">
            <label id="checkout-plan-label">Plan</label><select id="checkout-plan"><option selected>Team annual</option></select>
            <input id="checkout-consent" type="checkbox" checked><label id="checkout-consent-label">Email me renewal reminders</label>
          </fieldset>
          <div id="checkout-actions"><input id="checkout-back" type="button" value="Go back"><input id="checkout-submit" type="button" value="Place order"></div>
        </form>
        <aside id="checkout-summary">
          <h2 id="checkout-summary-title">Order summary</h2>
          <div id="checkout-subtotal"><span>Subtotal</span><strong>$240</strong></div>
          <div id="checkout-tax"><span>Tax</span><strong>$36</strong></div>
          <div id="checkout-total"><span>Total</span><strong>$276</strong></div>
        </aside>
      </section>
    `,
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #e2e8f0; font-family: Arial, sans-serif; }
      #checkout-shell { box-sizing: border-box; display: flex; flex-direction: row; gap: 24px; position: absolute; left: 50px; top: 40px; width: 700px; height: 520px; margin: 0; padding: 32px; border: 0; background: #ffffff; }
      #checkout-form { box-sizing: border-box; display: flex; flex: 0 0 420px; flex-direction: column; gap: 16px; width: 420px; height: 456px; margin: 0; padding: 0; border: 0; }
      #checkout-title { box-sizing: border-box; width: 420px; height: 40px; margin: 0; padding: 4px 0; border: 0; color: #0f172a; font: 700 24px/32px Arial, sans-serif; text-align: left; }
      #checkout-fields { box-sizing: border-box; position: relative; width: 420px; height: 336px; margin: 0; padding: 0; border: 0; background: #f8fafc; }
      #checkout-legend { box-sizing: border-box; position: absolute; left: 20px; top: 16px; width: 200px; height: 28px; margin: 0; padding: 2px 0; border: 0; color: #1e3a8a; font: 700 16px/24px Arial, sans-serif; }
      #checkout-name-label, #checkout-plan-label, #checkout-consent-label { box-sizing: border-box; position: absolute; margin: 0; padding: 0; border: 0; color: #334155; font: 700 14px/24px Arial, sans-serif; text-align: left; }
      #checkout-name-label { left: 20px; top: 60px; width: 180px; height: 24px; }
      #checkout-name { appearance: none; box-sizing: border-box; position: absolute; left: 20px; top: 84px; width: 380px; height: 44px; margin: 0; padding: 10px 12px; border: 2px solid #cbd5e1; border-radius: 6px; background: #ffffff; color: #0f172a; font: 400 14px/20px Arial, sans-serif; text-align: left; }
      #checkout-plan-label { left: 20px; top: 148px; width: 180px; height: 24px; }
      #checkout-plan { appearance: none; box-sizing: border-box; position: absolute; left: 20px; top: 172px; width: 380px; height: 44px; margin: 0; padding: 10px 12px; border: 2px solid #cbd5e1; border-radius: 6px; background: #ffffff; color: #0f172a; font: 400 14px/20px Arial, sans-serif; text-align: left; }
      #checkout-consent { appearance: none; box-sizing: border-box; position: absolute; left: 20px; top: 244px; width: 20px; height: 20px; margin: 0; padding: 0; border: 2px solid #2563eb; border-radius: 4px; background: #2563eb; }
      #checkout-consent-label { left: 52px; top: 242px; width: 300px; height: 24px; font-weight: 400; }
      #checkout-actions { box-sizing: border-box; display: flex; flex-direction: row; justify-content: flex-end; gap: 12px; width: 420px; height: 48px; margin: 0; padding: 4px 0; border: 0; }
      #checkout-back, #checkout-submit { appearance: none; box-sizing: border-box; height: 40px; margin: 0; padding: 8px 12px; border: 0; border-radius: 6px; font: 700 14px/24px Arial, sans-serif; text-align: center; }
      #checkout-back { width: 100px; background: #e2e8f0; color: #334155; }
      #checkout-submit { width: 124px; background: #2563eb; color: #ffffff; }
      #checkout-summary { box-sizing: border-box; display: flex; flex: 0 0 192px; flex-direction: column; gap: 12px; width: 192px; height: 456px; margin: 0; padding: 24px; border: 0; background: #eff6ff; }
      #checkout-summary-title { box-sizing: border-box; width: 144px; height: 56px; margin: 0; padding: 4px 0; border: 0; color: #1e3a8a; font: 700 20px/24px Arial, sans-serif; text-align: left; }
      #checkout-subtotal, #checkout-tax, #checkout-total { box-sizing: border-box; display: flex; flex-direction: row; justify-content: space-between; align-items: center; width: 144px; height: 44px; margin: 0; padding: 10px 0; border: 0; color: #334155; font: 400 14px/24px Arial, sans-serif; }
      #checkout-subtotal span, #checkout-tax span, #checkout-total span { width: 80px; height: 24px; }
      #checkout-subtotal strong, #checkout-tax strong, #checkout-total strong { width: 52px; height: 24px; font-weight: 700; text-align: right; }
      #checkout-total { margin-top: 8px; color: #0f172a; font-weight: 700; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#e2e8f0', fontFamily: 'Arial, sans-serif' },
      { selector: '#checkout-shell', boxSizing: 'border-box', display: 'flex', flexDirection: 'row', gap: '24px', position: 'absolute', left: '50px', top: '40px', width: '700px', height: '520px', margin: '0', padding: '32px', borderWidth: '0', background: '#ffffff' },
      { selector: '#checkout-form', boxSizing: 'border-box', display: 'flex', flex: '0 0 420px', flexDirection: 'column', gap: '16px', width: '420px', height: '456px', margin: '0', padding: '0', borderWidth: '0' },
      { selector: '#checkout-title', boxSizing: 'border-box', width: '420px', height: '40px', margin: '0', padding: '4px 0', borderWidth: '0', color: '#0f172a', fontFamily: 'Arial, sans-serif', fontSize: '24px', fontWeight: '700', lineHeight: '32px', textAlign: 'left' },
      { selector: '#checkout-fields', boxSizing: 'border-box', position: 'relative', width: '420px', height: '336px', margin: '0', padding: '0', borderWidth: '0', background: '#f8fafc' },
      { selector: '#checkout-legend', boxSizing: 'border-box', position: 'absolute', left: '20px', top: '16px', width: '200px', height: '28px', margin: '0', padding: '2px 0', borderWidth: '0', color: '#1e3a8a', fontFamily: 'Arial, sans-serif', fontSize: '16px', fontWeight: '700', lineHeight: '24px' },
      { selector: '#checkout-name-label, #checkout-plan-label, #checkout-consent-label', boxSizing: 'border-box', position: 'absolute', margin: '0', padding: '0', borderWidth: '0', color: '#334155', fontFamily: 'Arial, sans-serif', fontSize: '14px', fontWeight: '700', lineHeight: '24px', textAlign: 'left' },
      { selector: '#checkout-name-label', left: '20px', top: '60px', width: '180px', height: '24px' },
      { selector: '#checkout-name', boxSizing: 'border-box', position: 'absolute', left: '20px', top: '84px', width: '380px', height: '44px', margin: '0', padding: '10px 12px', borderWidth: '2px', borderStyle: 'solid', borderColor: '#cbd5e1', borderRadius: '6px', background: '#ffffff', color: '#0f172a', fontFamily: 'Arial, sans-serif', fontSize: '14px', fontWeight: '400', lineHeight: '20px', textAlign: 'left' },
      { selector: '#checkout-plan-label', left: '20px', top: '148px', width: '180px', height: '24px' },
      { selector: '#checkout-plan', boxSizing: 'border-box', position: 'absolute', left: '20px', top: '172px', width: '380px', height: '44px', margin: '0', padding: '10px 12px', borderWidth: '2px', borderStyle: 'solid', borderColor: '#cbd5e1', borderRadius: '6px', background: '#ffffff', color: '#0f172a', fontFamily: 'Arial, sans-serif', fontSize: '14px', fontWeight: '400', lineHeight: '20px', textAlign: 'left' },
      { selector: '#checkout-consent', boxSizing: 'border-box', position: 'absolute', left: '20px', top: '244px', width: '20px', height: '20px', margin: '0', padding: '0', borderWidth: '2px', borderStyle: 'solid', borderColor: '#2563eb', borderRadius: '4px', background: '#2563eb' },
      { selector: '#checkout-consent-label', left: '52px', top: '242px', width: '300px', height: '24px', fontWeight: '400' },
      { selector: '#checkout-actions', boxSizing: 'border-box', display: 'flex', flexDirection: 'row', justifyContent: 'flex-end', gap: '12px', width: '420px', height: '48px', margin: '0', padding: '4px 0', borderWidth: '0' },
      { selector: '#checkout-back, #checkout-submit', boxSizing: 'border-box', height: '40px', margin: '0', padding: '8px 12px', borderWidth: '0', borderRadius: '6px', fontFamily: 'Arial, sans-serif', fontSize: '14px', fontWeight: '700', lineHeight: '24px', textAlign: 'center' },
      { selector: '#checkout-back', width: '100px', background: '#e2e8f0', color: '#334155' },
      { selector: '#checkout-submit', width: '124px', background: '#2563eb', color: '#ffffff' },
      { selector: '#checkout-summary', boxSizing: 'border-box', display: 'flex', flex: '0 0 192px', flexDirection: 'column', gap: '12px', width: '192px', height: '456px', margin: '0', padding: '24px', borderWidth: '0', background: '#eff6ff' },
      { selector: '#checkout-summary-title', boxSizing: 'border-box', width: '144px', height: '56px', margin: '0', padding: '4px 0', borderWidth: '0', color: '#1e3a8a', fontFamily: 'Arial, sans-serif', fontSize: '20px', fontWeight: '700', lineHeight: '24px', textAlign: 'left' },
      { selector: '#checkout-subtotal, #checkout-tax, #checkout-total', boxSizing: 'border-box', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '144px', height: '44px', margin: '0', padding: '10px 0', borderWidth: '0', color: '#334155', fontFamily: 'Arial, sans-serif', fontSize: '14px', fontWeight: '400', lineHeight: '24px' },
      { selector: '#checkout-subtotal span, #checkout-tax span, #checkout-total span', width: '80px', height: '24px' },
      { selector: '#checkout-subtotal strong, #checkout-tax strong, #checkout-total strong', width: '52px', height: '24px', fontWeight: '700', textAlign: 'right' },
      { selector: '#checkout-total', marginTop: '8px', color: '#0f172a', fontWeight: '700' },
    ],
    root: { children: [{ type: 'section', id: 'checkout-shell', children: [
      { type: 'form', id: 'checkout-form', children: [
        { type: 'h1', id: 'checkout-title', textContent: 'Complete your order' },
        { type: 'fieldset', id: 'checkout-fields', children: [
          { type: 'legend', id: 'checkout-legend', textContent: 'Billing details' },
          { type: 'label', id: 'checkout-name-label', textContent: 'Account name' },
          { type: 'input', inputType: 'text', id: 'checkout-name', value: 'Astylar Studio' },
          { type: 'label', id: 'checkout-plan-label', textContent: 'Plan' },
          { type: 'select', id: 'checkout-plan', value: 'team', options: [{ value: 'team', label: 'Team annual' }] },
          { type: 'input', inputType: 'checkbox', id: 'checkout-consent', checked: true },
          { type: 'label', id: 'checkout-consent-label', textContent: 'Email me renewal reminders' },
        ] },
        { type: 'div', id: 'checkout-actions', children: [
          { type: 'input', inputType: 'button', id: 'checkout-back', value: 'Go back' },
          { type: 'input', inputType: 'button', id: 'checkout-submit', value: 'Place order' },
        ] },
      ] },
      { type: 'aside', id: 'checkout-summary', children: [
        { type: 'h2', id: 'checkout-summary-title', textContent: 'Order summary' },
        { type: 'div', id: 'checkout-subtotal', children: [
          { type: 'span', textContent: 'Subtotal' }, { type: 'strong', textContent: '$240' },
        ] },
        { type: 'div', id: 'checkout-tax', children: [
          { type: 'span', textContent: 'Tax' }, { type: 'strong', textContent: '$36' },
        ] },
        { type: 'div', id: 'checkout-total', children: [
          { type: 'span', textContent: 'Total' }, { type: 'strong', textContent: '$276' },
        ] },
      ] },
    ] }] },
  },
};
