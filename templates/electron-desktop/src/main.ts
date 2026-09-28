import path from 'node:path';
import { app, BrowserWindow } from 'electron';
import { secureWindowOptions } from './window-options';

function createWindow(): void {
  const win = new BrowserWindow(secureWindowOptions(path.join(__dirname, 'preload.js')));
  win.loadFile(path.join(__dirname, '../src/renderer/index.html'));
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
