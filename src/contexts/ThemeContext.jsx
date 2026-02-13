import React from 'react';

// Minimal theme context shim to satisfy imports during build.
// Returns a simple dark-mode boolean and a theme value.
export function useTheme() {
  // Detect prefers-color-scheme when available, but keep static for SSR/build.
  const [isDark, setIsDark] = React.useState(() => {
    try {
      return window?.matchMedia?.('(prefers-color-scheme: dark)')?.matches || false;
    } catch (e) {
      return false;
    }
  });

  const theme = isDark ? 'dark' : 'light';

  return { isDark, theme, setIsDark };
}

export default useTheme;
