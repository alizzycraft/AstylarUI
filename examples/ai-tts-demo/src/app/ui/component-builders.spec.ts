import { button, historyCard, playerCard, selectControl, statusBanner, textControl } from './component-builders';

describe('TTS demo component builders', () => {
  it('expresses button variants and disabled state without renderer internals', () => {
    expect(button('save', 'Save', 'primary', true)).toEqual(jasmine.objectContaining({
      type: 'button',
      id: 'save',
      value: 'Save',
      disabled: true,
      class: 'ui-button ui-button-primary',
    }));
  });

  it('builds labelled and described text and select controls', () => {
    const text = textControl({ id: 'prompt', label: 'Prompt', value: '', description: 'Required' });
    const select = selectControl({
      id: 'voice',
      label: 'Voice',
      value: 'alloy',
      options: [{ value: 'alloy', label: 'Alloy' }],
      description: 'Choose a voice',
    });

    expect(text.children?.[0]).toEqual(jasmine.objectContaining({ type: 'label', for: 'prompt' }));
    expect(text.children?.[1]).toEqual(jasmine.objectContaining({
      id: 'prompt', ariaDescribedby: 'prompt-description',
    }));
    expect(select.children?.[0]).toEqual(jasmine.objectContaining({ type: 'label', for: 'voice' }));
    expect(select.children?.[1]).toEqual(jasmine.objectContaining({
      type: 'select', id: 'voice', ariaDescribedby: 'voice-description',
    }));
  });

  it('builds semantic status, progress, and history components from view state', () => {
    const status = statusBanner('error', 'Enter some text.');
    const player = playerCard({
      idPrefix: 'selected',
      title: 'Preview',
      voice: 'alloy',
      currentTimeLabel: '0:01',
      durationLabel: '0:02',
      progressPercent: 50,
      playing: true,
    });
    const history = historyCard({
      id: 'speech-1',
      title: 'Preview',
      text: 'Hello',
      voice: 'alloy',
      createdLabel: 'Just now',
      sizeLabel: '1 KB',
      durationLabel: '0:02',
      formatLabel: 'MP3',
    }, { selected: true, playing: false });

    expect(status).toEqual(jasmine.objectContaining({ role: 'alert', ariaLive: 'assertive' }));
    expect(JSON.stringify(player)).toContain('Playback progress');
    expect(JSON.stringify(player)).toContain('50 percent played');
    expect(history).toEqual(jasmine.objectContaining({
      id: 'history-speech-1',
      ariaCurrent: true,
    }));
  });
});
