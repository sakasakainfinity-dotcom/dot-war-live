# Dot War Live (初期実装)

Dot War Live の設計図（2026/03/04）をもとに、まずは **ゲームロジックのコア** と **Supabase 初期スキーマ** を実装したリポジトリです。

## 現在入っているもの

- コマンドパーサー（日英対応）
  - `A place 45` / `A 置く 45`
  - `B attack 78` / `B 攻撃 78`
  - `A shield 55` / `A 防御 55`
  - `A bomb 67` / `A 爆弾 67`
- ターン/フェーズ付きゲームエンジン
  - debate/action フェーズ
  - 1ターン1人1アクション
  - 壁耐久（3）
  - 資源取得→爆弾化
  - 課金 tier (300/500) による設置強化・攻撃強化
  - 中央突破ボーナス（初回のみ +5）
- Supabase 初期スキーマ
  - match / realtime state / chat events / actions / ranking 用テーブル

## セットアップ

```bash
npm test
npm run check
```

## ディレクトリ

- `src/domain/commandParser.js`: チャットコマンド解析
- `src/domain/gameEngine.js`: ルール実装
- `src/config/gameConfig.js`: 盤面サイズや時間などの定数
- `supabase/migrations/202603040001_initial_schema.sql`: DB 初期定義

## 次にやること（推奨）

1. Next.js UI（OBS向け）を追加
2. YouTube/Twitch 受信Botを追加
3. Next API Route で `ChatEvent -> parse -> applyAction -> persist` のパイプラインを実装
4. Supabase Realtime で配信画面に状態配信
