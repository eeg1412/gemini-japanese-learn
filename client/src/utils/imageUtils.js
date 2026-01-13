/**
 * 检查并缩放图片
 * 如果图片最长边超过 1600px，将其等比例缩放到最长边 < 1600px
 * @param {File} file - 图片文件对象
 * @returns {Promise<{file: File, base64: string}>} 返回处理后的文件和 base64 数据
 */
export async function processImageWithMaxDimension(file, maxDimension = 1600) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = e => {
      const img = new Image()

      img.onload = () => {
        const { width, height } = img
        const maxSide = Math.max(width, height)

        // 如果最长边小于等于指定尺寸，直接返回原文件
        if (maxSide <= maxDimension) {
          resolve({
            file,
            base64: e.target.result
          })
          return
        }

        // 计算缩放比例
        const scale = maxDimension / maxSide
        const newWidth = Math.round(width * scale)
        const newHeight = Math.round(height * scale)

        // 创建 canvas 进行缩放
        const canvas = document.createElement('canvas')
        canvas.width = newWidth
        canvas.height = newHeight

        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, newWidth, newHeight)

        // 将 canvas 转换为 blob
        canvas.toBlob(
          blob => {
            // 创建新的 File 对象，保持原文件名和类型
            const resizedFile = new File([blob], file.name, {
              type: file.type || 'image/jpeg'
            })

            // 获取 base64 编码
            const resizedReader = new FileReader()
            resizedReader.onload = () => {
              resolve({
                file: resizedFile,
                base64: resizedReader.result
              })
            }
            resizedReader.onerror = () => {
              reject(new Error('Failed to read resized image'))
            }
            resizedReader.readAsDataURL(resizedFile)
          },
          file.type || 'image/jpeg',
          0.9 // JPEG 质量设为 0.9，保持较好的图片质量
        )
      }

      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }

      img.src = e.target.result
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsDataURL(file)
  })
}
