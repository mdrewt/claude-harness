import { contextBridge } from 'electron';

// Expose a minimal, explicit API to the renderer. Never expose ipcRenderer raw.
contextBridge.exposeInMainWorld('app', {
  version: () => process.env.npm_package_version ?? '0.0.0',
});
