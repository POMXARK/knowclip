import {
  filter,
  map,
  ignoreElements,
  tap,
  mergeMap,
  mergeAll,
  take,
} from 'rxjs/operators'
import { combineEpics } from 'redux-observable'
import { EMPTY, of } from 'rxjs'
import r from '../redux'
import { showMessageBox, showOpenDialog } from '../utils/electron'
import electron, { shell } from 'electron'
import rcompare from 'semver/functions/rcompare'
import gt from 'semver/functions/gt'
import { join } from 'path'
import { REHYDRATE } from 'redux-persist'
import packageJson from '../../package.json'

const showSettingsDialog: AppEpic = (
  action$,
  state$,
  { fromIpcRendererEvent }
) =>
  fromIpcRendererEvent('show-settings-dialog').pipe(
    filter(() => !state$.value.dialog.queue.some((d) => d.type === 'Settings')),
    map(() => r.settingsDialog())
  )

const aboutMessage = [
  `Version ${packageJson.version}`,
  `Build #${process.env.REACT_APP_BUILD_NUMBER || '[DEV BUILD]'}`,
  'Distributed under GNU Affero General Public License 3.0.',
  'Thanks to my dear patrons ♡ Phillip Allen, Towel Sniffer, Ryan Leach, Juan Antonio Tubío',
  '© 2020 Justin Silvestre',
].join('\n\n')

const showAboutDialog: AppEpic = (
  action$,
  state$,
  { fromIpcRendererEvent, pauseMedia, sendToMainProcess }
) =>
  fromIpcRendererEvent('show-about-dialog').pipe(
    mergeMap(() => {
      pauseMedia()
      return sendToMainProcess({
        type: 'showAboutDialog',
        args: [aboutMessage],
      })
    }),
    ignoreElements()
  )

const saveProject: AppEpic = (action$, state$, { fromIpcRendererEvent }) =>
  fromIpcRendererEvent('save-project-request').pipe(
    map(() => r.saveProjectRequest())
  )

const closeProject: AppEpic = (action$, state$, { fromIpcRendererEvent }) =>
  fromIpcRendererEvent('close-project-request').pipe(
    map(() => r.closeProjectRequest())
  )

const openProject: AppEpic = (action$, state$, { fromIpcRendererEvent }) =>
  fromIpcRendererEvent('open-project').pipe(
    mergeMap(
      async () =>
        await showOpenDialog([
          {
            name: 'Knowclip project file',
            extensions: ['kyml'],
          },
        ])
    ),

    mergeMap((filePaths) => {
      if (!filePaths) return EMPTY

      const filePath = filePaths[0]
      return of(r.openProjectRequestByFilePath(filePath))
    })
  )

const startupCheckForUpdates: AppEpic = (action$, state$, { window }) =>
  action$.ofType<any>(REHYDRATE).pipe(
    take(1),
    mergeMap(async () => {
      const checkAtStartup = state$.value.settings.checkForUpdatesAutomatically
      if (!checkAtStartup) return EMPTY

      if (!window.navigator.onLine) return EMPTY

      const { errors, value: newestRelease } = await checkForUpdates()

      if (errors) {
        const messageBoxResult = await showMessageBox({
          title: 'Check for updates',
          message:
            "The most recent update info can't be fetched at this time. Would you like to visit the web site to check for updates manually?",
          buttons: ['Yes', 'No thanks'],
          cancelId: 1,
        })

        if (messageBoxResult && messageBoxResult.response === 0)
          electron.shell.openExternal(
            'https://github.com/knowclip/knowclip/releases'
          )
      }

      const newSettings =
        newestRelease &&
        (await showDownloadPrompt(checkAtStartup, newestRelease.tag_name))

      return newSettings ? of(r.overrideSettings(newSettings)) : EMPTY
    }),
    mergeAll()
  )

const menuCheckForUpdates: AppEpic = (
  action$,
  state$,
  { window, fromIpcRendererEvent }
) =>
  fromIpcRendererEvent('check-for-updates').pipe(
    mergeMap(async () => {
      if (!window.navigator.onLine) {
        const messageBoxResult = await showMessageBox({
          title: 'Check for updates',
          message:
            "The most recent update info can't be fetched at this time. Would you like to visit the web site to check for updates manually?",
          buttons: ['Yes', 'No thanks'],
          cancelId: 1,
        })

        if (messageBoxResult && messageBoxResult.response === 0)
          electron.shell.openExternal(
            'https://github.com/knowclip/knowclip/releases'
          )

        return EMPTY
      }

      const { errors, value: newestRelease } = await checkForUpdates()

      if (errors) {
        console.error(errors.join('; '))
        return EMPTY
      }
      const checkAtStartup = state$.value.settings.checkForUpdatesAutomatically

      const newSettings = newestRelease
        ? await showDownloadPrompt(checkAtStartup, newestRelease.tag_name)
        : await showUpToDateMessageBox(checkAtStartup)

      return newSettings ? of(r.overrideSettings(newSettings)) : EMPTY
    }),
    mergeAll()
  )

const checkForUpdates = process.env.REACT_APP_CHROMEDRIVER
  ? async (): Promise<Result<{ tag_name: string } | null>> => ({
      value: null,
    })
  : async (): Promise<Result<{ tag_name: string } | null>> => {
      try {
        const response = await fetch(
          'https://api.github.com/repos/knowclip/knowclip/releases',
          {
            headers: {
              Accept: 'application/vnd.github.v3+json',
            },
          }
        )
        const releases: { tag_name: string }[] = await response.json()
        const newestRelease = releases

          .sort((r1, r2) => rcompare(r1.tag_name, r2.tag_name))
          .find(({ tag_name: tagName }) => gt(tagName, packageJson.version))

        return { value: newestRelease || null }
      } catch (err) {
        return { errors: [`${err}`] }
      }
    }

async function showDownloadPrompt(
  checkAtStartup: boolean,
  tagName: string
): Promise<Partial<SettingsState> | null> {
  const messageBoxResult = await showMessageBox({
    title: 'An update is available!',
    message: `An newer version of Knowclip (${tagName}) is currently available for download.\n
Would you like to go to the download page now for details?\n`,
    checkboxChecked: checkAtStartup,
    checkboxLabel: 'Check for updates again next time I open Knowclip',
    buttons: ['Yes', 'No thanks'],
    cancelId: 1,
  })
  if (messageBoxResult) {
    if (messageBoxResult.response === 0)
      electron.shell.openExternal(
        'https://github.com/knowclip/knowclip/releases'
      )

    const checkAtStartupChanged =
      messageBoxResult && messageBoxResult.checkboxChecked !== checkAtStartup
    return checkAtStartupChanged
      ? { checkForUpdatesAutomatically: messageBoxResult.checkboxChecked }
      : null
  }

  return null
}

async function showUpToDateMessageBox(checkAtStartup: boolean) {
  const messageBoxResult = await showMessageBox({
    title: `You're up to date!`,
    message: `You're already running the latest version of Knowclip (${packageJson.version}).`,
    checkboxLabel: 'Check for updates again next time I open Knowclip',
    checkboxChecked: checkAtStartup,
    buttons: ['OK'],
    cancelId: 1,
  })

  if (messageBoxResult) {
    const checkAtStartupChanged =
      messageBoxResult && messageBoxResult.checkboxChecked !== checkAtStartup
    return checkAtStartupChanged
      ? { checkForUpdatesAutomatically: messageBoxResult.checkboxChecked }
      : null
  }
  return null
}

export default combineEpics(
  showSettingsDialog,
  showAboutDialog,
  saveProject,
  closeProject,
  openProject,
  startupCheckForUpdates,
  menuCheckForUpdates
)
