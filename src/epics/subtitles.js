// @flow
import { promisify } from 'util'
import tempy from 'tempy'
import fs from 'fs'
import ffmpeg, { getMediaMetadata } from '../utils/ffmpeg'
import { combineEpics } from 'redux-observable'
import { filter, flatMap, map } from 'rxjs/operators'
import { of } from 'rxjs'
import uuid from 'uuid/v4'
import * as r from '../redux'
import { extname } from 'path'
import { parse, stringifyVtt } from 'subtitle'
import subsrt from 'subsrt'
import newClip from '../utils/newClip'
import { getNoteTypeFields } from '../utils/noteType'
import { from } from 'rxjs'

const readFile = promisify(fs.readFile)
const writeFile = promisify(fs.writeFile)

export const getSubtitlesFilePathFromMedia = async (
  mediaFilePath: MediaFilePath,
  streamIndex: number
) => {
  const mediaMetadata = await getMediaMetadata(mediaFilePath)
  if (
    !mediaMetadata.streams[streamIndex] ||
    mediaMetadata.streams[streamIndex].codec_type !== 'subtitle'
  ) {
    return null
  }
  const outputFilePath = tempy.file({ extension: 'vtt' })

  return await new Promise((res, rej) =>
    ffmpeg(mediaFilePath)
      .outputOptions(`-map 0:${streamIndex}`)
      .output(outputFilePath)
      .on('end', () => {
        res(outputFilePath)
      })
      .on('error', err => {
        console.error(err)
        rej(err)
      })
      .run()
  )
}

export const getSubtitlesFromMedia = async (
  mediaFilePath: MediaFilePath,
  streamIndex: number,
  state: AppState
) => {
  const subtitlesFilePath = await getSubtitlesFilePathFromMedia(
    mediaFilePath,
    streamIndex
  )
  if (!subtitlesFilePath) {
    throw new Error('There was a problem loading embedded subtitles')
  }
  const vttText = await readFile(subtitlesFilePath, 'utf8')

  return {
    tmpFilePath: subtitlesFilePath,
    chunks: parse(vttText)
      .map(vttChunk => r.readVttChunk(state, vttChunk))
      .filter(({ text }) => text),
  }
}

export const convertAssToVtt = (filePath: string, vttFilePath: string) =>
  new Promise<string>((res, rej) =>
    ffmpeg(filePath)
      .output(vttFilePath)
      .on('end', () => {
        res(vttFilePath)
      })
      .on('error', err => {
        console.error(err)
        rej(err)
      })
      .run()
  )

const parseSubtitles = (state, fileContents, extension) =>
  extension === '.ass'
    ? subsrt
        .parse(fileContents)
        .filter(({ type }) => type === 'caption')
        .map(chunk => r.readSubsrtChunk(state, chunk))
        .filter(({ text }) => text)
    : parse(fileContents)
        .map(vttChunk => r.readVttChunk(state, vttChunk))
        .filter(({ text }) => text)

export const getSubtitlesFromFile = async (
  filePath: string,
  state: AppState
) => {
  const extension = extname(filePath).toLowerCase()
  const vttFilePath =
    extension === '.vtt' ? filePath : tempy.file({ extension: 'vtt' })
  const fileContents = await readFile(filePath, 'utf8')
  const chunks = parseSubtitles(state, fileContents, extension)

  if (extension === '.ass') await convertAssToVtt(filePath, vttFilePath)
  if (extension === '.srt')
    await writeFile(vttFilePath, stringifyVtt(chunks), 'utf8')
  return {
    vttFilePath,
    chunks,
  }
}

const newEmbeddedSubtitlesTrack = (
  id: string,
  chunks: Array<SubtitlesChunk>,
  streamIndex: number,
  tmpFilePath: string
): EmbeddedSubtitlesTrack => ({
  type: 'EmbeddedSubtitlesTrack',
  id,
  mode: 'showing',
  chunks,
  streamIndex,
  tmpFilePath,
})

export const newExternalSubtitlesTrack = (
  id: string,
  chunks: Array<SubtitlesChunk>,
  filePath: SubtitlesFilePath,
  vttFilePath: SubtitlesFilePath
): ExternalSubtitlesTrack => ({
  mode: 'showing',
  type: 'ExternalSubtitlesTrack',
  id,
  chunks,
  filePath,
  vttFilePath,
})

export const loadEmbeddedSubtitles: Epic<Action> = (action$, state$) =>
  action$.pipe(
    filter(action => action.type === 'OPEN_MEDIA_FILE_SUCCESS'),
    filter<OpenMediaFileSuccess, any>(({ subtitlesTracksStreamIndexes }) =>
      Boolean(subtitlesTracksStreamIndexes.length)
    ),
    flatMap<OpenMediaFileSuccess, *>(
      async ({ subtitlesTracksStreamIndexes, filePath }) => {
        try {
          const subtitles = await Promise.all(
            subtitlesTracksStreamIndexes.map(async streamIndex => {
              const { tmpFilePath, chunks } = await getSubtitlesFromMedia(
                filePath,
                streamIndex,
                state$.value
              )
              return newEmbeddedSubtitlesTrack(
                uuid(),
                chunks,
                streamIndex,
                tmpFilePath
              )
            })
          )
          return r.loadEmbeddedSubtitlesSuccess(subtitles)
        } catch (err) {
          console.error(err)
          return r.loadSubtitlesFailure(err.message || err.toString())
        }
      }
    )
  )

export const loadSubtitlesFailure: Epic<Action> = (action$, state$) =>
  action$.pipe(
    filter(action => action.type === 'LOAD_SUBTITLES_FAILURE'),
    map(({ error }) =>
      r.simpleMessageSnackbar(`Could not load subtitles: ${error}`)
    )
  )

export const loadSubtitlesFile: Epic<Action> = (action$, state$) =>
  action$.pipe(
    filter(action => action.type === 'LOAD_SUBTITLES_FROM_FILE_REQUEST'),
    flatMap<LoadSubtitlesFromFileRequest, any>(async ({ filePath }) => {
      try {
        const { chunks, vttFilePath } = await getSubtitlesFromFile(
          filePath,
          state$.value
        )

        return await r.loadExternalSubtitlesSuccess([
          newExternalSubtitlesTrack(uuid(), chunks, filePath, vttFilePath),
        ])
      } catch (err) {
        console.error(err.message)
        return await r.loadSubtitlesFailure(err.message || err.toString())
      }
    })
  )

const makeClipsFromSubtitles: Epic<Action> = (action$, state$) =>
  action$.pipe(
    filter(action => action.type === 'MAKE_CLIPS_FROM_SUBTITLES'),
    flatMap<MakeClipsFromSubtitles, Action>(
      ({ fileId, fieldNamesToTrackIds, tags }) => {
        const transcriptionTrackId = fieldNamesToTrackIds.transcription
        const transcriptionTrack = r.getSubtitlesTrack(
          state$.value,
          transcriptionTrackId
        )
        if (!transcriptionTrack)
          return of(
            r.simpleMessageSnackbar(
              'Could not find subtitles track to match with transcription field.'
            )
          )

        const currentNoteType = r.getCurrentNoteType(state$.value)
        const currentFile = r.getCurrentMediaMetadata(state$.value)
        if (!currentNoteType) throw new Error('Could not find note type.') // should be impossible
        if (!currentFile) throw new Error('Could not find media file.') // should be impossible
        const currentNoteTypeFields = getNoteTypeFields(currentNoteType)

        const clips = transcriptionTrack.chunks
          .sort(({ start: a }, { start: b }) => a - b)
          .map(chunk => {
            const fields: { [FlashcardFieldName]: string } = {
              transcription: chunk.text,
            }
            currentNoteTypeFields.forEach(fieldName => {
              const trackId = fieldNamesToTrackIds[fieldName]
              fields[fieldName] = trackId
                ? r
                    .getSubtitlesChunksWithinRange(
                      state$.value,
                      trackId,
                      chunk.start,
                      chunk.end
                    )
                    .map(chunk => chunk.text)
                    .join(' ')
                : ''
            })

            return newClip(chunk, fileId, uuid(), currentNoteType, tags, fields)
          })

        return from([
          r.deleteCards(
            r.getClipIdsByMediaFileId(state$.value, currentFile.id)
          ),
          ...Object.keys(fieldNamesToTrackIds).map(badTypefieldName => {
            const cast: any = badTypefieldName
            const fieldName: FlashcardFieldName = cast
            return r.linkFlashcardFieldToSubtitlesTrack(
              fieldName,
              fieldNamesToTrackIds[fieldName]
            )
          }),
          r.addClips(clips, fileId),
          r.highlightClip(clips[0].id),
        ])
      }
    )
  )

const subtitlesClipsDialogRequest = (action$, state$) =>
  action$.pipe(
    filter(action => action.type === 'SHOW_SUBTITLES_CLIPS_DIALOG_REQUEST'),
    map(() => {
      const tracks = r.getSubtitlesTracks(state$.value)
      if (!tracks.length)
        return r.simpleMessageSnackbar(
          'Please add a subtitles track and try again.'
        )
      const mediaFile = r.getCurrentMediaMetadata(state$.value)
      if (!mediaFile || !r.getCurrentFilePath(state$.value))
        return r.simpleMessageSnackbar(
          'Please locate this media file and try again.'
        )
      if (!r.getCurrentFileClips(state$.value).length)
        return r.subtitlesClipDialog()
      return r.confirmationDialog(
        'This action will delete any clips and cards you made for this current file. Are you sure you want to continue?',
        r.subtitlesClipDialog()
      )
    })
  )

const goToSubtitlesChunk = (action$, state$, { setCurrentTime }) =>
  action$.pipe(
    filter(action => action.type === 'GO_TO_SUBTITLES_CHUNK'),
    map<GoToSubtitlesChunk, any>(({ chunkIndex, subtitlesTrackId }) => {
      const track = r.getSubtitlesTrack(state$.value, subtitlesTrackId)
      if (!track) {
        console.error('Track not found')
        return { type: 'Subtitles track not found' }
      }
      const { start } = track.chunks[chunkIndex]
      setCurrentTime(r.getSecondsAtX(state$.value, start))
      return { type: 'moved to', start }
    })
  )

export default combineEpics(
  loadEmbeddedSubtitles,
  loadSubtitlesFile,
  loadSubtitlesFailure,
  makeClipsFromSubtitles,
  subtitlesClipsDialogRequest,
  goToSubtitlesChunk
)
