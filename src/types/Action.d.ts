declare type Action =
  | { type: '@@INIT' }
  | InitializeApp
  | LoadPersistedState
  | SnackbarAction
  | DialogAction
  | WaveformAction
  | ClipAction
  | ProjectAction
  | MediaAction
  | SubtitlesAction
  | FileAction
  | DetectSilence
  | DetectSilenceRequest
  | DeleteAllCurrentFileClipsRequest
  | SetAllTags
  | SetProgress
declare type InitializeApp = { type: 'INITIALIZE_APP' }

declare type LoadPersistedState = {
  type: 'LOAD_PERSISTED_STATE'
  files: FilesState | null
  fileAvailabilities: FileAvailabilitiesState | null
}

declare type DetectSilence = { type: 'DETECT_SILENCE' }
declare type DetectSilenceRequest = { type: 'DETECT_SILENCE_REQUEST' }
declare type DeleteAllCurrentFileClipsRequest = {
  type: 'DELETE_ALL_CURRENT_FILE_CLIPS_REQUEST'
}
declare type SetAllTags = {
  type: 'SET_ALL_TAGS'
  tagsToClipIds: { [tag: string]: Array<ClipId> }
}
declare type SetProgress = {
  type: 'SET_PROGRESS'
  progress: ProgressInfo | null
}

declare type ClipAction =
  | DeleteCard
  | DeleteCards
  | SetFlashcardField
  | AddFlashcardTag
  | DeleteFlashcardTag
  | SetDefaultClipSpecs
  | AddClip
  | AddClips
  | EditClip
  | MergeClips
  | HighlightClip
  | HighlightLeftClipRequest
  | HighlightRightClipRequest

declare type DeleteCard = { type: 'DELETE_CARD'; id: ClipId }
declare type DeleteCards = { type: 'DELETE_CARDS'; ids: Array<ClipId> }
declare type SetFlashcardField = {
  type: 'SET_FLASHCARD_FIELD'
  id: ClipId
  key: FlashcardFieldName
  value: string
}
declare type AddFlashcardTag = {
  type: 'ADD_FLASHCARD_TAG'
  id: ClipId
  text: string
}
declare type DeleteFlashcardTag = {
  type: 'DELETE_FLASHCARD_TAG'
  id: ClipId
  index: number
  tag: string
}
declare type SetDefaultClipSpecs = {
  type: 'SET_DEFAULT_CLIP_SPECS'
  tags?: Array<string>
  includeStill?: boolean
}
declare type AddClip = { type: 'ADD_CLIP'; clip: Clip }
declare type AddClips = {
  type: 'ADD_CLIPS'
  clips: Array<Clip>
  fileId: MediaFileId
}
declare type EditClip = {
  type: 'EDIT_CLIP'
  id: ClipId
  override: import('redux').DeepPartial<Clip>
}
declare type MergeClips = { type: 'MERGE_CLIPS'; ids: Array<ClipId> }
declare type HighlightClip = { type: 'HIGHLIGHT_CLIP'; id: ClipId | null }
declare type HighlightLeftClipRequest = { type: 'HIGHLIGHT_LEFT_CLIP_REQUEST' }
declare type HighlightRightClipRequest = {
  type: 'HIGHLIGHT_RIGHT_CLIP_REQUEST'
}
declare type WaveformAction =
  | SetCursorPosition
  | SetWaveformViewBox
  | SetPendingClip
  | ClearPendingClip
  | SetPendingStretch
  | ClearPendingStretch
declare type SetCursorPosition = {
  type: 'SET_CURSOR_POSITION'
  x: number
  newViewBox: WaveformViewBox | null
}
declare type SetWaveformViewBox = {
  type: 'SET_WAVEFORM_VIEW_BOX'
  viewBox: WaveformViewBox
}
declare type SetPendingClip = { type: 'SET_PENDING_CLIP'; clip: PendingClip }
declare type ClearPendingClip = {
  type: 'CLEAR_PENDING_CLIP'
}
declare type SetPendingStretch = {
  type: 'SET_PENDING_STRETCH'
  stretch: PendingStretch
}
declare type ClearPendingStretch = {
  type: 'CLEAR_PENDING_STRETCH'
}

declare type DialogAction = EnqueueDialog | CloseDialog
type EnqueueDialog = {
  type: 'ENQUEUE_DIALOG'
  dialog: DialogData
  skipQueue: boolean
}
type CloseDialog = { type: 'CLOSE_DIALOG' }

declare type SnackbarAction = EnqueueSnackbar | CloseSnackbar
type EnqueueSnackbar = {
  type: 'ENQUEUE_SNACKBAR'
  snackbar: SnackbarData
}
type CloseSnackbar = { type: 'CLOSE_SNACKBAR' }

declare type ProjectAction =
  | CreateProject
  | OpenProjectRequestById
  | OpenProjectRequestByFilePath
  | OpenProject
  | SetProjectError
  | SetProjectName
  | CloseProject
  | CloseProjectRequest
  | SaveProjectRequest
  | SaveProjectAsRequest
  | ExportMp3
  | ExportApkgRequest
  | ExportApkgFailure
  | ExportApkgSuccess
  | ExportMarkdown
  | ExportCsv
  | SetWorkIsUnsaved
declare type CreateProject = {
  type: 'CREATE_PROJECT'
  project: ProjectFile
  filePath: FilePath
}
declare type OpenProjectRequestById = {
  type: 'OPEN_PROJECT_REQUEST_BY_ID'
  id: ProjectId
}
declare type OpenProjectRequestByFilePath = {
  type: 'OPEN_PROJECT_REQUEST_BY_FILE_PATH'
  filePath: ProjectFilePath
}
declare type OpenProject = {
  type: 'OPEN_PROJECT'
  project: ProjectFile
  clips: Clip[]
  now: string
}
declare type SetProjectError = {
  type: 'SET_PROJECT_ERROR'
  error: string | null
}
declare type SetProjectName = {
  type: 'SET_PROJECT_NAME'
  id: ProjectId
  name: string
}
declare type CloseProject = { type: 'CLOSE_PROJECT' }
declare type CloseProjectRequest = { type: 'CLOSE_PROJECT_REQUEST' }
declare type SaveProjectRequest = { type: 'SAVE_PROJECT_REQUEST' }
declare type SaveProjectAsRequest = { type: 'SAVE_PROJECT_AS_REQUEST' }
declare type ExportMp3 = { type: 'EXPORT_MP3'; exportData: ApkgExportData }
declare type ExportApkgRequest = {
  type: 'EXPORT_APKG_REQUEST'
  clipIds: Array<ClipId>
  mediaOpenPrior: MediaFile | null
}
declare type ExportApkgFailure = {
  type: 'EXPORT_APKG_FAILURE'
  errorMessage: string | null
}
declare type ExportApkgSuccess = {
  type: 'EXPORT_APKG_SUCCESS'
  successMessage: string
}
declare type ExportMarkdown = {
  type: 'EXPORT_MARKDOWN'
  clipIds: Array<ClipId>
}
declare type ExportCsv = {
  type: 'EXPORT_CSV'
  clipIds: Array<ClipId>
  csvFilePath: string
  mediaFolderLocation: string
}
declare type SetWorkIsUnsaved = {
  type: 'SET_WORK_IS_UNSAVED'
  workIsUnsaved: boolean
}

declare type MediaAction =
  | AddMediaToProjectRequest
  | DeleteMediaFromProject
  | SetCurrentFile
  | ToggleLoop
  | SetLoop
  | SetMediaFolderLocation
  | DismissMedia
declare type AddMediaToProjectRequest = {
  type: 'ADD_MEDIA_TO_PROJECT_REQUEST'
  projectId: ProjectId
  filePaths: Array<MediaFilePath>
}
declare type DeleteMediaFromProject = {
  type: 'DELETE_MEDIA_FROM_PROJECT'
  projectId: ProjectId
  mediaFileId: MediaFileId
}
declare type SetCurrentFile = { type: 'SET_CURRENT_FILE'; index: number }
declare type ToggleLoop = { type: 'TOGGLE_LOOP' }
declare type SetLoop = { type: 'SET_LOOP'; loop: boolean }
declare type SetMediaFolderLocation = {
  type: 'SET_MEDIA_FOLDER_LOCATION'
  directoryPath: string | null
}
declare type DismissMedia = { type: 'DISMISS_MEDIA' }

declare type SubtitlesAction =
  | AddSubtitlesTrack
  | DeleteSubtitlesTrack
  | ShowSubtitles
  | HideSubtitles
  | MakeClipsFromSubtitles
  | ShowSubtitlesClipsDialogRequest
  | LinkFlashcardFieldToSubtitlesTrack
  | GoToSubtitlesChunk

declare type LoadSubtitlesFailure = {
  type: 'LOAD_SUBTITLES_FAILURE'
  error: string
}
declare type AddSubtitlesTrack = {
  type: 'ADD_SUBTITLES_TRACK'
  track: SubtitlesTrack
}
declare type DeleteSubtitlesTrack = {
  type: 'DELETE_SUBTITLES_TRACK'
  mediaFileId: MediaFileId
  id: SubtitlesTrackId
}
declare type ShowSubtitles = {
  type: 'SHOW_SUBTITLES'
  mediaFileId: MediaFileId
  id: SubtitlesTrackId
}
declare type HideSubtitles = {
  type: 'HIDE_SUBTITLES'
  mediaFileId: MediaFileId
  id: SubtitlesTrackId
}
declare type MakeClipsFromSubtitles = {
  type: 'MAKE_CLIPS_FROM_SUBTITLES'
  fileId: MediaFileId
  fieldNamesToTrackIds: Partial<TransliterationFlashcardFields> & {
    transcription: string
  }
  tags: Array<string>
}
declare type ShowSubtitlesClipsDialogRequest = {
  type: 'SHOW_SUBTITLES_CLIPS_DIALOG_REQUEST'
}
declare type LinkFlashcardFieldToSubtitlesTrack = {
  type: 'LINK_FLASHCARD_FIELD_TO_SUBTITLES_TRACK'
  mediaFileId: MediaFileId
  flashcardFieldName: FlashcardFieldName
  subtitlesTrackId: SubtitlesTrackId | null
}
declare type GoToSubtitlesChunk = {
  type: 'GO_TO_SUBTITLES_CHUNK'
  subtitlesTrackId: SubtitlesTrackId
  chunkIndex: number
}

declare type FileAction =
  | AddAndOpenFile
  | AddFile
  | DeleteFileRequest
  | DeleteFileSuccess
  | OpenFileRequest
  | OpenFileSuccess
  | OpenFileFailure
  | LocateFileRequest
  | LocateFileSuccess
declare type AddAndOpenFile = {
  type: 'ADD_AND_OPEN_FILE'
  file: FileMetadata
  filePath: FilePath | null
}
declare type AddFile = {
  type: 'ADD_FILE'
  file: FileMetadata
  filePath: FilePath | null
}
declare type DeleteFileRequest = {
  type: 'DELETE_FILE_REQUEST'
  fileType: FileMetadata['type']
  id: FileId
}
declare type DeleteFileSuccess = {
  type: 'DELETE_FILE_SUCCESS'
  file: FileMetadata
  descendants: Array<FileMetadata>
}
declare type OpenFileRequest = {
  type: 'OPEN_FILE_REQUEST'
  file: FileMetadata
}
declare type OpenFileSuccess = {
  type: 'OPEN_FILE_SUCCESS'
  validatedFile: FileMetadata
  filePath: FilePath
}
declare type OpenFileFailure = {
  type: 'OPEN_FILE_FAILURE'
  file: FileMetadata
  filePath: FilePath | null
  errorMessage: string
}
declare type LocateFileRequest = {
  type: 'LOCATE_FILE_REQUEST'
  file: FileMetadata
  message: string
}
declare type LocateFileSuccess = {
  type: 'LOCATE_FILE_SUCCESS'
  file: FileMetadata
  filePath: FilePath
}

interface WithRecordType<F extends FileMetadata> {
  file: F
}

type OpenFileSuccessWith<F extends FileMetadata> = OpenFileSuccess & {
  validatedFile: F
}
