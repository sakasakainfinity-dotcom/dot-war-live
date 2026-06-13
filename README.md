# Fan War Live (初期実装)

Fan War Live の設計図（2026/03/04）をもとに、まずは **ゲームロジックのコア** と **Supabase 初期スキーマ** を実装したリポジトリです。

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

## YouTube Data API quota safety

Fan War Live does not use `search.list` to discover live streams. Register the stream `videoId` before the broadcast, and preferably save the `liveChatId` manually from the admin screen. If `liveChatId` is omitted, the admin save action calls `videos.list` once to resolve `activeLiveChatId` and stores it.

Runtime safeguards:

- `YOUTUBE_API_ENABLED=false` blocks all YouTube Data API calls.
- `MOCK_COMMENTS_ENABLED=true` returns dummy comments for local verification without calling YouTube.
- `MAX_YOUTUBE_API_CALLS_PER_DAY=1000` sets an app-side daily call limit.
- Comment ingestion is centralized in `/api/youtube/comments`; browsers and OBS sources read this app API instead of calling YouTube directly.
- The server uses only `liveChatMessages.list` for comments, stores `nextPageToken` in memory, follows YouTube's `pollingIntervalMillis`, and exponentially backs off on errors.
- YouTube API usage is logged per method, hourly, and daily. `quotaExceeded` automatically stops further calls for the day.
