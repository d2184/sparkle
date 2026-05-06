import { Button, Drawer, InputGroup, Switch } from '@heroui-v3/react'
import React, { useEffect, useRef, useState } from 'react'
import SettingItem from '../base/base-setting-item'
import { settingItemProps } from '../base/base-controls'
import { useAppConfig } from '@renderer/hooks/use-app-config'
import { restartMihomoConnections } from '@renderer/utils/ipc'

interface Props {
  onClose: () => void
  reopenSignal?: number
}

const DRAWER_CLOSE_ANIMATION_MS = 700

const ConnectionSettingDrawer: React.FC<Props> = (props) => {
  const { onClose, reopenSignal } = props
  const { appConfig, patchAppConfig } = useAppConfig()

  const { displayIcon = true, displayAppName = true, connectionInterval = 500 } = appConfig || {}
  const [intervalInput, setIntervalInput] = useState(connectionInterval)
  const [isOpen, setIsOpen] = useState(true)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (closeTimer.current) {
        clearTimeout(closeTimer.current)
      }
    }
  }, [])

  useEffect(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
    setIsOpen(true)
  }, [reopenSignal])

  const closeWithAnimation = (): void => {
    if (closeTimer.current) return

    setIsOpen(false)
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null
      onClose()
    }, DRAWER_CLOSE_ANIMATION_MS)
  }

  return (
    <Drawer.Backdrop
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) closeWithAnimation()
      }}
      variant="blur"
      className="top-12 h-[calc(100%-48px)]"
    >
      <Drawer.Content placement="right" className="top-12 h-[calc(100%-48px)] p-3 pl-0">
        <Drawer.Dialog className="flex h-full w-[min(460px,calc(100vw-32px))] max-w-none flex-col overflow-hidden rounded-2xl! border border-separator/70 bg-overlay p-0 shadow-overlay flag-emoji">
          <Drawer.Header className="border-b border-separator/70 px-5 py-4">
            <Drawer.Heading className="text-base font-semibold">连接设置</Drawer.Heading>
          </Drawer.Header>
          <Drawer.Body className="no-scrollbar flex-1 overflow-y-auto px-5 py-3">
            <div className="flex flex-col gap-1">
              <SettingItem title="显示应用图标" {...settingItemProps} divider>
                <Switch
                  aria-label="显示应用图标"
                  isSelected={displayIcon}
                  onChange={(v) => {
                    patchAppConfig({ displayIcon: v })
                  }}
                >
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch>
              </SettingItem>
              <SettingItem title="显示应用名称" {...settingItemProps} divider>
                <Switch
                  aria-label="显示应用名称"
                  isSelected={displayAppName}
                  onChange={(v) => {
                    patchAppConfig({ displayAppName: v })
                  }}
                >
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch>
              </SettingItem>
              <SettingItem title="刷新间隔" {...settingItemProps}>
                <div className="setting-item__inline-controls">
                  {intervalInput !== connectionInterval && (
                    <Button
                      size="sm"
                      variant="primary"
                      onPress={() => {
                        const actualValue = Math.min(10000, Math.max(100, intervalInput))
                        setIntervalInput(actualValue)
                        patchAppConfig({ connectionInterval: actualValue })
                        restartMihomoConnections()
                      }}
                    >
                      确认
                    </Button>
                  )}
                  <InputGroup variant="secondary">
                    <InputGroup.Input
                      aria-label="刷新间隔"
                      type="number"
                      value={intervalInput.toString()}
                      max={10000}
                      min={100}
                      onChange={(event) => {
                        setIntervalInput(parseInt(event.target.value) || 100)
                      }}
                    />
                    <InputGroup.Suffix>ms</InputGroup.Suffix>
                  </InputGroup>
                </div>
              </SettingItem>
            </div>
          </Drawer.Body>
          <Drawer.CloseTrigger className="app-nodrag" />
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  )
}

export default ConnectionSettingDrawer
