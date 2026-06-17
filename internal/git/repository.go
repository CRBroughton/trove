package git

import "time"

// Repository defines operations on the save-file git working tree.
type Repository interface {
	WriteFile(relPath string, data []byte, device string) error
	ReadFile(relPath string) ([]byte, error)
	ListFiles() ([]FileEntry, error)
	History(relPath string) ([]Commit, error)
	RestoreFile(relPath, hash string) error
}

// Commit represents a single git commit.
type Commit struct {
	Hash    string    `json:"hash"`
	Message string    `json:"message"`
	Date    time.Time `json:"date"`
	Author  string    `json:"author"`
}

// FileEntry represents a tracked save file with filesystem metadata.
type FileEntry struct {
	Path    string    `json:"path"`
	Size    int64     `json:"size"`
	ModTime time.Time `json:"mod_time"`
}
