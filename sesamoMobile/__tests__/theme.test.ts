import { Colors } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

describe('Theme System', () => {
  it('defines required color tokens for light mode', () => {
    expect(Colors.light.primary).toBeDefined();
    expect(Colors.light.background).toBeDefined();
    expect(Colors.light.surface).toBeDefined();
    expect(Colors.light.onSurface).toBeDefined();
    expect(Colors.light.error).toBeDefined();
    expect(Colors.light.text).toBe(Colors.light.onSurface);
  });

  it('defines required color tokens for dark mode', () => {
    expect(Colors.dark.primary).toBeDefined();
    expect(Colors.dark.background).toBeDefined();
    expect(Colors.dark.surface).toBeDefined();
    expect(Colors.dark.onSurface).toBeDefined();
    expect(Colors.dark.error).toBeDefined();
    expect(Colors.dark.text).toBe(Colors.dark.onSurface);
  });

  it('useThemeColor respects custom prop overrides when provided', () => {
    const customColor = useThemeColor({ light: '#ff0000', dark: '#00ff00' }, 'primary');
    // In test environment (defaults to light or dark), it should return either override
    expect(['#ff0000', '#00ff00']).toContain(customColor);
  });

  it('useThemeColor falls back to theme palette when no override given', () => {
    const resolvedColor = useThemeColor({}, 'primary');
    expect([Colors.light.primary, Colors.dark.primary]).toContain(resolvedColor);
  });
});
