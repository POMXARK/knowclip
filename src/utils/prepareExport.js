// @flow
import * as r from '../redux'
import { toTimestamp } from '../utils/ffmpeg'
import { extname, basename } from 'path'
import { unparse } from 'papaparse'

const SAFE_SEPARATOR = '-'
const SAFE_MILLISECONDS_SEPARATOR = '_'

export const getApkgExportData = (
  state: AppState,
  projectMetadata: ProjectMetadata,
  noteType: NoteType
): ApkgExportData => {
  const fieldNames = noteType.fields.map(f => f.name)
  const [firstFieldName, ...restFieldNames] = fieldNames
  const mediaFilePaths = r.getMediaFilePaths(state, projectMetadata.id)

  const clips = mediaFilePaths
    .map(({ metadata, filePath }) => {
      if (!filePath)
        throw new Error(`Please locate ${metadata.name} and try again.`)

      const extension = extname(filePath)
      const filenameWithoutExtension = basename(filePath, extension)

      return state.clips.idsByMediaFileId[metadata.id].map(id => {
        const clip = r.getClip(state, id)
        if (!clip) throw new Error('Could not find clip ' + id)
        const startTime = r.getMillisecondsAtX(state, clip.start)
        const endTime = r.getMillisecondsAtX(state, clip.end)
        const outputFilename = `${filenameWithoutExtension}___${toTimestamp(
          startTime,
          SAFE_SEPARATOR
        )}-${toTimestamp(
          endTime,
          SAFE_SEPARATOR,
          SAFE_MILLISECONDS_SEPARATOR
        )}___afcaId${id}${'.mp3'}`
        return {
          sourceFilePath: filePath,
          startTime,
          endTime,
          outputFilename,
          flashcardSpecs: {
            fields: [
              clip.id,
              ...noteType.fields.map(f => clip.flashcard.fields[f.id] || ''),
              `[sound:${outputFilename}]`,
            ],
            tags: noteType.useTagsField ? clip.flashcard.tags : [],
          },
        }
      })
    })
    .reduce((a, b) => a.concat(b))

  return {
    deckName: `${projectMetadata.name} (Generated by AFCA)`,
    template: {
      fields: ['id', ...fieldNames, 'sound'],
      questionFormat: `{{${firstFieldName}}} {{sound}}`,
      answerFormat: `{{FrontSide}}\n\n<hr id="answer">\n\n${restFieldNames
        .map(fieldName => `{{${fieldName}}}`)
        .join('<br />')}`,
    },
    clips,
  }
}

export const getCsvText = (exportData: ApkgExportData): string => {
  const csvData: Array<Array<string>> = exportData.clips.map(
    ({ flashcardSpecs }) => [
      ...flashcardSpecs.fields,
      ...flashcardSpecs.tags.join(' '),
    ]
  )

  return unparse(csvData)
}

// web
// const exportCsv = (files, flashcards) => {
//   const usableFlashcards = files
//     .map(file => flashcards[file.name])
//     .filter(({ de, en }) => de.trim() || en.trim())
//     .map(({ en, de }, i) => [de, en, `[sound:${files[i].name}]`])
//   // TODO: alert if no usable
//   let csv = unparse(usableFlashcards)
//   const filename = 'export.csv'
//
//   if (!csv.match(/^data:text\/csv/i)) {
//     csv = 'data:text/csv;charset=utf-8,' + csv
//   }
//   const data = encodeURI(csv)
//
//   const link = document.createElement('a')
//   link.setAttribute('href', data)
//   link.setAttribute('download', filename)
//   link.click()
// }
