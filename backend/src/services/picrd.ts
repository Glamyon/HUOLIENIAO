/**
 * picrd 临时图床服务 (picrd.ts)
 * 为 AutoDL MiniMax H3 视频工作流提供本地参考图的安全公网托管
 * 支持:
 * 1. multipart/form-data 异步上传至 picrd.com (7天 TTL 自动过期)
 * 2. 指数退避重试 (最大3次)
 * 3. 私密 delete_url 安全入库记录 (picrd_uploads 表)
 * 4. 任务结束或过期主动清理
 */

import * as fs from 'fs'
import * as path from 'path'

export interface PicrdUploadResult {
  image_url: string
  delete_url: string
  expires_at: number
}

interface PicrdApiResponse {
  status?: string
  success?: boolean
  data?: {
    image_url?: string
    delete_url?: string
    url?: string
  }
  image_url?: string
  delete_url?: string
  url?: string
  error?: string
}

const PICRD_UPLOAD_ENDPOINT = 'https://picrd.com/api/upload'
const DEFAULT_EXPIRATION_DAYS = 7
const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY_MS = 600

/**
 * 延迟等待辅助函数
 */
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 上传本地文件或 Buffer 至 picrd.com
 * @param filePathOrBuffer 本地绝对路径或图片二进制 Buffer
 * @param filename 可选文件名 (当传入 Buffer 时建议指定，如 ref_char.jpg)
 * @param taskId 可选关联的任务 ID
 */
export async function uploadToPicrd(
  filePathOrBuffer: string | Buffer,
  filename?: string,
  taskId?: string,
): Promise<PicrdUploadResult> {
  let fileBuffer: Buffer
  let resolvedFilename: string

  if (typeof filePathOrBuffer === 'string') {
    if (!fs.existsSync(filePathOrBuffer)) {
      throw new Error(`[picrd] 本地参考图文件不存在: ${filePathOrBuffer}`)
    }
    fileBuffer = await fs.promises.readFile(filePathOrBuffer)
    resolvedFilename = filename || path.basename(filePathOrBuffer)
  } else {
    fileBuffer = filePathOrBuffer
    resolvedFilename = filename || `ref_${Date.now()}.jpg`
  }

  // 探测 MIME 类型
  const ext = path.extname(resolvedFilename).toLowerCase()
  let mimeType = 'image/jpeg'
  if (ext === '.png') mimeType = 'image/png'
  else if (ext === '.webp') mimeType = 'image/webp'
  else if (ext === '.gif') mimeType = 'image/gif'

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const formData = new FormData()
      const blob = new Blob([fileBuffer], { type: mimeType })
      formData.append('file', blob, resolvedFilename)
      formData.append('visibility', 'unlisted') // 私密不公开列出
      formData.append('ttl', `${DEFAULT_EXPIRATION_DAYS}d`)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 20000)

      const response = await fetch(PICRD_UPLOAD_ENDPOINT, {
        method: 'POST',
        body: formData,
        headers: {
          'User-Agent': 'HUOLIENIAO-Drama/4.1.0',
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        throw new Error(`HTTP ${response.status} ${response.statusText} - ${errorText}`)
      }

      const resJson = (await response.json()) as PicrdApiResponse

      // 提取 image_url 与 delete_url (兼容多种响应结构)
      const imageUrl =
        resJson.data?.image_url ||
        resJson.data?.url ||
        resJson.image_url ||
        resJson.url
      const deleteUrl = resJson.data?.delete_url || resJson.delete_url || ''

      if (!imageUrl) {
        throw new Error(
          `[picrd] 接口返回未包含合法的 image_url: ${JSON.stringify(resJson)}`,
        )
      }

      const now = Date.now()
      const expiresAt = now + DEFAULT_EXPIRATION_DAYS * 24 * 3600 * 1000

      const result: PicrdUploadResult = {
        image_url: imageUrl,
        delete_url: deleteUrl,
        expires_at: expiresAt,
      }

      // 记录到本地 SQLite picrd_uploads 表 (非阻塞)
      recordUploadToDb({
        local_path: typeof filePathOrBuffer === 'string' ? filePathOrBuffer : '[buffer]',
        image_url: imageUrl,
        delete_url: deleteUrl,
        task_id: taskId || null,
        created_at: now,
        expires_at: expiresAt,
        status: 'active',
      }).catch((dbErr) => {
        console.warn('[picrd] 记录上传日志到数据库失败 (不影响任务继续):', dbErr)
      })

      return result
    } catch (err: any) {
      lastError = err
      const isLast = attempt === MAX_RETRIES
      console.warn(
        `[picrd] 上传失败 (第 ${attempt}/${MAX_RETRIES} 次): ${err.message}${
          isLast ? '，已达最大重试次数' : '，即将重试...'
        }`,
      )
      if (!isLast) {
        await wait(INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1))
      }
    }
  }

  throw new Error(`[picrd] 上传参考图到临时图床失败: ${lastError?.message || '未知错误'}`)
}

/**
 * 根据 delete_url 主动从 picrd 物理删除临时参考图
 * @param deleteUrl 上传时返回的私有删除地址
 */
export async function deleteFromPicrd(deleteUrl: string): Promise<boolean> {
  if (!deleteUrl || !deleteUrl.startsWith('http')) return false

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'User-Agent': 'HUOLIENIAO-Drama/4.1.0',
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (response.ok) {
      markUploadDeletedInDb(deleteUrl).catch(() => {})
      return true
    }
    // 部分服务支持 GET/POST 方式调用删除链接
    if (response.status === 405) {
      const getRes = await fetch(deleteUrl, { method: 'GET' })
      if (getRes.ok) {
        markUploadDeletedInDb(deleteUrl).catch(() => {})
        return true
      }
    }
  } catch (err: any) {
    console.warn(`[picrd] 删除临时参考图失败 (${deleteUrl}):`, err.message)
  }
  return false
}

/**
 * 智能解析并保证图片具备可被公网访问的 URL
 * 1. 如果已是合法公网 URL 且非本地回环，直接返回原 URL
 * 2. 如果是本地文件系统绝对路径或 /static/... 相对路径，自动调用 picrd 上传并返回公网托管 URL
 */
export async function ensurePublicImageUrl(
  inputUrlOrPath: string,
  taskId?: string,
): Promise<string> {
  if (!inputUrlOrPath) return ''

  // 1. 如果已是远程合法公网地址且不是本地开发地址
  if (
    /^https?:\/\//i.test(inputUrlOrPath) &&
    !inputUrlOrPath.includes('localhost') &&
    !inputUrlOrPath.includes('127.0.0.1')
  ) {
    return inputUrlOrPath
  }

  // 2. 解析本地文件存储路径
  let localDiskPath = inputUrlOrPath
  if (inputUrlOrPath.startsWith('/static/')) {
    // 映射到后端 STORAGE_PATH (通常是 data/static)
    const storageRoot = process.env.STORAGE_PATH || path.resolve(process.cwd(), 'data/static')
    localDiskPath = path.join(storageRoot, inputUrlOrPath.replace(/^\/static\//, ''))
  }

  // 3. 上传到 picrd 临时图床
  const result = await uploadToPicrd(localDiskPath, undefined, taskId)
  return result.image_url
}

/**
 * 数据库记录辅助：将上传记录写入 SQLite
 */
async function recordUploadToDb(record: {
  local_path: string
  image_url: string
  delete_url: string
  task_id: string | null
  created_at: number
  expires_at: number
  status: string
}) {
  try {
    const { getSqliteDb } = await import('../db/index').catch(() => ({ getSqliteDb: null } as any))
    const db = getSqliteDb ? getSqliteDb() : null
    if (!db) return

    db.prepare(
      `INSERT INTO picrd_uploads (local_path, image_url, delete_url, task_id, created_at, expires_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      record.local_path,
      record.image_url,
      record.delete_url,
      record.task_id,
      record.created_at,
      record.expires_at,
      record.status,
    )
  } catch {
    // 忽略未建表或连接尚未就绪异常
  }
}

/**
 * 数据库状态标记：将上传记录标记为已删除
 */
async function markUploadDeletedInDb(deleteUrl: string) {
  try {
    const { getSqliteDb } = await import('../db/index').catch(() => ({ getSqliteDb: null } as any))
    const db = getSqliteDb ? getSqliteDb() : null
    if (!db) return

    db.prepare(
      `UPDATE picrd_uploads SET status = 'deleted' WHERE delete_url = ?`,
    ).run(deleteUrl)
  } catch {
    // 忽略异常
  }
}
