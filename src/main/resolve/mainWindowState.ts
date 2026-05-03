import { app, screen, type BrowserWindow, type Rectangle } from 'electron'
import windowStateKeeper from 'electron-window-state'
import { readFileSync } from 'fs'
import path from 'path'

type SavedWindowState = Rectangle & {
  displayBounds?: Rectangle
  isMaximized?: boolean
  isFullScreen?: boolean
}

type MainWindowState = {
  x?: number
  y?: number
  width: number
  height: number
  isMaximized?: boolean
  isFullScreen?: boolean
}

const WINDOW_STATE_FILE = 'window-state.json'
const DEFAULT_WIDTH = 800
const DEFAULT_HEIGHT = 700
const BOUNDS_KEYS = ['x', 'y', 'width', 'height'] as const

function readSavedWindowState(): SavedWindowState | null {
  if (process.platform !== 'win32') return null

  try {
    return JSON.parse(
      readFileSync(path.join(app.getPath('userData'), WINDOW_STATE_FILE), 'utf8')
    ) as SavedWindowState
  } catch {
    return null
  }
}

export function createMainWindowStateManager(): {
  state: MainWindowState
  attach: (win: BrowserWindow) => void
  cleanup: () => void
  save: () => void
} {
  const stateKeeper = windowStateKeeper({
    defaultWidth: DEFAULT_WIDTH,
    defaultHeight: DEFAULT_HEIGHT,
    file: WINDOW_STATE_FILE
  })
  const savedState = readSavedWindowState()
  const isWin = process.platform === 'win32'
  const isDefaultFallback =
    isWin &&
    stateKeeper.x === 0 &&
    stateKeeper.y === 0 &&
    stateKeeper.width === DEFAULT_WIDTH &&
    stateKeeper.height === DEFAULT_HEIGHT
  const state =
    isDefaultFallback && savedState
      ? savedState
      : {
          x: stateKeeper.x,
          y: stateKeeper.y,
          width: stateKeeper.width,
          height: stateKeeper.height,
          isMaximized: stateKeeper.isMaximized,
          isFullScreen: stateKeeper.isFullScreen
        }

  let win: BrowserWindow | null = null
  let canSave = !isWin
  let restoreTimer: NodeJS.Timeout | null = null
  let restoreAttempts = 0

  function save(): void {
    if (canSave && win?.isVisible()) stateKeeper.saveState(win)
  }

  function isSavedDisplayReady(): boolean {
    const savedBounds = savedState?.displayBounds
    if (!savedState || !savedBounds) return true
    const bounds = screen.getDisplayMatching(savedState).bounds
    return BOUNDS_KEYS.every((key) => bounds[key] === savedBounds[key])
  }

  function cleanup(): void {
    if (restoreTimer) clearInterval(restoreTimer)
    screen.off('display-metrics-changed', restoreSavedState)
  }

  function restoreSavedState(): void {
    if (!win || !savedState?.width || !savedState.height) {
      canSave = true
      cleanup()
      return
    }

    restoreAttempts += 1
    win.setBounds(savedState)
    if (savedState.isMaximized) win.maximize()
    if (savedState.isFullScreen) win.setFullScreen(true)

    const displayReady = isSavedDisplayReady()
    if (displayReady || restoreAttempts >= 10) {
      canSave = true
      cleanup()
      if (displayReady) save()
    }
  }

  function attach(browserWindow: BrowserWindow): void {
    win = browserWindow
    if (state.isMaximized) win.maximize()
    if (state.isFullScreen) win.setFullScreen(true)
    win.once('show', () => {
      if (!isWin) return
      screen.on('display-metrics-changed', restoreSavedState)
      restoreSavedState()
      if (!canSave) restoreTimer = setInterval(restoreSavedState, 1000)
    })
  }

  return {
    state,
    attach,
    cleanup,
    save
  }
}
