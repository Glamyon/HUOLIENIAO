/**
 * AutoDL MiniMax H3 视频工作流适配器 (autodl-video.ts)
 * 适配 MiniMax H3 4 大工作流: 801, 802, 804, z0902
 */

import { VideoAdapter, VideoGenerationOptions, VideoGenerationResult, VideoStatusResult } from './types'
import { ensurePublicImageUrl } from '../picrd'

export interface AutoDLAdapterConfig {
  apiKey: string // AutoDL Token (无需 Bearer 前缀)
  baseUrl?: string
  model?: string
  settings?: any
}

const AUTODL_DEFAULT_BASE_URL = 'https://autodl.art/api/v1/comfyui/comfyui_workflow'

const RESOLUTION_MAP: Record<string, { width: number; height: number }> = {
  '480p竖(480*864)': { width: 480, height: 864 },
  '480p横(864*480)': { width: 864, height: 480 },
  '768p竖(768*1376)': { width: 768, height: 1376 },
  '768p横(1376*768)': { width: 1376, height: 768 },
  '1088p竖(1088*1920)': { width: 1088, height: 1920 },
  '1088p横(1920*1088)': { width: 1920, height: 1088 },
  '1440p竖(1440*2560)': { width: 1440, height: 2560 },
  '1440p横(2560*1440)': { width: 2560, height: 1440 },
}

export class AutoDLVideoAdapter implements VideoAdapter {
  private apiKey: string
  private baseUrl: string
  private defaultWorkflow: string

  constructor(config: AutoDLAdapterConfig) {
    this.apiKey = (config.apiKey || '').trim()
    this.baseUrl = (config.baseUrl || AUTODL_DEFAULT_BASE_URL).replace(/\/+$/, '')
    this.defaultWorkflow = config.model || 'minimax_h3_801'
  }

  async generateVideo(options: VideoGenerationOptions): Promise<VideoGenerationResult> {
    const workflowId = options.autodl?.workflow_id || this.defaultWorkflow
    const resolution = options.resolution || '768p竖(768*1376)'
    const dim = RESOLUTION_MAP[resolution] || { width: 768, height: 1376 }
    const duration = Math.min(Math.max(Number(options.duration) || 5, 1), 15)

    // 构建提示词：801 剔除对白和字幕，纯动态镜头提示词
    let prompt = options.prompt || ''
    if (workflowId === 'minimax_h3_801') {
      prompt = prompt.replace(/(对白|台词|字幕|旁白)[：:][^，。；\n]*/g, '').trim()
    }

    // 收集参考图片并经由 picrd 确保公网访问
    const rawRefImages = options.refImages || options.autodl?.ref_images || []
    const publicRefImages: string[] = []
    const maxImages = workflowId === 'minimax_h3_z0902' ? 6 : 9

    for (let i = 0; i < Math.min(rawRefImages.length, maxImages); i++) {
      const publicUrl = await ensurePublicImageUrl(rawRefImages[i])
      if (publicUrl) {
        publicRefImages.push(publicUrl)
      }
    }

    // 构建工作流专属载荷
    const payload: Record<string, any> = {
      prompt,
      width: dim.width,
      height: dim.height,
      duration,
    }

    // 填充参考图片 ref_image_0 ~ ref_image_8
    publicRefImages.forEach((imgUrl, idx) => {
      payload[`ref_image_${idx}`] = imgUrl
    })

    // 严格按工作流进行参数隔离
    if (workflowId === 'minimax_h3_801' || workflowId === 'minimax_h3_802') {
      payload.mode = options.autodl?.mode || '高质模式'
    } else if (workflowId === 'minimax_h3_804') {
      payload.style_preset = options.autodl?.style_preset || '武打模式-真人-武戏+真实质感'
    }
    // z0902: 禁止 mode 与 style_preset，仅接收图片与提示词

    const endpoint = `${this.baseUrl}/${workflowId}`
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.apiKey, // 严格无 Bearer 前缀
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      throw new Error(`AutoDL API 提交失败 (HTTP ${response.status}): ${errText}`)
    }

    const data = await response.json()
    const taskId = data.task_id || data.id || data.data?.task_id || data.data?.id
    if (!taskId) {
      throw new Error(`AutoDL 返回数据未包含 task_id: ${JSON.stringify(data)}`)
    }

    return {
      taskId: String(taskId),
      status: 'pending',
      raw: data,
    }
  }

  async pollStatus(taskId: string): Promise<VideoStatusResult> {
    const endpoint = `${this.baseUrl}/result/${taskId}`
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: this.apiKey, // 严格无 Bearer 前缀
      },
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      return {
        taskId,
        status: 'failed',
        errorMsg: `查询失败 (HTTP ${response.status}): ${errText}`,
      }
    }

    const data = await response.json()
    const statusStr = (data.status || data.data?.status || '').toLowerCase()

    if (statusStr === 'success' || statusStr === 'completed') {
      const videoUrl = data.video_url || data.result?.video_url || data.data?.video_url || data.data?.url
      return {
        taskId,
        status: 'completed',
        progress: 100,
        videoUrl,
        raw: data,
      }
    }

    if (statusStr === 'failed' || statusStr === 'error') {
      return {
        taskId,
        status: 'failed',
        errorMsg: data.error || data.message || data.error_msg || 'AutoDL 视频生成失败',
        raw: data,
      }
    }

    return {
      taskId,
      status: 'processing',
      progress: data.progress || 50,
      raw: data,
    }
  }
}
