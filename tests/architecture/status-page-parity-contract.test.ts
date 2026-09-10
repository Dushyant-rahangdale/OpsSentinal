import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'fs';

const read = (path: string) => readFileSync(path, 'utf8');

describe('status page preview/live parity contract', () => {
  it('renders the same component on both surfaces', () => {
    // The regression this prevents: a second, smaller renderer was introduced for the public page
    // while the admin preview kept the full one, so an administrator could configure and approve
    // an experience visitors never received.
    const live = read('src/components/status-page/StatusPageSnapshotView.tsx');
    const preview = read('src/components/status-page/StatusPageLivePreview.tsx');

    expect(live).toContain('StatusPageExperience');
    expect(preview).toContain('StatusPageExperience');
  });

  it('keeps a single services renderer', () => {
    // Any new component that renders a list of public services is a fork of the experience and
    // will drift from it. Extend the restored renderer instead.
    const components = readdirSync('src/components/status-page');
    const serviceRenderers = components.filter(name =>
      /^(Public)?StatusPage(Public)?Services/.test(name)
    );
    expect(serviceRenderers).toEqual(['StatusPageServicesLegacy.tsx']);
  });

  it('shares one stylesheet between the document and the preview shadow root', () => {
    // Selector-matched rules do not cross a shadow boundary, so the two surfaces must render from
    // the same text rather than each carrying its own copy.
    const previewCss = read('src/lib/status-page-preview-css.ts');
    const experience = read('src/components/status-page/StatusPageExperience.tsx');

    expect(previewCss).toContain('STATUS_PAGE_PUBLIC_CSS');
    expect(experience).toContain('STATUS_PAGE_PUBLIC_CSS');
  });

  it('keeps Tailwind utilities out of the public components', () => {
    // They resolve from the document stylesheet, which the preview's shadow root never sees, so a
    // utility class here is a style that silently disappears in preview only.
    const publicComponents = [
      'StatusPageExperience',
      'StatusPageMetricsLegacy',
    ];
    // The token must stand alone: a hyphen counts as a word boundary, so a naive \bgrid\b also
    // matches project class names like `status-region-grid`.
    const utility =
      /className="[^"]*(?<![-\w])(?:mb-\d|mt-\d|p-\d|px-\d|py-\d|text-(?:sm|xs|lg|xl)|flex|grid|gap-\d|font-(?:bold|semibold)|w-full)(?![-\w])/;

    for (const name of publicComponents) {
      const source = read(`src/components/status-page/${name}.tsx`);
      expect(source, `${name} must not use Tailwind utilities`).not.toMatch(utility);
    }
  });

  it('derives no health severity in the presentation layer', () => {
    // Status is decided by the projection so every surface agrees. A component that maps urgency
    // to severity itself is a second, divergent status engine.
    const experience = read('src/components/status-page/StatusPageExperience.tsx');
    expect(experience).toContain('snapshot.services');
    expect(experience).not.toContain('calculateServiceUptime');
  });
});
