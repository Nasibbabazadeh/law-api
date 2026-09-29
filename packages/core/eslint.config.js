import { createConfig } from '@huquq/eslint-config';

// core runs in React Native too, so no Node globals here.
export default createConfig({ tsconfigRootDir: import.meta.dirname, node: false });
