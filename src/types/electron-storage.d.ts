declare module 'electron-storage' {
  interface ElectronStorage {
    get<T = unknown>(filePath: string): Promise<T>
    set<T = unknown>(filePath: string, data: T): Promise<void>
    remove(fileOrDirPath: string): Promise<void>
    isPathExists(fileOrDirPath: string): Promise<boolean>
  }

  const storage: ElectronStorage

  export default storage
}
