/**
 * 格式化日期时间
 * @param {Date | string | number} date 日期对象、ISO字符串或时间戳
 * @returns {string} 格式化后的日期时间字符串 (YYYY/MM/DD HH:mm:ss)
 */
export function formatDate(date) {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''

  const pad = num => String(num).padStart(2, '0')

  const year = d.getFullYear()
  const month = pad(d.getMonth() + 1)
  const day = pad(d.getDate())
  const hours = pad(d.getHours())
  const minutes = pad(d.getMinutes())
  const seconds = pad(d.getSeconds())

  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`
}
