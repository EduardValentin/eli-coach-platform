import { describe, it, expect, afterEach } from 'vitest';
import { resolveTokenColors } from './tokenColors';

function declareTokens(declarations: string): void {
  const style = document.createElement('style');
  style.dataset.testTokens = 'true';
  style.textContent = `:root { ${declarations} }`;
  document.head.appendChild(style);
}

afterEach(() => {
  document.head.querySelectorAll('[data-test-tokens]').forEach(node => node.remove());
});

describe('resolveTokenColors', () => {
  it('returns each token as a hex colour a colour-parsing library can read', () => {
    // arrange
    declareTokens('--test-brand: #C81D6B; --test-secondary: #00796B;');

    // act
    const colors = resolveTokenColors(['--test-brand', '--test-secondary']);

    // assert
    expect(colors).toEqual(['#c81d6b', '#00796b']);
  });

  it('normalises a token the CSS minifier rewrote to a named colour', () => {
    // arrange — Lightning CSS ships #FFD700 as the shorter `gold`
    declareTokens('--test-celebration: gold;');

    // act
    const colors = resolveTokenColors(['--test-celebration']);

    // assert
    expect(colors).toEqual(['#ffd700']);
  });

  it('drops tokens that are undeclared or not colours', () => {
    // arrange
    declareTokens('--test-real: #123456; --test-bogus: not-a-colour;');

    // act
    const colors = resolveTokenColors(['--test-real', '--test-missing', '--test-bogus']);

    // assert
    expect(colors).toEqual(['#123456']);
  });
});
