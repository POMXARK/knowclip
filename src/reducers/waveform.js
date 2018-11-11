// @flow

const initialState: WaveformState = {
  stepsPerSecond: 25,
  stepLength: 2,
  cursor: { x: 0, y: 0 },
  viewBox: { xMin: 0 },
  peaks: [],
}

const waveform: Reducer<WaveformState> = (state = initialState, action) => {
  switch (action.type) {
    case 'SET_WAVEFORM_PEAKS':
      return {
        ...state,
        peaks: action.peaks || [],
      }

    case 'SET_CURSOR_POSITION': {
      return {
        ...state,
        cursor: {
          ...state.cursor,
          x: action.x,
        },
        viewBox: action.newViewBox || state.viewBox,
      }
    }

    default:
      return state
  }
}

export default waveform
