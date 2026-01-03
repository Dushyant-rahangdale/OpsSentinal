import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pagePath = path.resolve(__dirname, '../../src/app/(app)/settings/system/page.tsx');
const cssPath = path.resolve(__dirname, '../../src/app/globals.css');

describe('system settings redesign', () => {
  it('adds system settings layout hooks', () => {
    const page = readFileSync(pagePath, 'utf8');
    const hooks = [
      'system-settings-shell',
      'system-settings-hero',
      'system-settings-grid',
      'system-settings-card',
      'system-settings-helper',
      'system-settings-meta-card',
      'system-settings-pill',
      'system-settings-empty',
    ];

    hooks.forEach(hook => {
      expect(page).toContain(hook);
    });
  });

  it('defines system settings styles', () => {
    const css = readFileSync(cssPath, 'utf8');
    const selectors = [
      '.system-settings-shell',
      '.system-settings-hero',
      '.system-settings-grid',
      '.system-settings-card',
      '.system-settings-helper',
      '.system-settings-meta-card',
      '.system-settings-pill',
      '.system-settings-empty',
    ];

    selectors.forEach(selector => {
      expect(css).toContain(selector);
    });
  });
});
