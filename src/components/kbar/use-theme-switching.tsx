import { useCallback, useMemo } from 'react';
import { useRegisterActions } from 'kbar';
import { useTheme } from 'next-themes';
import { useThemeConfig } from '@/components/themes/active-theme';
import { THEMES } from '@/components/themes/theme.config';

const useThemeSwitching = () => {
  const { theme, setTheme } = useTheme();
  const { activeTheme, setActiveTheme } = useThemeConfig();

  const toggleDarkLight = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  const cycleTheme = useCallback(() => {
    const currentIndex = THEMES.findIndex((t) => t.value === activeTheme);
    const nextIndex = (currentIndex + 1) % THEMES.length;
    setActiveTheme(THEMES[nextIndex].value);
  }, [activeTheme, setActiveTheme]);

  const themeActions = useMemo(
    () => [
      {
        id: 'cycleTheme',
        name: 'Switch Theme',
        shortcut: ['t', 't'],
        section: 'Theme',
        perform: cycleTheme
      },
      {
        id: 'toggleDarkLight',
        name: 'Toggle Dark/Light Mode',
        shortcut: ['d', 'd'],
        section: 'Theme',
        perform: toggleDarkLight
      },
      {
        id: 'setLightTheme',
        name: 'Set Light Theme',
        shortcut: [],
        section: 'Theme',
        perform: () => setTheme('light')
      },
      {
        id: 'setDarkTheme',
        name: 'Set Dark Theme',
        shortcut: [],
        section: 'Theme',
        perform: () => setTheme('dark')
      }
    ],
    [cycleTheme, toggleDarkLight, setTheme]
  );

  useRegisterActions(themeActions, [themeActions]);
};

export default useThemeSwitching;

