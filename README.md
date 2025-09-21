# 電帳君 (Denchokun) - Electron版

電子帳簿保存法に対応したデジタル帳簿管理システムのElectron版です。

## プロジェクト概要

このプロジェクトは、[roundshape/denchokun](https://github.com/roundshape/denchokun)リポジトリのXojo製デスクトップアプリケーションを、**Electron + React + TypeScript**で完全にリニューアルするコンバートプロジェクトです。

### 関連プロジェクト

本プロジェクトは以下のサーバーサイドプロジェクトとの連携を前提として開発を進めています：

- **[roundshape/denchokunserver](https://github.com/roundshape/denchokunserver)** - メインAPIサーバー
- **[roundshape/previewserver](https://github.com/roundshape/previewserver)** - プレビュー機能サーバー

### 移行の目的

- **クロスプラットフォーム対応**：Windows専用からMac/Linux対応へ
- **モダンな技術スタック**：Web技術を活用した保守性の向上
- **MBSライセンス依存の解消**：オープンソース技術への移行
- **UI/UXの刷新**：より使いやすいインターフェースの実現

## 主な機能

- 📊 取引データ管理（日付、取引先、金額、種別）
- 📁 期間別の取引データ整理
- 🔍 検索・フィルタリング機能
- 📤 CSVエクスポート/インポート
- 🖼️ ファイルプレビュー機能
- 🖥️ クロスプラットフォーム対応（Windows/Mac/Linux）

## 技術スタック

- **クライアント**: Electron + React + TypeScript
- **スタイリング**: Tailwind CSS
- **API通信**: Fetch API (RESTful)
- **設定管理**: electron-store
- **ビルド**: Vite + electron-builder
- **サーバーサイド**: 
  - [denchokunserver](https://github.com/roundshape/denchokunserver) - データベース・API
  - [previewserver](https://github.com/roundshape/previewserver) - ファイルプレビュー

## 開発環境のセットアップ

### 必要要件

- **Node.js 18以上** - [公式サイト](https://nodejs.org/)からダウンロード
- **npm または yarn** - Node.jsに付属
- **Git** - バージョン管理用

### 開発環境構築手順

#### 1. リポジトリのクローン

```bash
git clone https://github.com/roundshape/denchokun_electron.git
cd denchokun_electron
```

#### 2. 依存関係のインストール

```bash
# npm を使用する場合
npm install

# または yarn を使用する場合
yarn install
```

#### 3. サーバーサイドの準備

このElectronアプリは以下のサーバーと連携するため、事前に起動しておく必要があります：

```bash
# 別のターミナルで denchokunserver を起動
# http://localhost:8080 で起動することを想定

# 別のターミナルで previewserver を起動  
# http://localhost:8081 で起動することを想定
```

#### 4. 開発サーバーの起動

```bash
# 開発モードで起動（Vite + Electron）
npm run dev
```

このコマンドで以下が同時に起動します：
- **Viteサーバー** (http://localhost:5173) - React開発サーバー
- **Electronアプリ** - デスクトップアプリケーション（サーバーAPI連携）

#### 4. 開発時の便利なコマンド

```bash
# キャッシュをクリアして起動
npm run dev:clean

# TypeScriptのコンパイルのみ
npm run build:electron

# Reactのビルドのみ  
npm run build:vite
```

### トラブルシューティング

#### Electronが起動しない場合

```bash
# node_modulesを削除して再インストール
rm -rf node_modules package-lock.json
npm install
```

#### ポートが使用中の場合

Viteサーバーが5173以外のポート（例：5174）で起動した場合は、`src/main/main.ts`の以下の行を変更してください：

```typescript
mainWindow.loadURL('http://localhost:5174'); // ポート番号を変更
```

### ビルド

```bash
# 全プラットフォーム
npm run dist

# Windows用
npm run dist:win

# macOS用（要Mac環境）
npm run dist:mac

# Linux用
npm run dist:linux
```

## プロジェクト構造

```
denchokun_electron/
├── src/
│   ├── main/           # Electronメインプロセス
│   │   ├── main.ts     # メインプロセスエントリポイント
│   │   └── database.ts # データベース管理
│   ├── preload/        # プリロードスクリプト
│   │   └── preload.ts  # IPC通信ブリッジ
│   └── renderer/       # レンダラープロセス（React）
│       ├── App.tsx     # メインアプリコンポーネント
│       ├── pages/      # ページコンポーネント
│       └── components/ # 共通コンポーネント
├── build/              # ビルド用アセット（アイコン等）
├── docs/               # ドキュメント
└── dist-electron/      # ビルド出力
```

## 移行状況

### 完了済み

- ✅ 基本的なElectron構造の構築
- ✅ メインウィンドウUI
- ✅ 期間管理機能
- ✅ データベース基本操作
- ✅ 設定管理
- ✅ メニューバー

### 実装予定

- ⏳ 取引データの詳細入力
- ⏳ ファイルのドラッグ&ドロップ
- ⏳ CSV インポート/エクスポート
- ⏳ 取引先マスター管理
- ⏳ 書類種別マスター管理
- ⏳ 印刷機能
- ⏳ 自動更新機能（electron-updater）

## 開発への参加

### コントリビューション方法

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

### 開発環境の共有

このプロジェクトをクローンした方が同じ環境で開発できるよう、以下の情報を共有しています：

- **Node.js バージョン**: 18以上推奨
- **パッケージマネージャー**: npm (package-lock.json使用)
- **エディタ設定**: `.vscode/settings.json`で統一
- **コーディング規約**: ESLint + Prettier設定済み

### 開発時の注意点

- `npm run dev`でElectronアプリが482x436pxのコンパクトサイズで起動します
- 開発者ツールは自動で開きません（F12で手動起動）
- ウィンドウサイズ・位置は自動保存されます
- 変更は即座にホットリロードされます

## ライセンス

MIT License

## 開発元

RoundShape K.K.
- Web: https://www.roundshape.jp
- Support: https://www.roundshape.jp/support

## 変更履歴

### v2.0.0 (Electron版)
- XojoからElectronへ完全移行
- モダンなUI/UXに刷新
- クロスプラットフォーム対応
- MBSライセンス依存を解消