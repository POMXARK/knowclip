import * as yauzl from 'yauzl'
import { getTableName, LexiconEntry } from '../../files/dictionaryFile'
import { toHiragana } from 'wanakana'
import { getDexieDb } from '../dictionariesDatabase'
import { concat, defer, from, fromEvent, of } from 'rxjs'
import { catchError, map, mergeMap, takeUntil, tap } from 'rxjs/operators'
import { Readable } from 'stream'

export async function parseYomichanZip(
  file: YomichanDictionary,
  filePath: string
) {
  // create table for dictionary entry
  // for each term_bank_*.json file in archive
  // add to indexeddb
  let termBankMet = false
  const zipfile: yauzl.ZipFile = await new Promise((res, rej) => {
    yauzl.open(filePath, { lazyEntries: true }, function(err, zipfile) {
      if (err) return rej(err)
      if (!zipfile) return rej(new Error('problem reading zip file'))

      res(zipfile)
    })
  })

  const { entryCount } = zipfile

  let visitedEntries = 0

  const entriesObservable = fromEvent(zipfile, 'entry').pipe(
    takeUntil(fromEvent(zipfile, 'close')),
    mergeMap(_entry => {
      visitedEntries++

      const entry: yauzl.Entry = _entry as any
      console.log(entry.uncompressedSize)
      if (!/term_bank_/.test(entry.fileName)) {
        zipfile.readEntry()
        return of(visitedEntries / entryCount)
      }
      termBankMet = true
      console.log('match!')

      const entryReadStreamPromise: Promise<Readable> = new Promise(
        (res, rej) => {
          zipfile.openReadStream(entry as yauzl.Entry, (err, readStream) => {
            if (err) return rej(err)
            if (!readStream) return rej(new Error('problem streaming zip file'))

            res(readStream)
          })
        }
      )

      let rawJson = ''
      let entryBytesProcessed = 0
      const { uncompressedSize: entryTotalBytes } = entry
      return concat(
        from(entryReadStreamPromise).pipe(
          mergeMap(entryReadStream =>
            fromEvent(entryReadStream, 'data').pipe(
              takeUntil(fromEvent(entryReadStream, 'end'))
            )
          ),
          tap(_data => {
            const data: Buffer = _data as any
            rawJson += data.toString()

            entryBytesProcessed += data.length
          }),
          map(() => {
            const entryFractionProcessed =
              (entryBytesProcessed / entryTotalBytes) * (1 / entryCount)
            return entryFractionProcessed + (visitedEntries - 1) / entryCount
          })
        ),

        // TODO: stream error event?\
        defer(() => {
          return from(importDictionaryEntries(rawJson, file, zipfile)).pipe(
            tap(() => zipfile.readEntry()),
            map(() => visitedEntries / entryCount)
          )
        })
      )
    })
  )

  const progressObservable = concat(
    entriesObservable,
    defer(() => {
      console.log('import complete!', new Date(Date.now()), Date.now())

      if (!termBankMet) throw new Error(`Invalid dictionary file.`)

      return from([100])
    })
  ).pipe(
    catchError(err => {
      zipfile.close()
      throw err
    })
  )

  zipfile.readEntry()

  return progressObservable
}

async function importDictionaryEntries(
  rawJson: string,
  file: YomichanDictionary,
  zipfile: yauzl.ZipFile
) {
  const entriesJSON = JSON.parse(rawJson) as [
    string,
    string,
    string,
    string,
    number,
    string[],
    number,
    string
  ][]

  const entries: LexiconEntry[] = []
  for (const [
    head,
    pronunciation,
    tags,
    rules,
    frequencyScore,
    meanings,
    _sequence,
    _termTags,
  ] of entriesJSON) {
    const coercedHiragana = toHiragana(pronunciation || head)
    const dictEntry: LexiconEntry = {
      variant: false,
      dictionaryKey: file.key,
      head,
      pronunciation,
      tags: [...new Set([...tags.split(' '), ...rules.split(' ')])].join(' '),
      frequencyScore,
      meanings,
      // searchStems: [],
      // searchStemsSorted: '',
      // searchTokens: [],
      // searchTokensSorted: '',
      tokenCombos:
        coercedHiragana !== (pronunciation || head) ? [coercedHiragana] : [],
      searchTokensCount: 0,
    }
    // console.log({ dictEntry })
    entries.push(dictEntry)
  }

  await getDexieDb()
    .table(getTableName(file.type))
    .bulkAdd(entries)
}
