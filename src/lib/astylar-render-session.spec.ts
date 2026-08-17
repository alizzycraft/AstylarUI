import { Scene } from '@babylonjs/core';
import { SiteData } from '../app/types/site-data';
import { AstylarRenderSession } from './astylar-render-session';

class ManualFrameScheduler {
  private nextHandle = 1;
  private readonly callbacks = new Map<number, () => void>();

  readonly request = jasmine.createSpy('requestFrame').and.callFake((callback: () => void) => {
    const handle = this.nextHandle++;
    this.callbacks.set(handle, callback);
    return handle;
  });

  readonly cancel = jasmine.createSpy('cancelFrame').and.callFake((handle: number) => {
    this.callbacks.delete(handle);
  });

  get pendingCount(): number {
    return this.callbacks.size;
  }

  flush(): void {
    const callbacks = [...this.callbacks.values()];
    this.callbacks.clear();
    callbacks.forEach((callback) => callback());
  }
}

const site = (textContent: string): SiteData => ({
  styles: [],
  root: { children: [{ type: 'p', id: 'copy', textContent }] },
});

describe('AstylarRenderSession', () => {
  const scene = {} as Scene;

  it('coalesces invalidations and renders the latest site data once per frame', async () => {
    const frames = new ManualFrameScheduler();
    const reflow = jasmine.createSpy('reflow');
    const session = new AstylarRenderSession(scene, site('initial'), reflow, {
      requestFrame: frames.request,
      cancelFrame: frames.cancel,
    });

    const manual = session.invalidate('manual');
    const updated = site('updated');
    const update = session.update(updated);

    expect(frames.pendingCount).toBe(1);
    expect(frames.request).toHaveBeenCalledTimes(1);
    frames.flush();
    const [manualResult, updateResult] = await Promise.all([manual, update]);

    expect(reflow).toHaveBeenCalledOnceWith(updated, ['manual', 'update']);
    expect(manualResult.revision).toBe(1);
    expect(updateResult.status).toBe('idle');
  });

  it('defers a re-entrant invalidation to a non-overlapping follow-up frame', async () => {
    const frames = new ManualFrameScheduler();
    let session!: AstylarRenderSession;
    let nestedSettlement!: Promise<unknown>;
    let reflowCount = 0;
    session = new AstylarRenderSession(scene, site('initial'), () => {
      reflowCount += 1;
      if (reflowCount === 1) {
        nestedSettlement = session.invalidate('asset');
      }
    }, {
      requestFrame: frames.request,
      cancelFrame: frames.cancel,
    });

    const initialSettlement = session.invalidate('initial');
    frames.flush();
    await Promise.resolve();
    await Promise.resolve();

    expect(reflowCount).toBe(1);
    expect(frames.pendingCount).toBe(1);
    frames.flush();
    await Promise.all([initialSettlement, nestedSettlement]);

    expect(reflowCount).toBe(2);
    expect(session.snapshot.revision).toBe(2);
  });

  it('never overlaps an invalidation raised while an asynchronous reflow is running', async () => {
    const frames = new ManualFrameScheduler();
    let finishFirst!: () => void;
    let reflowCount = 0;
    const session = new AstylarRenderSession(scene, site('initial'), () => {
      reflowCount += 1;
      if (reflowCount === 1) {
        return new Promise<void>((resolve) => finishFirst = resolve);
      }
      return undefined;
    }, {
      requestFrame: frames.request,
      cancelFrame: frames.cancel,
    });

    const first = session.invalidate('initial');
    frames.flush();
    await Promise.resolve();
    const second = session.invalidate('update');

    expect(session.snapshot.status).toBe('rendering');
    expect(frames.pendingCount).toBe(0);
    finishFirst();
    await Promise.resolve();
    await Promise.resolve();
    expect(frames.pendingCount).toBe(1);

    frames.flush();
    await Promise.all([first, second]);
    expect(reflowCount).toBe(2);
  });

  it('rejects the current settlement after a failed reflow and allows a retry', async () => {
    const frames = new ManualFrameScheduler();
    let shouldFail = true;
    const session = new AstylarRenderSession(scene, site('initial'), () => {
      if (shouldFail) throw new Error('render failed');
    }, {
      requestFrame: frames.request,
      cancelFrame: frames.cancel,
    });

    const failed = session.invalidate('initial');
    frames.flush();
    await expectAsync(failed).toBeRejectedWithError('render failed');
    expect(session.snapshot).toEqual({ revision: 0, status: 'idle', pendingReasons: [] });

    shouldFail = false;
    const retried = session.invalidate('manual');
    frames.flush();
    await expectAsync(retried).toBeResolved();
    expect(session.snapshot.revision).toBe(1);
  });

  it('cancels pending work and rejects settlement when disposed', async () => {
    const frames = new ManualFrameScheduler();
    const session = new AstylarRenderSession(scene, site('initial'), () => undefined, {
      requestFrame: frames.request,
      cancelFrame: frames.cancel,
    });

    const settlement = session.invalidate('initial');
    session.dispose();

    expect(frames.cancel).toHaveBeenCalledTimes(1);
    await expectAsync(settlement).toBeRejectedWithError(/disposed before settling/);
    expect(session.snapshot.status).toBe('disposed');
    expect(() => session.invalidate()).toThrowError(/session is disposed/);
  });
});
