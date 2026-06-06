import { contextBridge, ipcRenderer } from 'electron'

declare global {
  interface Window {
    App: typeof API
  }
}

const API = {
  checkRadioStream: (url: string) =>
    ipcRenderer.invoke('radio:check-stream', url) as Promise<boolean>,
  quit: () => ipcRenderer.invoke('app:quit'),
  sayHelloFromBridge: () => console.log('\nHello from bridgeAPI! 👋\n\n'),
  username: process.env.USER,
}

contextBridge.exposeInMainWorld('App', API)
