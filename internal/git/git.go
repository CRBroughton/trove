package git

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

// Repo wraps a git working tree used to version save files.
type Repo struct {
	path string
}

// Compile-time check that Repo satisfies Repository.
var _ Repository = (*Repo)(nil)

// Open opens an existing git repo at path, or initialises a new one.
func Open(path string) (*Repo, error) {
	if err := os.MkdirAll(path, 0755); err != nil {
		return nil, fmt.Errorf("mkdir %s: %w", path, err)
	}

	r := &Repo{path: path}

	if _, err := os.Stat(filepath.Join(path, ".git")); os.IsNotExist(err) {
		if err := r.run("git", "init"); err != nil {
			return nil, fmt.Errorf("git init: %w", err)
		}
		if err := r.run("git", "config", "user.email", "trove@localhost"); err != nil {
			return nil, err
		}
		if err := r.run("git", "config", "user.name", "trove"); err != nil {
			return nil, err
		}
	}

	return r, nil
}

// WriteFile writes content to a file inside the repo and commits it.
// relPath is relative to the repo root, e.g. "gba/pokemon.srm".
func (r *Repo) WriteFile(relPath string, data []byte, device string) error {
	abs := filepath.Join(r.path, relPath)

	if err := os.MkdirAll(filepath.Dir(abs), 0755); err != nil {
		return fmt.Errorf("mkdir: %w", err)
	}
	if err := os.WriteFile(abs, data, 0644); err != nil {
		return fmt.Errorf("write file: %w", err)
	}
	if err := r.run("git", "add", relPath); err != nil {
		return fmt.Errorf("git add: %w", err)
	}

	msg := fmt.Sprintf("sync %s from %s", relPath, device)
	if err := r.run("git", "commit", "--allow-empty", "-m", msg); err != nil {
		return fmt.Errorf("git commit: %w", err)
	}

	return nil
}

// ReadFile reads the latest version of a file from the working tree.
func (r *Repo) ReadFile(relPath string) ([]byte, error) {
	return os.ReadFile(filepath.Join(r.path, relPath))
}

// History returns the commit log for a specific file, newest first.
func (r *Repo) History(relPath string) ([]Commit, error) {
	out, err := r.output("git", "log", "--format=%H|%s|%aI|%an", "--", relPath)
	if err != nil {
		return nil, fmt.Errorf("git log: %w", err)
	}

	commits := make([]Commit, 0)
	for _, line := range strings.Split(strings.TrimSpace(out), "\n") {
		if line == "" {
			continue
		}
		parts := strings.SplitN(line, "|", 4)
		if len(parts) != 4 {
			continue
		}
		t, _ := time.Parse(time.RFC3339, parts[2])
		commits = append(commits, Commit{
			Hash:    parts[0],
			Message: parts[1],
			Date:    t,
			Author:  parts[3],
		})
	}
	return commits, nil
}

// ListFiles returns all tracked files in the repo with filesystem metadata.
func (r *Repo) ListFiles() ([]FileEntry, error) {
	out, err := r.output("git", "ls-files")
	if err != nil {
		return nil, err
	}

	entries := make([]FileEntry, 0)
	for _, rel := range strings.Split(strings.TrimSpace(out), "\n") {
		if rel == "" {
			continue
		}
		info, err := os.Stat(filepath.Join(r.path, rel))
		if err != nil {
			continue
		}
		entries = append(entries, FileEntry{
			Path:    rel,
			Size:    info.Size(),
			ModTime: info.ModTime(),
		})
	}
	return entries, nil
}

// RestoreFile checks out relPath at the given commit hash and creates a restore commit.
func (r *Repo) RestoreFile(relPath, hash string) error {
	if len(hash) < 4 {
		return fmt.Errorf("hash too short: %q", hash)
	}
	if err := r.run("git", "checkout", hash, "--", relPath); err != nil {
		return fmt.Errorf("git checkout: %w", err)
	}
	short := hash
	if len(short) > 8 {
		short = short[:8]
	}
	return r.run("git", "commit", "--allow-empty", "-m", fmt.Sprintf("restore %s to %s", relPath, short))
}

func (r *Repo) run(name string, args ...string) error {
	cmd := exec.Command(name, args...)
	cmd.Dir = r.path
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("%s: %w\n%s", strings.Join(args, " "), err, out)
	}
	return nil
}

func (r *Repo) output(name string, args ...string) (string, error) {
	cmd := exec.Command(name, args...)
	cmd.Dir = r.path
	out, err := cmd.Output()
	if err != nil {
		return "", err
	}
	return string(out), nil
}
