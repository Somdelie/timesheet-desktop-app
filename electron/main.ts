import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";

let mainWindow: BrowserWindow | null = null;
const childWindows: Set<BrowserWindow> = new Set();

function getIconPath() {
  const isDev = process.env.VITE_DEV_SERVER_URL;
  if (isDev) {
    return path.join(__dirname, "../public/logo.png");
  }
  return path.join(__dirname, "../dist/logo.png");
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    icon: getIconPath(),
    show: true,
    backgroundColor: "#ffffff",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: false,
    },
  });

  mainWindow.maximize();

  // Handle child windows (like print preview) to also be frameless
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    return {
      action: "allow",
      overrideBrowserWindowOptions: {
        frame: false,
        width: 1000,
        height: 750,
        icon: getIconPath(),
        backgroundColor: "#fafafa",
        webPreferences: {
          preload: path.join(__dirname, "preload.js"),
          contextIsolation: true,
          sandbox: false,
        },
      },
    };
  });

  // Track child windows and set up their window controls
  mainWindow.webContents.on("did-create-window", (childWindow) => {
    childWindows.add(childWindow);
    childWindow.on("closed", () => {
      childWindows.delete(childWindow);
    });
  });

  // Load splash screen immediately (local file, instant)
  // Load splash screen immediately (local file, instant)
  mainWindow.loadFile(path.join(__dirname, "splash.html"));

  const isDev = process.env.VITE_DEV_SERVER_URL;

  // After splash is shown, load the actual app
  mainWindow.webContents.once("did-finish-load", () => {
    if (isDev) {
      mainWindow?.loadURL(isDev);
      mainWindow?.webContents.openDevTools();
    } else {
      mainWindow?.loadFile(path.join(__dirname, "../dist/index.html"));
    }
  });
}

ipcMain.handle("ping", async () => "pong");

// Use focused window for IPC so child windows can also use window controls
ipcMain.on("window-minimize", () => {
  const win = BrowserWindow.getFocusedWindow();
  win?.minimize();
});

ipcMain.on("window-maximize", () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win?.isMaximized()) {
    win.unmaximize();
  } else {
    win?.maximize();
  }
});

ipcMain.on("window-close", () => {
  const win = BrowserWindow.getFocusedWindow();
  win?.close();
});

ipcMain.handle("window-is-maximized", () => {
  const win = BrowserWindow.getFocusedWindow();
  return win?.isMaximized() ?? false;
});

ipcMain.on("print-with-backgrounds", () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    win.webContents.print({
      silent: false,
      printBackground: true,
    });
  }
});

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});
