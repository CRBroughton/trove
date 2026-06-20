package api_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/crbroughton/trove/internal/api"
	"github.com/crbroughton/trove/internal/git"
	"github.com/crbroughton/trove/internal/trade"
)

// mockRepo implements git.Repository without touching the filesystem.
type mockRepo struct {
	stored  map[string][]byte
	commits map[string][]git.Commit

	writeErr error
	readErr  error
	listErr  error
	histErr  error
	restErr  error

	files []git.FileEntry
}

func newMock() *mockRepo {
	return &mockRepo{
		stored:  make(map[string][]byte),
		commits: make(map[string][]git.Commit),
	}
}

func (m *mockRepo) WriteFile(relPath string, data []byte, _ string) error {
	if m.writeErr != nil {
		return m.writeErr
	}
	m.stored[relPath] = data
	return nil
}

func (m *mockRepo) ReadFile(relPath string) ([]byte, error) {
	if m.readErr != nil {
		return nil, m.readErr
	}
	data, ok := m.stored[relPath]
	if !ok {
		return nil, fmt.Errorf("not found: %s", relPath)
	}
	return data, nil
}

func (m *mockRepo) ListFiles() ([]git.FileEntry, error) {
	if m.listErr != nil {
		return nil, m.listErr
	}
	return m.files, nil
}

func (m *mockRepo) History(relPath string) ([]git.Commit, error) {
	if m.histErr != nil {
		return nil, m.histErr
	}
	return m.commits[relPath], nil
}

func (m *mockRepo) RestoreFile(_, _ string) error {
	return m.restErr
}

func newServer(t *testing.T, repo git.Repository) *httptest.Server {
	t.Helper()
	ts, err := trade.NewStore()
	if err != nil {
		t.Fatalf("trade.NewStore: %v", err)
	}
	return httptest.NewServer(api.NewMux(repo, ts, http.NotFoundHandler()))
}

// ── /api/files ───────────────────────────────────────────────────────────────

func TestListFiles_ok(t *testing.T) {
	m := newMock()
	m.files = []git.FileEntry{{Path: "gba/a.srm", Size: 42}}
	srv := newServer(t, m)
	defer srv.Close()

	resp, err := http.Get(srv.URL + "/api/files")
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status %d", resp.StatusCode)
	}
	var out []git.FileEntry
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		t.Fatal(err)
	}
	if len(out) != 1 || out[0].Path != "gba/a.srm" {
		t.Errorf("unexpected files: %v", out)
	}
}

func TestListFiles_methodNotAllowed(t *testing.T) {
	srv := newServer(t, newMock())
	defer srv.Close()

	resp, err := http.Post(srv.URL+"/api/files", "", nil)
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()

	if resp.StatusCode != http.StatusMethodNotAllowed {
		t.Errorf("status %d, want 405", resp.StatusCode)
	}
}

func TestListFiles_repoError(t *testing.T) {
	m := newMock()
	m.listErr = fmt.Errorf("disk error")
	srv := newServer(t, m)
	defer srv.Close()

	resp, err := http.Get(srv.URL + "/api/files")
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()

	if resp.StatusCode != http.StatusInternalServerError {
		t.Errorf("status %d, want 500", resp.StatusCode)
	}
}

// ── /api/push ────────────────────────────────────────────────────────────────

func TestPushSave_ok(t *testing.T) {
	m := newMock()
	srv := newServer(t, m)
	defer srv.Close()

	body := bytes.NewReader([]byte("save bytes"))
	resp, err := http.Post(srv.URL+"/api/push/gba/pokemon.srm?device=d1", "application/octet-stream", body)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status %d", resp.StatusCode)
	}
	if _, ok := m.stored["gba/pokemon.srm"]; !ok {
		t.Error("file not stored in mock")
	}
}

func TestPushSave_defaultDevice(t *testing.T) {
	m := newMock()
	srv := newServer(t, m)
	defer srv.Close()

	resp, err := http.Post(srv.URL+"/api/push/gba/a.srm", "", bytes.NewReader([]byte("x")))
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("status %d", resp.StatusCode)
	}
}

func TestPushSave_missingPath(t *testing.T) {
	srv := newServer(t, newMock())
	defer srv.Close()

	resp, err := http.Post(srv.URL+"/api/push/", "", nil)
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()

	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("status %d, want 400", resp.StatusCode)
	}
}

func TestPushSave_methodNotAllowed(t *testing.T) {
	srv := newServer(t, newMock())
	defer srv.Close()

	resp, err := http.Get(srv.URL + "/api/push/gba/a.srm")
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()

	if resp.StatusCode != http.StatusMethodNotAllowed {
		t.Errorf("status %d, want 405", resp.StatusCode)
	}
}

// ── /api/pull ────────────────────────────────────────────────────────────────

func TestPullSave_ok(t *testing.T) {
	m := newMock()
	m.stored["gba/a.srm"] = []byte("save data")
	srv := newServer(t, m)
	defer srv.Close()

	resp, err := http.Get(srv.URL + "/api/pull/gba/a.srm")
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status %d", resp.StatusCode)
	}
	got, _ := io.ReadAll(resp.Body)
	if string(got) != "save data" {
		t.Errorf("body %q, want %q", got, "save data")
	}
	if ct := resp.Header.Get("Content-Type"); ct != "application/octet-stream" {
		t.Errorf("Content-Type %q", ct)
	}
}

func TestPullSave_notFound(t *testing.T) {
	srv := newServer(t, newMock())
	defer srv.Close()

	resp, err := http.Get(srv.URL + "/api/pull/missing.srm")
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()

	if resp.StatusCode != http.StatusNotFound {
		t.Errorf("status %d, want 404", resp.StatusCode)
	}
}

func TestPullSave_missingPath(t *testing.T) {
	srv := newServer(t, newMock())
	defer srv.Close()

	resp, err := http.Get(srv.URL + "/api/pull/")
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()

	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("status %d, want 400", resp.StatusCode)
	}
}

// ── /api/history ─────────────────────────────────────────────────────────────

func TestHistory_ok(t *testing.T) {
	m := newMock()
	m.commits["gba/a.srm"] = []git.Commit{
		{Hash: "abc1234def", Message: "sync gba/a.srm from d1"},
	}
	srv := newServer(t, m)
	defer srv.Close()

	resp, err := http.Get(srv.URL + "/api/history/gba/a.srm")
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status %d", resp.StatusCode)
	}
	var commits []git.Commit
	if err := json.NewDecoder(resp.Body).Decode(&commits); err != nil {
		t.Fatal(err)
	}
	if len(commits) != 1 || commits[0].Hash != "abc1234def" {
		t.Errorf("unexpected commits: %v", commits)
	}
}

func TestHistory_missingPath(t *testing.T) {
	srv := newServer(t, newMock())
	defer srv.Close()

	resp, err := http.Get(srv.URL + "/api/history/")
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()

	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("status %d, want 400", resp.StatusCode)
	}
}

// ── /api/restore ─────────────────────────────────────────────────────────────

func TestRestore_ok(t *testing.T) {
	srv := newServer(t, newMock())
	defer srv.Close()

	resp, err := http.Post(srv.URL+"/api/restore/gba/a.srm?hash=abc1234", "", nil)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status %d", resp.StatusCode)
	}
	var body map[string]string
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatal(err)
	}
	if body["status"] != "restored" {
		t.Errorf("status field %q", body["status"])
	}
}

func TestRestore_missingHash(t *testing.T) {
	srv := newServer(t, newMock())
	defer srv.Close()

	resp, err := http.Post(srv.URL+"/api/restore/gba/a.srm", "", nil)
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()

	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("status %d, want 400", resp.StatusCode)
	}
}

func TestRestore_missingPath(t *testing.T) {
	srv := newServer(t, newMock())
	defer srv.Close()

	resp, err := http.Post(srv.URL+"/api/restore/?hash=abc1234", "", nil)
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()

	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("status %d, want 400", resp.StatusCode)
	}
}

func TestRestore_methodNotAllowed(t *testing.T) {
	srv := newServer(t, newMock())
	defer srv.Close()

	resp, err := http.Get(srv.URL + "/api/restore/gba/a.srm?hash=abc1234")
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()

	if resp.StatusCode != http.StatusMethodNotAllowed {
		t.Errorf("status %d, want 405", resp.StatusCode)
	}
}
