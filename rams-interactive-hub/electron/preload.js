const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  isElectron: true,
  getMediaRoot: () => ipcRenderer.invoke('get-media-root'),
  getProjectsData: () => ipcRenderer.invoke('get-projects-data'),
  getMediaStats: () => ipcRenderer.invoke('get-media-stats'),
  getDiagnostics: () => ipcRenderer.invoke('get-diagnostics'),
  onOpenAdmin: (callback) => ipcRenderer.on('open-admin', callback),
});
