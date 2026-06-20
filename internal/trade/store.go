package trade

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"sync"
	"time"
)

const deviceTTL = 5 * time.Minute

// ROMEntry is a single ROM file on a device.
type ROMEntry struct {
	Name string `json:"name"`
	Path string `json:"path"`
	Size int64  `json:"size"`
}

// Device is a connected device with its current ROM inventory.
type Device struct {
	Name     string     `json:"name"`
	ROMs     []ROMEntry `json:"roms"`
	LastSeen time.Time  `json:"last_seen"`
}

// TransferState tracks a queued ROM transfer between devices.
type TransferState string

const (
	StatePendingUpload TransferState = "pending_upload"
	StateReady         TransferState = "ready"
	StateDone          TransferState = "done"
)

// Transfer is a queued ROM trade between two devices.
type Transfer struct {
	ID         string        `json:"id"`
	FromDevice string        `json:"from_device"`
	ToDevice   string        `json:"to_device"`
	ROMPath    string        `json:"rom_path"`
	State      TransferState `json:"state"`
	CreatedAt  time.Time     `json:"created_at"`
	tempPath   string
}

// PendingWork describes what a device needs to do next for a transfer.
type PendingWork struct {
	Uploads   []TransferRef `json:"uploads"`
	Downloads []TransferRef `json:"downloads"`
}

// TransferRef is a lightweight reference used in pending-work responses.
type TransferRef struct {
	ID      string `json:"id"`
	ROMPath string `json:"rom_path"`
	Peer    string `json:"peer"`
}

// Store holds in-memory device registry and transfer queue.
type Store struct {
	mu          sync.Mutex
	devices     map[string]*Device
	transfers   map[string]*Transfer
	tempDir     string
	subscribers map[chan struct{}]struct{}
}

func NewStore() (*Store, error) {
	dir, err := os.MkdirTemp("", "trove-trade-*")
	if err != nil {
		return nil, fmt.Errorf("trade temp dir: %w", err)
	}
	return &Store{
		devices:     make(map[string]*Device),
		transfers:   make(map[string]*Transfer),
		tempDir:     dir,
		subscribers: make(map[chan struct{}]struct{}),
	}, nil
}

func (s *Store) Subscribe() chan struct{} {
	ch := make(chan struct{}, 1)
	s.mu.Lock()
	s.subscribers[ch] = struct{}{}
	s.mu.Unlock()
	return ch
}

func (s *Store) Unsubscribe(ch chan struct{}) {
	s.mu.Lock()
	delete(s.subscribers, ch)
	s.mu.Unlock()
}

func (s *Store) notify() {
	for ch := range s.subscribers {
		select {
		case ch <- struct{}{}:
		default:
		}
	}
}

func (s *Store) Announce(name string, roms []ROMEntry) {
	s.mu.Lock()
	s.devices[name] = &Device{Name: name, ROMs: roms, LastSeen: time.Now()}
	s.notify()
	s.mu.Unlock()
}

func (s *Store) ListDevices() []Device {
	s.mu.Lock()
	defer s.mu.Unlock()
	cutoff := time.Now().Add(-deviceTTL)
	out := make([]Device, 0, len(s.devices))
	for name, d := range s.devices {
		if d.LastSeen.Before(cutoff) {
			delete(s.devices, name)
			continue
		}
		out = append(out, *d)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Name < out[j].Name })
	return out
}

func (s *Store) QueueTransfer(fromDevice, toDevice, romPath string) (*Transfer, error) {
	id, err := randomID()
	if err != nil {
		return nil, err
	}
	t := &Transfer{
		ID:         id,
		FromDevice: fromDevice,
		ToDevice:   toDevice,
		ROMPath:    romPath,
		State:      StatePendingUpload,
		CreatedAt:  time.Now(),
	}
	s.mu.Lock()
	s.transfers[id] = t
	s.notify()
	s.mu.Unlock()
	return t, nil
}

func (s *Store) ListTransfers() []Transfer {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]Transfer, 0, len(s.transfers))
	for _, t := range s.transfers {
		out = append(out, *t)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.Before(out[j].CreatedAt) })
	return out
}

func (s *Store) Pending(device string) PendingWork {
	s.mu.Lock()
	defer s.mu.Unlock()
	w := PendingWork{
		Uploads:   []TransferRef{},
		Downloads: []TransferRef{},
	}
	for _, t := range s.transfers {
		switch {
		case t.FromDevice == device && t.State == StatePendingUpload:
			w.Uploads = append(w.Uploads, TransferRef{ID: t.ID, ROMPath: t.ROMPath, Peer: t.ToDevice})
		case t.ToDevice == device && t.State == StateReady:
			w.Downloads = append(w.Downloads, TransferRef{ID: t.ID, ROMPath: t.ROMPath, Peer: t.FromDevice})
		}
	}
	return w
}

// SaveROM writes uploaded ROM data to a temp file and marks the transfer ready.
func (s *Store) SaveROM(transferID string, data []byte) error {
	s.mu.Lock()
	t, ok := s.transfers[transferID]
	if !ok {
		s.mu.Unlock()
		return fmt.Errorf("transfer %s not found", transferID)
	}
	if t.State != StatePendingUpload {
		s.mu.Unlock()
		return fmt.Errorf("transfer %s not awaiting upload (state: %s)", transferID, t.State)
	}
	tmpPath := filepath.Join(s.tempDir, transferID)
	s.mu.Unlock()

	if err := os.WriteFile(tmpPath, data, 0o600); err != nil {
		return fmt.Errorf("write temp ROM: %w", err)
	}

	s.mu.Lock()
	t.tempPath = tmpPath
	t.State = StateReady
	s.notify()
	s.mu.Unlock()
	return nil
}

// FetchROM returns the ROM bytes for a ready transfer and marks it done.
func (s *Store) FetchROM(transferID, device string) ([]byte, string, error) {
	s.mu.Lock()
	t, ok := s.transfers[transferID]
	if !ok {
		s.mu.Unlock()
		return nil, "", fmt.Errorf("transfer %s not found", transferID)
	}
	if t.ToDevice != device {
		s.mu.Unlock()
		return nil, "", fmt.Errorf("transfer %s is not for device %s", transferID, device)
	}
	if t.State != StateReady {
		s.mu.Unlock()
		return nil, "", fmt.Errorf("transfer %s not ready (state: %s)", transferID, t.State)
	}
	tmpPath := t.tempPath
	romPath := t.ROMPath
	t.State = StateDone
	s.notify()
	s.mu.Unlock()

	// Remove completed transfer after a short window so UI can show COMPLETE!
	go func() {
		time.Sleep(5 * time.Second)
		s.mu.Lock()
		delete(s.transfers, transferID)
		s.notify()
		s.mu.Unlock()
	}()

	data, err := os.ReadFile(tmpPath)
	if err != nil {
		return nil, "", fmt.Errorf("read temp ROM: %w", err)
	}
	_ = os.Remove(tmpPath)
	return data, romPath, nil
}

func randomID() (string, error) {
	b := make([]byte, 8)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
