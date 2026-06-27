import { app, BrowserWindow } from "electron";
import { join } from "node:path";

import { createWindow } from "lib/electron-app/factories/windows/create";
import { ENVIRONMENT } from "shared/constants";

export async function MainWindow() {
  const window = createWindow({
    id: "main",
    title: "prompt play",
    width: 910,
    height: 550,
    minWidth: 910,
    minHeight: 550,
    maxWidth: 910,
    maxHeight: 550,
    resizable: true,
    show: false,
    autoHideMenuBar: false,
    backgroundColor: "#18191f",
    center: true,
    movable: true,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: {
      x: 15,
      y: 13,
    },

    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      webSecurity: true,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.webContents.on("did-finish-load", () => {
    window.show();
  });

  window.on("close", () => {
    for (const window of BrowserWindow.getAllWindows()) {
      if (!ENVIRONMENT.IS_DEV) {
        app.quit();
      }

      window.destroy();
    }
  });

  return window;
}
