import { switchMap, filter } from 'rxjs/operators'
import { EMPTY, fromEvent, of } from 'rxjs'
import r from '../redux'
import {
  WaveformDragEvent,
  WaveformDragCreate,
} from '../utils/WaveformMousedownEvent'
import uuid from 'uuid'

const clipCreateEpic: AppEpic = (
  action$,
  state$,
  { setCurrentTime, document }
) => {
  return fromEvent<WaveformDragEvent>(document, 'waveformDrag').pipe(
    filter(
      (e): e is WaveformDragEvent & { action: WaveformDragCreate } =>
        e.action.type === 'CREATE'
    ),
    switchMap(({ action: pendingClip }) => {
      const clipsOrder = r.getCurrentFileClipsOrder(state$.value)
      const clips = r.getCurrentFileClips(state$.value)
      const pendingClipOverlaps =
        [
          r.getClipIdAt(state$.value, pendingClip.start),
          r.getClipIdAt(state$.value, pendingClip.end),
        ].some((id) => id && clipsOrder.includes(id)) ||
        // TODO: optimize
        clips.some(
          (c) => c.start <= pendingClip.end && c.end >= pendingClip.start
        )

      const currentFileId = r.getCurrentFileId(state$.value)
      if (!currentFileId) throw new Error('Could not find current note type')

      const tooSmall =
        pendingClipOverlaps ||
        !(Math.abs(pendingClip.end - pendingClip.start) >= r.CLIP_THRESHOLD)

      const left = Math.min(pendingClip.start, pendingClip.end)
      const right = Math.max(pendingClip.start, pendingClip.end)

      console.log({ tooSmall })

      const newTime = r.getSecondsAtX(state$.value, tooSmall ? right : left)
      if (!tooSmall) setCurrentTime(newTime)

      // maybe later, do stretch + merge for overlaps.
      if (tooSmall) return EMPTY

      const fields = r.getNewFieldsFromLinkedSubtitles(state$.value, {
        start: left,
        end: right,
      })
      const { clip, flashcard } = r.getNewClipAndCard(
        state$.value,
        pendingClip,
        currentFileId,
        uuid(),
        fields
      )
      return of(
        r.addClip(
          clip,
          flashcard,
          !Object.values(fields).some((fieldValue) => fieldValue.trim())
        )
      )
    })
  )
}

export default clipCreateEpic
