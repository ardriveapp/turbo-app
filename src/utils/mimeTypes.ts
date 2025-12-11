/**
 * Get MIME type for a file based on its extension
 * Provides proper MIME types for files that browsers don't recognize
 */
export const getMimeType = (fileName: string, fallback: string = 'application/octet-stream'): string => {
  const extension = fileName.toLowerCase().split('.').pop();

  const mimeTypes: Record<string, string> = {
    // Text files
    'md': 'text/markdown',
    'markdown': 'text/markdown',
    'txt': 'text/plain',
    'csv': 'text/csv',
    'json': 'application/json',
    'xml': 'application/xml',
    'yaml': 'text/yaml',
    'yml': 'text/yaml',

    // Code files
    'js': 'text/javascript',
    'ts': 'text/typescript',
    'jsx': 'text/jsx',
    'tsx': 'text/tsx',
    'py': 'text/x-python',
    'rb': 'text/x-ruby',
    'go': 'text/x-go',
    'rs': 'text/x-rust',
    'c': 'text/x-c',
    'cpp': 'text/x-c++',
    'h': 'text/x-c',
    'hpp': 'text/x-c++',
    'java': 'text/x-java',
    'php': 'text/x-php',
    'sh': 'text/x-shellscript',
    'bash': 'text/x-shellscript',

    // Web files
    'html': 'text/html',
    'htm': 'text/html',
    'css': 'text/css',
    'svg': 'image/svg+xml',

    // Documents
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

    // Images (fallback for browsers that don't detect properly)
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'ico': 'image/x-icon',
    'bmp': 'image/bmp',

    // Audio
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'm4a': 'audio/mp4',

    // Video
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',

    // Archives
    'zip': 'application/zip',
    'tar': 'application/x-tar',
    'gz': 'application/gzip',
    'rar': 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
  };

  return extension ? mimeTypes[extension] || fallback : fallback;
};

/**
 * Get proper content type for a file
 * Uses browser's file.type if available, otherwise detects from extension
 */
export const getContentType = (file: File): string => {
  // If browser detected the type, use it (but only if it's not empty)
  if (file.type && file.type !== 'application/octet-stream') {
    return file.type;
  }

  // Otherwise, detect from extension
  return getMimeType(file.name);
};
