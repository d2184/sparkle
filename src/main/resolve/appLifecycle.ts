import { app, ipcMain, powerMonitor, type BrowserWindow, type IpcMainEvent } from 'electron'
import { stopCore } from '../core/manager'
import { disableSysProxySync, triggerSysProxy } from '../sys/sysproxy'

interface AppQuitLifecycleContext {
  getMainWindow: () => BrowserWindow | null
  showWindow: () => number
  clearLightweightTimeout: () => void
  exitApp: () => void
}

let isQuitting = false
let notQuitDialog = false
let lastQuitAttempt = 0

export function setNotQuitDialog(): void {
  notQuitDialog = true
}

export function initAppQuitLifecycle(context: AppQuitLifecycleContext): void {
  app.on('window-all-closed', () => {
    // Don't quit app when all windows are closed
  })

  app.on('before-quit', async (event) => {
    if (!isQuitting && !notQuitDialog) {
      event.preventDefault()

      const now = Date.now()
      if (now - lastQuitAttempt < 500) {
        await quit(context)
        return
      }
      lastQuitAttempt = now

      if (await showQuitConfirmDialog(context)) {
        await quit(context)
      }
    } else if (notQuitDialog) {
      await quit(context)
    }
  })

  powerMonitor.on('shutdown', async () => {
    context.clearLightweightTimeout()
    await triggerSysProxy(false, false, true)
    await stopCore()
    context.exitApp()
  })

  app.on('will-quit', () => {
    disableSysProxySync()
  })
}

async function quit(context: AppQuitLifecycleContext): Promise<void> {
  isQuitting = true
  context.clearLightweightTimeout()
  await triggerSysProxy(false, false)
  await stopCore()
  context.exitApp()
}

function showQuitConfirmDialog(context: AppQuitLifecycleContext): Promise<boolean> {
  return new Promise((resolve) => {
    const mainWindow = context.getMainWindow()
    if (!mainWindow) {
      resolve(true)
      return
    }

    const delay = context.showWindow()
    setTimeout(() => {
      context.getMainWindow()?.webContents.send('show-quit-confirm')
      const handleQuitConfirm = (_event: IpcMainEvent, confirmed: boolean): void => {
        ipcMain.off('quit-confirm-result', handleQuitConfirm)
        resolve(confirmed)
      }
      ipcMain.once('quit-confirm-result', handleQuitConfirm)
    }, delay)
  })
}
