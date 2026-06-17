package git_test

import (
	"os"
	"testing"

	"github.com/crbroughton/trove/internal/git"
)

func newTestRepo(t *testing.T) *git.Repo {
	t.Helper()
	r, err := git.Open(t.TempDir())
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	return r
}

func TestOpen_createsGitDir(t *testing.T) {
	dir := t.TempDir()
	_, err := git.Open(dir)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	if _, err := os.Stat(dir + "/.git"); err != nil {
		t.Errorf(".git not created: %v", err)
	}
}

func TestOpen_idempotent(t *testing.T) {
	dir := t.TempDir()
	if _, err := git.Open(dir); err != nil {
		t.Fatalf("first Open: %v", err)
	}
	if _, err := git.Open(dir); err != nil {
		t.Fatalf("second Open on existing repo: %v", err)
	}
}

func TestWriteFile_ReadFile_roundtrip(t *testing.T) {
	r := newTestRepo(t)
	want := []byte("save data v1")

	if err := r.WriteFile("gba/pokemon.srm", want, "device1"); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}

	got, err := r.ReadFile("gba/pokemon.srm")
	if err != nil {
		t.Fatalf("ReadFile: %v", err)
	}
	if string(got) != string(want) {
		t.Errorf("got %q, want %q", got, want)
	}
}

func TestWriteFile_createsSubdirectories(t *testing.T) {
	r := newTestRepo(t)
	if err := r.WriteFile("deep/nested/dir/save.srm", []byte("x"), "d"); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
}

func TestListFiles_empty(t *testing.T) {
	r := newTestRepo(t)
	files, err := r.ListFiles()
	if err != nil {
		t.Fatalf("ListFiles: %v", err)
	}
	if files == nil {
		t.Error("want empty slice, got nil")
	}
	if len(files) != 0 {
		t.Errorf("want 0 files, got %d", len(files))
	}
}

func TestListFiles_multipleFiles(t *testing.T) {
	r := newTestRepo(t)
	if err := r.WriteFile("gba/a.srm", []byte("a"), "d"); err != nil {
		t.Fatal(err)
	}
	if err := r.WriteFile("gba/b.srm", []byte("b"), "d"); err != nil {
		t.Fatal(err)
	}

	files, err := r.ListFiles()
	if err != nil {
		t.Fatalf("ListFiles: %v", err)
	}
	if len(files) != 2 {
		t.Errorf("want 2 files, got %d", len(files))
	}
}

func TestHistory_recordsCommits(t *testing.T) {
	r := newTestRepo(t)

	if err := r.WriteFile("gba/x.srm", []byte("v1"), "d"); err != nil {
		t.Fatal(err)
	}
	if err := r.WriteFile("gba/x.srm", []byte("v2"), "d"); err != nil {
		t.Fatal(err)
	}

	commits, err := r.History("gba/x.srm")
	if err != nil {
		t.Fatalf("History: %v", err)
	}
	if len(commits) != 2 {
		t.Errorf("want 2 commits, got %d", len(commits))
	}
}

func TestHistory_noCommitsForFile(t *testing.T) {
	r := newTestRepo(t)
	// seed at least one commit so git log is valid
	if err := r.WriteFile("other.srm", []byte("x"), "d"); err != nil {
		t.Fatal(err)
	}
	commits, err := r.History("never-committed.srm")
	if err != nil {
		t.Fatalf("History: %v", err)
	}
	if commits == nil {
		t.Error("want empty slice, got nil")
	}
	if len(commits) != 0 {
		t.Errorf("want 0 commits, got %d", len(commits))
	}
}

func TestRestoreFile_revertsContent(t *testing.T) {
	r := newTestRepo(t)

	if err := r.WriteFile("gba/x.srm", []byte("v1"), "d"); err != nil {
		t.Fatal(err)
	}
	if err := r.WriteFile("gba/x.srm", []byte("v2"), "d"); err != nil {
		t.Fatal(err)
	}

	commits, err := r.History("gba/x.srm")
	if err != nil || len(commits) < 2 {
		t.Fatalf("History: err=%v len=%d", err, len(commits))
	}

	// commits[0] = newest (v2), commits[1] = oldest (v1)
	if err := r.RestoreFile("gba/x.srm", commits[1].Hash); err != nil {
		t.Fatalf("RestoreFile: %v", err)
	}

	got, err := r.ReadFile("gba/x.srm")
	if err != nil {
		t.Fatal(err)
	}
	if string(got) != "v1" {
		t.Errorf("after restore got %q, want %q", got, "v1")
	}
}

func TestRestoreFile_shortHashRejected(t *testing.T) {
	r := newTestRepo(t)
	if err := r.WriteFile("gba/x.srm", []byte("v1"), "d"); err != nil {
		t.Fatal(err)
	}
	if err := r.RestoreFile("gba/x.srm", "ab"); err == nil {
		t.Error("want error for hash shorter than 4 chars, got nil")
	}
}
