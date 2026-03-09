import { saveAs } from 'file-saver'

/**
 * 格式化文件大小
 * @param size
 */
export const formatSize = (size?: number) => {
  if (!size) return '未知'
  if (size < 1024) return size + ' B'
  if (size < 1024 * 1024) return (size / 1024).toFixed(2) + ' KB'
  return (size / (1024 * 1024)).toFixed(2) + ' MB'
}

/**
 * 下载图片
 * @param url 图片下载地址
 * @param fileName 要保存为的文件名
 */
export function downloadImage(url?: string, fileName?: string) {
  if (!url) {
    return
  }
  saveAs(url, fileName)
}

/**
 * 将颜色值转换为标准 #RRGGBB 格式
 * 支持 #RRGGBB / #RGB / 0xRRGGBB / RRGGBB
 */
export function toHexColor(input: string) {
  if (!input) {
    return '#000000'
  }
  let colorValue = input.trim()
  if (colorValue.startsWith('#')) {
    colorValue = colorValue.slice(1)
  } else if (colorValue.startsWith('0x') || colorValue.startsWith('0X')) {
    colorValue = colorValue.slice(2)
  }
  if (colorValue.length === 3) {
    colorValue = colorValue
      .split('')
      .map((char) => char + char)
      .join('')
  }
  if (!/^[0-9a-fA-F]{6}$/.test(colorValue)) {
    return '#000000'
  }
  return `#${colorValue.toUpperCase()}`
}
