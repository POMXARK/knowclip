import * as r from '../redux'
import { FileEventHandlers } from './eventHandlers'
import { getClipMidpoint } from '../utils/getVideoStill'

export default {
  openRequest: async ({ file }, filePath, state, effects) => {
    return [await r.openFileSuccess(file, filePath)]
  },
  openSuccess: [
    async ({ validatedFile, filePath }) => {
      const img = new Image()
      img.src = `file:///${filePath}`
      return []
    },
  ],
  locateRequest: async ({ file }, state, effects) => {
    try {
      const parentFile = r.getFile<MediaFile>(
        state,
        'MediaFile',
        file.mediaFileId
      )
      const parentFileAvailability = r.getFileAvailabilityById<MediaFile>(
        state,
        'MediaFile',
        file.mediaFileId
      )
      if (
        !parentFile ||
        !parentFileAvailability ||
        parentFileAvailability.status !== 'CURRENTLY_LOADED'
      )
        return [
          r.openFileFailure(file, null, 'You must first locate this file.'),
        ]

      const cbr = r.getConstantBitrateFilePath(state, parentFile.id)
      if (!cbr)
        return [
          r.openFileFailure(
            file,
            null,
            "Can't make still image from video until it has loaded."
          ),
        ]

      const clip = r.getClip(state, file.id)
      if (!clip)
        return [
          r.openFileFailure(
            file,
            null,
            "Can't make a still for a clip that doesn't exist."
          ),
        ]

      const seconds = clip.flashcard.image
        ? clip.flashcard.image.seconds
        : r.getSecondsAtX(state, getClipMidpoint(clip.start, clip.end))

      const pngPath = await effects.getVideoStill(
        file.id,
        parentFileAvailability.filePath,
        seconds
      )
      if (pngPath instanceof Error)
        return [
          r.openFileFailure(
            file,
            null,
            'Could not locate file: ' +
              (pngPath.message || 'problem generating still image from media.')
          ),
        ]

      return [r.locateFileSuccess(file, pngPath)]
    } catch (err) {
      return [
        r.openFileFailure(
          file,
          null,
          'Problem making still image from media: ' +
            (err.message || err.toString())
        ),
      ]
    }
  },
  locateSuccess: null,
  deleteRequest: [
    async (file, descendants, state, effects) => [
      r.deleteFileSuccess(file, descendants),
    ],
  ],
  deleteSuccess: [],
} as FileEventHandlers<VideoStillImageFile>
