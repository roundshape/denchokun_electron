# Xojo → Electron リプレイス指示書（claude.md）

> 目的: 既存の Xojo 製デスクトップアプリを、Electron（Node.js + Web 技術）で等価機能／改善点込みで再実装する。開発環境は **Windows 10/11** を前提とする。
>
> **備考**: 旧 Xojo ソースコードは `../denchokun` 下に配置されている。

---

## 0. 前提とゴール
- **開発環境**: Windows 10/11
- **対応 OS**: macOS (Intel/Apple Silicon), Windows 10/11, Linux (Ubuntu LTS)
- **ビルド**: 1 レポジトリから全プラットフォーム向けパッケージを生成（electron-builder 推奨）
- **UI 技術**: HTML/CSS/TypeScript（UI フレームワークは後述）
- **自動更新**: electron-updater で実装（GitHub Releases or S3/自社サーバ）
- **サイン**: macOS notarization、Windows code signing（証明書準備）
- **テレメトリ／クラッシュ**: Sentry など（任意）

---

## 1. Xojo 機能棚卸し（現状把握）
次を箇条書きで洗い出す（最重要）。
- 画面一覧（ウインドウ、ダイアログ、メニュー）
- 各画面の入出力（ファイル I/O、DB、ネットワーク、印刷、クリップボード）
- OS 依存機能（AppleScript、レジストリ、Launch Services など）
- プラグイン依存、ライセンス条件
- 既知の不具合／改善要望

> **納品物**: `docs/inventory.md` に Markdown で記載。

---

## 2. 技術方針
- **アーキテクチャ**: Main（Electron main process）/ Preload / Renderer（Web UI）の三層 + IPC（contextBridge）
- **セキュリティ既定**: `nodeIntegration: false`、`contextIsolation: true`、`preload` で最小 API のみ公開
- **パッケージャ**: electron-builder（mac/Win/Linux を一元化）
- **バンドラ**: Vite（軽量・高速）
- **言語**: TypeScript（strict）
- **UI**: 
  - 軽量: Vanilla + Tailwind
  - かんたん: React + Tailwind（推奨）
- **状態管理**: 小規模は React Query / Zustand、要件に応じて選定
- **DB**: SQLite（`better-sqlite3`）または IndexedDB（UI 側）

---

## 3. 環境構築（Windows 前提コマンド）
```bash
# Node.js インストール（推奨: Volta または nvm-windows で固定）
volta install node@20

# 雛形作成（electron-vite）
npm create electron-vite@latest xojo-to-electron -- --template react-ts
cd xojo-to-electron
npm install

# electron-builder 導入
npm install -D electron-builder

# 実行
npm run dev
# ビルド
npm run build
npm run build:win   # Windows 用
npm run build:mac   # macOS 用（Windows ではクロスビルド不可。Mac が必要）
npm run build:linux # Linux 用
```

※ Windows 上で macOS アプリをビルドすることはできないため、macOS 環境が別途必要。

---

## 4. ディレクトリ構成（例）
```
xojo-to-electron/
  ├─ src/
  │   ├─ main/        # Electron main（プロセス管理, app lifecycle, menu）
  │   ├─ preload/     # contextBridge で安全に API を公開
  │   └─ renderer/    # React + TS の UI（Vite）
  ├─ assets/
  ├─ build/           # アイコン等
  ├─ dist-*/          # ビルド成果物
  └─ docs/
      └─ inventory.md
```

---

## 5. Xojo → Electron 機能マッピング

| Xojo 概念/機能 | Electron/Node 代替 | 備考 |
|---|---|---|
| Window / Menu | `BrowserWindow` / `Menu` | 複数ウインドウ可。native menu 対応。
| File I/O | `fs`, `dialog.showOpenDialog` | 大きな I/O は main 側で。
| DB(SQLite) | `better-sqlite3`（main） | 同期 API で簡潔・高速。
| ネット通信 | `fetch` / `axios` | Renderer 側で OK。CORS 注意不要（同一プロセス）。
| クリップボード | `clipboard` | 文字/画像対応。
| 印刷 | `webContents.print()` | プレビューダイアログは OS 依存。
| 設定保存 | `electron-store` | JSON ベース、暗号化可。
| タイマー/非同期 | JS の `setInterval`/Promise | UI ブロック回避。
| OS 統合 | `shell`, `nativeTheme`, `powerSaveBlocker` | 必要に応じて。

---

## 6. IPC 設計（最小権限）
**preload.ts**（例）
```ts
import { contextBridge, ipcRenderer } from 'electron'
contextBridge.exposeInMainWorld('api', {
  openFile: () => ipcRenderer.invoke('open-file'),
  readTextFile: (p: string) => ipcRenderer.invoke('read-text', p),
})
```
**main.ts**（例）
```ts
ipcMain.handle('open-file', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openFile'] })
  return canceled ? null : filePaths[0]
})
ipcMain.handle('read-text', async (_e, p: string) => fs.promises.readFile(p, 'utf8'))
```
**renderer**（例）
```ts
const path = await window.api.openFile()
if (path) {
  const text = await window.api.readTextFile(path)
}
```