package api

import (
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/crbroughton/trove/internal/git"
)

type handler struct {
	repo git.Repository
}

// GET /api/files — list all tracked save files with metadata.
func (h *handler) listFiles(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	files, err := h.repo.ListFiles()
	if err != nil {
		jsonError(w, err, http.StatusInternalServerError)
		return
	}
	jsonOK(w, files)
}

// POST /api/push/<path>?device=<name> — write save file bytes and commit.
func (h *handler) pushSave(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	relPath, ok := extractPath(r.URL.Path, "/api/push/")
	if !ok {
		http.Error(w, "path required", http.StatusBadRequest)
		return
	}

	device := r.URL.Query().Get("device")
	if device == "" {
		device = "unknown"
	}

	data, err := io.ReadAll(io.LimitReader(r.Body, 64<<20)) // 64 MiB cap
	if err != nil {
		jsonError(w, err, http.StatusInternalServerError)
		return
	}

	if err := h.repo.WriteFile(relPath, data, device); err != nil {
		jsonError(w, err, http.StatusInternalServerError)
		return
	}

	jsonOK(w, map[string]string{"status": "ok", "path": relPath})
}

// GET /api/pull/<path> — return the latest save file bytes.
func (h *handler) pullSave(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	relPath, ok := extractPath(r.URL.Path, "/api/pull/")
	if !ok {
		http.Error(w, "path required", http.StatusBadRequest)
		return
	}

	data, err := h.repo.ReadFile(relPath)
	if err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filepath.Base(relPath)))
	_, _ = w.Write(data)
}

// GET /api/history/<path> — return git commit log for a save file.
func (h *handler) history(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	relPath, ok := extractPath(r.URL.Path, "/api/history/")
	if !ok {
		http.Error(w, "path required", http.StatusBadRequest)
		return
	}

	commits, err := h.repo.History(relPath)
	if err != nil {
		jsonError(w, err, http.StatusInternalServerError)
		return
	}

	jsonOK(w, commits)
}

// POST /api/restore/<path>?hash=<commit> — restore save to a previous commit.
func (h *handler) restore(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	relPath, ok := extractPath(r.URL.Path, "/api/restore/")
	hash := r.URL.Query().Get("hash")

	if !ok || hash == "" {
		http.Error(w, "path and hash required", http.StatusBadRequest)
		return
	}

	if err := h.repo.RestoreFile(relPath, hash); err != nil {
		jsonError(w, err, http.StatusInternalServerError)
		return
	}

	jsonOK(w, map[string]string{"status": "restored", "path": relPath, "hash": hash})
}

// extractPath strips prefix from urlPath, sanitizes it, and returns (path, true).
// Returns ("", false) if the result is empty or invalid.
func extractPath(urlPath, prefix string) (string, bool) {
	clean := sanitizePath(strings.TrimPrefix(urlPath, prefix))
	if clean == "" {
		return "", false
	}
	return clean, true
}

// sanitizePath cleans a user-supplied relative path to prevent directory traversal.
// Returns "" for empty, absolute, ".", or escaping inputs.
func sanitizePath(p string) string {
	if p == "" {
		return ""
	}
	clean := filepath.Clean(p)
	if filepath.IsAbs(clean) || clean == "." || strings.HasPrefix(clean, "..") {
		return ""
	}
	return clean
}
