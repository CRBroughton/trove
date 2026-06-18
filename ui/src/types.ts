export interface FileEntry {
  path: string
  size: number
  mod_time: string
}

export interface Commit {
  hash: string
  message: string
  date: string
  author: string
}
