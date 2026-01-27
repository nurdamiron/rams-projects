const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  getMediaRoot: () => ipcRenderer.invoke('get-media-root'),
  getProjectsData: () => ipcRenderer.invoke('get-projects-data'),
  isElectron: true,
  onOpenAdmin: (callback) => ipcRenderer.on('open-admin', callback),
});
