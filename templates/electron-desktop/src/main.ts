import path from 'node:path';
import { app, BrowserWindow } from 'electron';

// Secure-by-default window. See standards/domain/desktop.md.
function createWindow(): void {
  const win = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      contextIsolation: true, // REQUIRED: isolate preload from renderer
      nodeIntegration: false, // REQUIRED: no Node in the renderer
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  win.loadFile(path.join(__dirname, '../src/renderer/index.html'));
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
