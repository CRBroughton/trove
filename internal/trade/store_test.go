package trade

import (
	"testing"
	"time"
)

func newTestStore(t *testing.T) *Store {
	t.Helper()
	s, err := NewStore()
	if err != nil {
		t.Fatalf("NewStore: %v", err)
	}
	return s
}

func TestAnnounce_ListDevices(t *testing.T) {
	s := newTestStore(t)
	s.Announce("brick", []ROMEntry{{Name: "pokemon.gba", Path: "gba/pokemon.gba", Size: 1024}})
	s.Announce("anbernic", nil)

	devices := s.ListDevices()
	if len(devices) != 2 {
		t.Fatalf("want 2 devices, got %d", len(devices))
	}
	// sorted alphabetically
	if devices[0].Name != "anbernic" || devices[1].Name != "brick" {
		t.Errorf("unexpected order: %v, %v", devices[0].Name, devices[1].Name)
	}
	if len(devices[1].ROMs) != 1 || devices[1].ROMs[0].Name != "pokemon.gba" {
		t.Errorf("unexpected ROMs: %v", devices[1].ROMs)
	}
}

func TestListDevices_evictsExpired(t *testing.T) {
	s := newTestStore(t)
	s.Announce("old", nil)

	// backdate LastSeen past TTL
	s.mu.Lock()
	s.devices["old"].LastSeen = time.Now().Add(-(deviceTTL + time.Second))
	s.mu.Unlock()

	if got := s.ListDevices(); len(got) != 0 {
		t.Errorf("want 0 devices after TTL, got %d", len(got))
	}
}

func TestListDevices_keepsRecent(t *testing.T) {
	s := newTestStore(t)
	s.Announce("fresh", nil)

	if got := s.ListDevices(); len(got) != 1 {
		t.Errorf("want 1 device, got %d", len(got))
	}
}

func TestQueueTransfer(t *testing.T) {
	s := newTestStore(t)
	tr, err := s.QueueTransfer("anbernic", "brick", "gba/pokemon.gba")
	if err != nil {
		t.Fatal(err)
	}
	if tr.State != StatePendingUpload {
		t.Errorf("want state %s, got %s", StatePendingUpload, tr.State)
	}
	if tr.FromDevice != "anbernic" || tr.ToDevice != "brick" {
		t.Errorf("unexpected devices: %s -> %s", tr.FromDevice, tr.ToDevice)
	}
	if tr.ROMPath != "gba/pokemon.gba" {
		t.Errorf("unexpected path: %s", tr.ROMPath)
	}
}

func TestListTransfers_sortedByCreation(t *testing.T) {
	s := newTestStore(t)
	_, _ = s.QueueTransfer("a", "b", "rom1.gba")
	_, _ = s.QueueTransfer("a", "b", "rom2.gba")

	transfers := s.ListTransfers()
	if len(transfers) != 2 {
		t.Fatalf("want 2 transfers, got %d", len(transfers))
	}
	if !transfers[0].CreatedAt.Before(transfers[1].CreatedAt) && transfers[0].CreatedAt != transfers[1].CreatedAt {
		t.Error("transfers not sorted by CreatedAt")
	}
}

func TestPending_upload(t *testing.T) {
	s := newTestStore(t)
	tr, _ := s.QueueTransfer("anbernic", "brick", "gba/a.gba")

	work := s.Pending("anbernic")
	if len(work.Uploads) != 1 {
		t.Fatalf("want 1 upload, got %d", len(work.Uploads))
	}
	if work.Uploads[0].ID != tr.ID {
		t.Errorf("unexpected transfer ID")
	}
	if work.Uploads[0].Peer != "brick" {
		t.Errorf("unexpected peer: %s", work.Uploads[0].Peer)
	}
	if len(work.Downloads) != 0 {
		t.Errorf("expected no downloads for sender")
	}
}

func TestPending_download(t *testing.T) {
	s := newTestStore(t)
	tr, _ := s.QueueTransfer("anbernic", "brick", "gba/a.gba")
	_ = s.SaveROM(tr.ID, []byte("rom data"))

	work := s.Pending("brick")
	if len(work.Downloads) != 1 {
		t.Fatalf("want 1 download, got %d", len(work.Downloads))
	}
	if work.Downloads[0].ID != tr.ID {
		t.Errorf("unexpected transfer ID")
	}
	if len(work.Uploads) != 0 {
		t.Errorf("expected no uploads for receiver")
	}
}

func TestPending_empty(t *testing.T) {
	s := newTestStore(t)
	work := s.Pending("nobody")
	if len(work.Uploads) != 0 || len(work.Downloads) != 0 {
		t.Error("expected empty pending work")
	}
}

func TestSaveROM_transitionsToReady(t *testing.T) {
	s := newTestStore(t)
	tr, _ := s.QueueTransfer("anbernic", "brick", "gba/a.gba")

	data := []byte("rom bytes")
	if err := s.SaveROM(tr.ID, data); err != nil {
		t.Fatalf("SaveROM: %v", err)
	}

	transfers := s.ListTransfers()
	if len(transfers) != 1 || transfers[0].State != StateReady {
		t.Errorf("want state %s, got %s", StateReady, transfers[0].State)
	}
}

func TestSaveROM_wrongState(t *testing.T) {
	s := newTestStore(t)
	tr, _ := s.QueueTransfer("anbernic", "brick", "gba/a.gba")
	_ = s.SaveROM(tr.ID, []byte("data"))

	// second upload on a ready transfer should fail
	if err := s.SaveROM(tr.ID, []byte("data2")); err == nil {
		t.Error("expected error for upload on non-pending transfer")
	}
}

func TestSaveROM_unknownID(t *testing.T) {
	s := newTestStore(t)
	if err := s.SaveROM("nonexistent", []byte("x")); err == nil {
		t.Error("expected error for unknown transfer ID")
	}
}

func TestFetchROM_roundtrip(t *testing.T) {
	s := newTestStore(t)
	tr, _ := s.QueueTransfer("anbernic", "brick", "gba/pokemon.gba")
	original := []byte("rom content")
	_ = s.SaveROM(tr.ID, original)

	data, romPath, err := s.FetchROM(tr.ID, "brick")
	if err != nil {
		t.Fatalf("FetchROM: %v", err)
	}
	if string(data) != string(original) {
		t.Errorf("data mismatch: got %q, want %q", data, original)
	}
	if romPath != "gba/pokemon.gba" {
		t.Errorf("unexpected rom path: %s", romPath)
	}

	// transfer should be in done state
	transfers := s.ListTransfers()
	if len(transfers) != 1 || transfers[0].State != StateDone {
		t.Errorf("want state %s, got %s", StateDone, transfers[0].State)
	}
}

func TestFetchROM_wrongDevice(t *testing.T) {
	s := newTestStore(t)
	tr, _ := s.QueueTransfer("anbernic", "brick", "gba/a.gba")
	_ = s.SaveROM(tr.ID, []byte("data"))

	if _, _, err := s.FetchROM(tr.ID, "anbernic"); err == nil {
		t.Error("expected error when wrong device fetches ROM")
	}
}

func TestFetchROM_notReady(t *testing.T) {
	s := newTestStore(t)
	tr, _ := s.QueueTransfer("anbernic", "brick", "gba/a.gba")

	if _, _, err := s.FetchROM(tr.ID, "brick"); err == nil {
		t.Error("expected error when fetching non-ready transfer")
	}
}

func TestFetchROM_unknownID(t *testing.T) {
	s := newTestStore(t)
	if _, _, err := s.FetchROM("nonexistent", "brick"); err == nil {
		t.Error("expected error for unknown transfer ID")
	}
}

func TestSubscribe_receivesNotification(t *testing.T) {
	s := newTestStore(t)
	ch := s.Subscribe()
	defer s.Unsubscribe(ch)

	s.Announce("device", nil)

	select {
	case <-ch:
	case <-time.After(time.Second):
		t.Error("no notification received after Announce")
	}
}

func TestSubscribe_notifiedOnQueue(t *testing.T) {
	s := newTestStore(t)
	ch := s.Subscribe()
	defer s.Unsubscribe(ch)

	_, _ = s.QueueTransfer("a", "b", "rom.gba")

	select {
	case <-ch:
	case <-time.After(time.Second):
		t.Error("no notification received after QueueTransfer")
	}
}

func TestUnsubscribe_noNotification(t *testing.T) {
	s := newTestStore(t)
	ch := s.Subscribe()
	s.Unsubscribe(ch)

	s.Announce("device", nil)

	select {
	case <-ch:
		t.Error("received notification after unsubscribe")
	case <-time.After(50 * time.Millisecond):
	}
}
