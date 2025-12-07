// main.js (CommonJS)
// --------------------------
const { app, BrowserWindow, Menu } = require("electron");
const path = require("path");

const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 650,
    autoHideMenuBar: true,
    titleBarStyle: "hiddenInset",
    icon: path.join(__dirname, "../public/icons/app.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js")
    }
  });

  // Remove default app menu to make it feel like a standalone player
  Menu.setApplicationMenu(null);
  win.setMenuBarVisibility(false);

  if (isDev) {
    // 开发模式 → 加载 Vite 开发服务器
    win.loadURL("http://localhost:5173");
  } else {
    // 生产模式 → 加载 vite build 后生成的 index.html
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
