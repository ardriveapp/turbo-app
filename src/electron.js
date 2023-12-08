// main.ts
import { app, BrowserWindow } from "electron";
import * as path from "path";
import * as url from "url";

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
    },
  });
  console.log("win", win);

  // Load your Vite build output (adjust the path as needed)
  // win.loadFile(path.join("../dist", "index.html"));

  win.loadURL(
    // eslint-disable-next-line no-undef
    process.env.NODE_ENV === "production"
      ? url.format({
          pathname: path.join(
            new URL(".", import.meta.url).pathname,
            "../dist/index.html",
          ),
          protocol: "file:",
          slashes: true,
        })
      : "http://localhost:5173",
  );
  // win.loadFile(
  //   path.join(new URL(".", import.meta.url).pathname, "../dist/index.html"),
  // );

  // Handle 'ready-to-show' event
  win.once("ready-to-show", () => {
    console.log("ready-to-show");
    // Navigate to the desired route
    win.webContents.send("navigate", "/gift");
    win.show();
  });
}

app.whenReady().then(() => {
  console.log("whenReady");
  createWindow();

  app.on("activate", () => {
    console.log("activate");
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  // eslint-disable-next-line no-undef
  if (process.platform !== "darwin") {
    app.quit();
  }
});
