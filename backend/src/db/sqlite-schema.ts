import type Database from 'better-sqlite3'

/**
 * 初始化 SQLite 数据库表结构与默认种子数据 (sqlite-schema.ts)
 * 具备幂等性 (Idempotent)，服务每次启动时安全重放
 */
export function initSqliteSchema(db: Database.Database) {
  // 1. 执行表结构与索引创建
  db.exec(`
    -- 1. 项目表 (dramas)
    CREATE TABLE IF NOT EXISTS dramas (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      aspect_ratio TEXT DEFAULT '9:16',
      style_preset TEXT DEFAULT 'realistic',
      status TEXT DEFAULT 'active',
      description TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- 2. 剧集表 (episodes)
    CREATE TABLE IF NOT EXISTS episodes (
      id TEXT PRIMARY KEY,
      drama_id TEXT NOT NULL,
      episode_number INTEGER NOT NULL,
      title TEXT,
      script_raw TEXT,
      script_formatted TEXT,
      stage TEXT DEFAULT 'script',
      status TEXT DEFAULT 'draft',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- 3. 角色表 (characters)
    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      drama_id TEXT NOT NULL,
      name TEXT NOT NULL,
      gender TEXT,
      age_group TEXT,
      appearance TEXT,
      portrait_url TEXT,
      prompt TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- 4. 场景表 (scenes)
    CREATE TABLE IF NOT EXISTS scenes (
      id TEXT PRIMARY KEY,
      drama_id TEXT NOT NULL,
      name TEXT NOT NULL,
      location_type TEXT,
      description TEXT,
      image_url TEXT,
      prompt TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- 5. 道具表 (props)
    CREATE TABLE IF NOT EXISTS props (
      id TEXT PRIMARY KEY,
      drama_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      prompt TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- 6. 分镜序列与视频片段表 (storyboards)
    CREATE TABLE IF NOT EXISTS storyboards (
      id TEXT PRIMARY KEY,
      episode_id TEXT NOT NULL,
      shot_number INTEGER NOT NULL,
      duration REAL DEFAULT 5,
      scene_id TEXT,
      dialogue TEXT,
      action_desc TEXT,
      camera_movement TEXT,
      prompt TEXT,
      video_url TEXT,
      preview_url TEXT,
      status TEXT DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- 7. 任务调度与异步生命周期表 (sys_task)
    CREATE TABLE IF NOT EXISTS sys_task (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      target_id TEXT,
      progress INTEGER DEFAULT 0,
      payload TEXT,
      result TEXT,
      error_msg TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- 8. AI 服务提供商配置表 (ai_service_configs)
    CREATE TABLE IF NOT EXISTS ai_service_configs (
      id TEXT PRIMARY KEY,
      service_type TEXT NOT NULL,
      provider TEXT NOT NULL,
      name TEXT NOT NULL,
      base_url TEXT,
      api_key TEXT,
      model TEXT,
      is_default INTEGER DEFAULT 0,
      settings TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- 9. 风格预设表 (style_presets)
    CREATE TABLE IF NOT EXISTS style_presets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      label TEXT NOT NULL,
      prompt_prefix TEXT,
      prompt_suffix TEXT,
      cover_url TEXT,
      created_at INTEGER NOT NULL
    );

    -- 10. 整集视频拼接导出表 (export_merges)
    CREATE TABLE IF NOT EXISTS export_merges (
      id TEXT PRIMARY KEY,
      episode_id TEXT NOT NULL,
      video_url TEXT,
      duration REAL,
      status TEXT DEFAULT 'pending',
      error_msg TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- 11. 【picrd 临时图床托管追踪表】
    CREATE TABLE IF NOT EXISTS picrd_uploads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      local_path TEXT NOT NULL,
      image_url TEXT NOT NULL,
      delete_url TEXT NOT NULL,
      task_id TEXT,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      status TEXT DEFAULT 'active'
    );

    -- 创建高效索引
    CREATE INDEX IF NOT EXISTS idx_episodes_drama ON episodes(drama_id);
    CREATE INDEX IF NOT EXISTS idx_characters_drama ON characters(drama_id);
    CREATE INDEX IF NOT EXISTS idx_scenes_drama ON scenes(drama_id);
    CREATE INDEX IF NOT EXISTS idx_storyboards_ep ON storyboards(episode_id);
    CREATE INDEX IF NOT EXISTS idx_sys_task_status ON sys_task(status);
    CREATE INDEX IF NOT EXISTS idx_ai_configs_type ON ai_service_configs(service_type);
    CREATE INDEX IF NOT EXISTS idx_picrd_uploads_task ON picrd_uploads(task_id);
    CREATE INDEX IF NOT EXISTS idx_picrd_uploads_status ON picrd_uploads(status);
    CREATE INDEX IF NOT EXISTS idx_picrd_uploads_expires ON picrd_uploads(expires_at);
  `)

  // 2. 幂等初始化默认系统风格预设
  seedDefaultStylePresets(db)
}

/**
 * 风格预设初始化种子
 */
function seedDefaultStylePresets(db: Database.Database) {
  const count = (db.prepare('SELECT COUNT(*) as cnt FROM style_presets').get() as { cnt: number }).cnt
  if (count > 0) return

  const defaultPresets = [
    {
      id: 'style_realistic',
      name: 'realistic',
      label: '电影写实',
      prompt_prefix: 'cinematic lighting, photorealistic, 8k resolution, highly detailed, master shot, shallow depth of field',
      prompt_suffix: 'film grain, sharp focus, ultra-detailed textures',
    },
    {
      id: 'style_anime',
      name: 'anime',
      label: '国风动漫',
      prompt_prefix: 'makoto shinkai style, vibrant colors, beautiful anime artwork, detailed sky and clouds, 2d animation aesthetic',
      prompt_suffix: 'masterpiece, best quality, expressive line art',
    },
    {
      id: 'style_3d',
      name: '3d',
      label: '3D 盲盒/国潮',
      prompt_prefix: '3D digital render, Pixar and Disney aesthetic, cute stylized character, Octane Render, clay material, studio soft lighting',
      prompt_suffix: 'smooth surfaces, clean edges, volumetric lighting',
    },
  ]

  const insert = db.prepare(`
    INSERT INTO style_presets (id, name, label, prompt_prefix, prompt_suffix, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  const now = Date.now()
  for (const p of defaultPresets) {
    insert.run(p.id, p.name, p.label, p.prompt_prefix, p.prompt_suffix, now)
  }
}
