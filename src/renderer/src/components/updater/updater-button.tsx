import React, { useState, useEffect } from 'react'
import UpdaterDrawer from './updater-drawer'
import { cancelUpdate } from '@renderer/utils/ipc'
import { notify } from '@renderer/utils/notification'

let notifiedUpdateVersion = ''

interface Props {
  latest?: {
    version: string
    changelog: string
  }
}

const UpdaterButton: React.FC<Props> = (props) => {
  const { latest } = props
  const [openDrawer, setOpenDrawer] = useState(false)
  const [drawerReopenSignal, setDrawerReopenSignal] = useState(0)
  const [updateStatus, setUpdateStatus] = useState<{
    downloading: boolean
    progress: number
    error?: string
  }>({
    downloading: false,
    progress: 0
  })

  useEffect(() => {
    const handleUpdateStatus = (
      _: Electron.IpcRendererEvent,
      status: typeof updateStatus
    ): void => {
      setUpdateStatus(status)
    }

    window.electron.ipcRenderer.on('update-status', handleUpdateStatus)

    return (): void => {
      window.electron.ipcRenderer.removeAllListeners('update-status')
    }
  }, [])

  useEffect(() => {
    if (!latest || latest.version === notifiedUpdateVersion) return
    notifiedUpdateVersion = latest.version
    notify('发现新版本', {
      actionProps: {
        children: '查看内容',
        onPress: () => {
          setOpenDrawer(true)
          setDrawerReopenSignal((signal) => signal + 1)
        },
        variant: 'secondary'
      },
      body: `${latest.version} 版本就绪`,
      forceToast: true,
      timeout: 8000,
      variant: 'accent'
    })
  }, [latest])

  const handleCancelUpdate = async (): Promise<void> => {
    try {
      await cancelUpdate()
      setUpdateStatus({ downloading: false, progress: 0 })
    } catch (e) {
      // ignore
    }
  }

  if (!latest) return null

  return (
    <>
      {openDrawer && (
        <UpdaterDrawer
          version={latest.version}
          changelog={latest.changelog}
          updateStatus={updateStatus}
          reopenSignal={drawerReopenSignal}
          onCancel={handleCancelUpdate}
          onClose={() => {
            setOpenDrawer(false)
          }}
        />
      )}
    </>
  )
}

export default UpdaterButton
