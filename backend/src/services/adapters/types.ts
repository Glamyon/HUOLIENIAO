/**
 * 视频模型适配器核心类型定义 (types.ts)
 */

export type VideoProvider = 'volcengine' | 'minimax' | 'bailian' | 'autodl'

export interface AutoDLVideoOptions {
  workflow_id: 'minimax_h3_801' | 'minimax_h3_802' | 'minimax_h3_804' | 'minimax_h3_z0902' | string
  resolution?: string
  duration?: number
  mode?: '高质模式' | '高速模式'
  style_preset?:
    | '武打模式-真人-武戏+真实质感'
    | '情感模式-真人-文戏+微表情'
    | '日常模式-真人-生活化动态'
    | '通用动漫-二次元风格化'
    | '玄幻修仙-特效与场景张力'
    | '复古胶片-怀旧电影质感'
    | string
  ref_images?: string[]
}

export interface VideoGenerationOptions {
  prompt: string
  duration?: number
  aspectRatio?: string
  resolution?: string
  firstFrameUrl?: string
  lastFrameUrl?: string
  refImages?: string[]
  autodl?: AutoDLVideoOptions
  extraParams?: Record<string, any>
}

export interface VideoGenerationResult {
  taskId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  videoUrl?: string
  errorMsg?: string
  raw?: any
}

export interface VideoStatusResult {
  taskId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress?: number
  videoUrl?: string
  errorMsg?: string
  raw?: any
}

export interface VideoAdapter {
  generateVideo(options: VideoGenerationOptions): Promise<VideoGenerationResult>
  pollStatus(taskId: string): Promise<VideoStatusResult>
}
