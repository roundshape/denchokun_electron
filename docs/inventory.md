# 電帳君 (Denchokun) - Xojo機能棚卸し

## 概要
電子帳簿保存法に対応したデジタル帳簿管理システムのXojo版からElectronへの移行に向けた機能一覧

## 画面一覧

### メインウィンドウ
1. **MainWindow** - メイン画面
2. **LaunchWindow** - 起動画面
3. **OpeningWindow** - オープニング画面
4. **AboutWindow** - アバウト画面

### 取引管理関連
1. **DealPeriodWindow** - 取引期間管理画面
2. **ManageDealPeriodWindow** - 取引期間管理詳細画面
3. **DealPeriodInputDialog** - 取引期間入力ダイアログ
4. **AllPeriodsWindow** - 全取引期間一覧画面
5. **DealPartnersMasterWindow** - 取引先マスター管理画面
6. **DealDateTimePickerWindow** - 日時選択画面
7. **DetailWindow** - 取引詳細画面
8. **UpdateWindow** - 更新画面

### ダイアログ・入力画面
1. **DeleteDialog** - 削除確認ダイアログ
2. **DocTypeInputDialog** - 書類種別入力ダイアログ
3. **ReasonDialog** - 理由入力ダイアログ
4. **PopupInMDBWindow** - メモリDB内ポップアップ
5. **PopupDocTypeNodeWindow** - 書類種別ノードポップアップ

### 設定関連
1. **SetupWindow** - セットアップ画面
2. **MBSLicenseWindow** - MBSライセンス管理画面

### メニューバー
1. **MainMenuBar** - メインメニューバー
2. **DealPeriodMenuBar** - 取引期間メニューバー
3. **AllPeriodsMenuBar** - 全期間メニューバー

## クラス・モジュール一覧

### データ管理
1. **InMemoryDBClass** - インメモリDB管理
2. **LastRegDataClass** - 最終登録データ管理
3. **RecordListRowPropertiesClass** - レコードリスト行プロパティ
4. **DealPeriodClass** - 取引期間クラス
5. **FromDateToDateClass** - 期間範囲クラス

### 設定・環境
1. **XmlPrefClass** - XML設定ファイル管理
2. **App** - アプリケーション本体
3. **MyLibrary** - 共通ライブラリ

### UI コンポーネント
1. **MyTextFieldClass** - カスタムテキストフィールド
2. **InputTextClass** - 入力テキストクラス
3. **DoubleClickLabelClass** - ダブルクリック可能ラベル
4. **MyDesktopDateTimePickerClass** - 日時選択コンポーネント

### ファイル・通信
1. **FolderItemClass** - フォルダアイテム管理
2. **ZipCompressClass** - ZIP圧縮機能
3. **APIClientClass** - APIクライアント（サーバー通信）

### ファイルタイプ定義
1. **AllFileTypes** - 全対応ファイル形式
2. **CsvFileType** - CSVファイル形式
3. **PfxFileType** - PFX証明書ファイル形式

## 主要機能

### データベース
- SQLiteベースのローカルデータベース
- インメモリDB機能
- ハッシュ値による重複チェック
- データ更新履歴管理

### ファイル操作
- 画像ファイルのドラッグ&ドロップ対応
- CSV形式でのデータエクスポート
- ZIP圧縮機能
- 電子証明書（PFX）の取り扱い

### 設定管理
- XML形式の設定ファイル (Denchokun.pref)
- MBSライセンス情報の管理
- ベースフォルダ（データ保存先）設定
- ウィンドウ位置・サイズの記憶

### API連携
- サーバーAPIとの通信機能（APIClientClass）
- 取引データの同期

### UI特徴
- マルチウィンドウ対応
- コンテキストメニュー
- 日時選択コンポーネント
- ダブルクリック対応ラベル
- カスタムテキストフィールド

## OS依存機能
- Windows 64bit専用
- ファイルシステム操作
- レジストリアクセス（設定保存）

## 外部依存
- **MBS Xojo Plugins** (商用ライブラリ、ライセンス必要)
- **Inno Setup** (インストーラー作成用)

## 既知の改善要望
1. クロスプラットフォーム対応（Mac/Linux）
2. MBSライセンス依存の解消
3. モダンなUI/UXへの刷新
4. Web技術ベースへの移行

## Electron移行での考慮点
1. MBS Pluginの機能を純粋なNode.js/Electronで代替
2. SQLiteデータベースの移行（better-sqlite3推奨）
3. XML設定ファイルからJSONへの移行
4. Windows専用機能のクロスプラットフォーム対応
5. 自動更新機能の追加（electron-updater）