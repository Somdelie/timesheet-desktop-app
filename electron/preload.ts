import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electron", {
  ipcRenderer: ipcRenderer,
  send: (channel: string, ...args: unknown[]) =>
    ipcRenderer.send(channel, ...args),
  windowControls: {
    minimize: () => ipcRenderer.send("window-minimize"),
    maximize: () => ipcRenderer.send("window-maximize"),
    close: () => ipcRenderer.send("window-close"),
    isMaximized: () => ipcRenderer.invoke("window-is-maximized"),
  },
  print: () => ipcRenderer.send("print-with-backgrounds"),
});
