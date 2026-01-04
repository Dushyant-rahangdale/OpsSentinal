import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pagePath = path.resolve(__dirname, '../../src/app/(app)/analytics/page.tsx');
const cssPath = path.resolve(__dirname, '../../src/app/(app)/analytics/analytics-v2.css');

describe('Analytics panel structure', () => {
  it('contains expected panel hooks in the analytics page', () => {
    const page = readFileSync(pagePath, 'utf8');
    const hooks = [
      'v2-panel-insights',
      'v2-panel-trends',
      'v2-panel-heading',
      'distribution-grid',
      'distribution-card',
      'insights-panel',
      'trends-panel',
      'operational-grid',
      'operational-card',
      'ownership-grid',
      'ownership-card',
      'service-health-section',
      'service-health-shell',
      'activity-panel',
    ];

    hooks.forEach(hook => {
      expect(page).toContain(hook);
    });
  });

  it('defines styles for panel hooks', () => {
    const css = readFileSync(cssPath, 'utf8');
    const selectors = [
      '.v2-panel-insights',
      '.v2-panel-trends',
      '.v2-panel-heading',
      '.distribution-grid',
      '.distribution-card',
      '.insights-panel',
      '.trends-panel',
      '.operational-grid',
      '.operational-card',
      '.ownership-grid',
      '.ownership-card',
      '.service-health-section',
      '.service-health-shell',
      '.activity-panel',
    ];

    selectors.forEach(selector => {
      expect(css).toContain(selector);
    });
  });
});
