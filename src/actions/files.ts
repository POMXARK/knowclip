export const addAndOpenFile = <F extends FileMetadata>(
  file: F,
  filePath?: FilePath
): AddAndOpenFile => ({
  type: A.ADD_AND_OPEN_FILE,
  file,
  filePath: filePath || null,
})

export const addFile = <F extends FileMetadata>(
  file: F,
  filePath?: FilePath // optional?
): AddFile => ({
  type: A.ADD_FILE,
  file,
  filePath: filePath || null,
})

export const deleteFileRequest = (
  fileType: FileMetadata['type'],
  id: FileId
): DeleteFileRequest => ({
  type: 'DELETE_FILE_REQUEST',
  fileType,
  id,
})
export const deleteFileSuccess = (
  file: FileMetadata,
  descendants: Array<FileMetadata>
): DeleteFileSuccess => ({
  type: 'DELETE_FILE_SUCCESS',
  file,
  descendants,
})
export const openFileRequest = (file: FileMetadata): OpenFileRequest => ({
  type: 'OPEN_FILE_REQUEST',
  file,
})
export const openFileSuccess = (
  file: FileMetadata,
  filePath: FilePath
): OpenFileSuccess => ({
  type: 'OPEN_FILE_SUCCESS',
  validatedFile: file,
  filePath,
})
export const openFileFailure = (
  file: FileMetadata,
  filePath: FilePath | null,
  errorMessage: string
): OpenFileFailure => ({
  type: 'OPEN_FILE_FAILURE',
  file,
  filePath,
  errorMessage,
})
export const locateFileRequest = (
  file: FileMetadata,
  message: string
): LocateFileRequest => ({
  type: 'LOCATE_FILE_REQUEST',
  file,
  message,
})
export const locateFileSuccess = (
  file: FileMetadata,
  filePath: FilePath
): LocateFileSuccess => ({
  type: 'LOCATE_FILE_SUCCESS',
  file,
  filePath,
})

export const preloadVideoStills = (
  file: FileMetadata,
  clipId: ClipId
): PreloadVideoStills => ({
  type: A.PRELOAD_VIDEO_STILLS,
  clipId,
  file,
})
