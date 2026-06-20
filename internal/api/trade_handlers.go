package api

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"path/filepath"

	"github.com/crbroughton/trove/internal/trade"
)

// GET /api/trade/events — SSE stream, sends "data: refresh\n\n" on any state change.
func (h *tradeHandler) events(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming not supported", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	ch := h.store.Subscribe()
	defer h.store.Unsubscribe(ch)

	for {
		select {
		case <-r.Context().Done():
			return
		case <-ch:
			fmt.Fprintf(w, "data: refresh\n\n")
			flusher.Flush()
		}
	}
}

type tradeHandler struct {
	store *trade.Store
}

// POST /api/trade/announce
// Body: {"device":"anbernic","roms":[{"name":"pokemon.gba","path":"gba/pokemon.gba","size":1234}]}
func (h *tradeHandler) announce(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req struct {
		Device string           `json:"device"`
		ROMs   []trade.ROMEntry `json:"roms"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	if req.Device == "" {
		http.Error(w, "device required", http.StatusBadRequest)
		return
	}
	h.store.Announce(req.Device, req.ROMs)
	jsonOK(w, map[string]string{"status": "ok"})
}

// GET /api/trade/devices
func (h *tradeHandler) devices(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	jsonOK(w, h.store.ListDevices())
}

// POST /api/trade/transfer
// Body: {"from_device":"anbernic","to_device":"brick","rom_path":"gba/pokemon.gba"}
func (h *tradeHandler) queueTransfer(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req struct {
		FromDevice string `json:"from_device"`
		ToDevice   string `json:"to_device"`
		ROMPath    string `json:"rom_path"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	if req.FromDevice == "" || req.ToDevice == "" || req.ROMPath == "" {
		http.Error(w, "from_device, to_device and rom_path required", http.StatusBadRequest)
		return
	}
	t, err := h.store.QueueTransfer(req.FromDevice, req.ToDevice, req.ROMPath)
	if err != nil {
		jsonError(w, err, http.StatusInternalServerError)
		return
	}
	jsonOK(w, t)
}

// GET /api/trade/transfers
func (h *tradeHandler) listTransfers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	jsonOK(w, h.store.ListTransfers())
}

// GET /api/trade/pending?device=X
func (h *tradeHandler) pending(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	device := r.URL.Query().Get("device")
	if device == "" {
		http.Error(w, "device required", http.StatusBadRequest)
		return
	}
	jsonOK(w, h.store.Pending(device))
}

// POST /api/trade/upload/<path>?transfer=<id>
func (h *tradeHandler) upload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	transferID := r.URL.Query().Get("transfer")
	if transferID == "" {
		http.Error(w, "transfer id required", http.StatusBadRequest)
		return
	}
	data, err := io.ReadAll(io.LimitReader(r.Body, 512<<20)) // 512 MiB cap for ROMs
	if err != nil {
		jsonError(w, err, http.StatusInternalServerError)
		return
	}
	if err := h.store.SaveROM(transferID, data); err != nil {
		jsonError(w, fmt.Errorf("save ROM: %w", err), http.StatusBadRequest)
		return
	}
	jsonOK(w, map[string]string{"status": "ok"})
}

// GET /api/trade/fetch/<path>?transfer=<id>&device=<name>
func (h *tradeHandler) fetch(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	transferID := r.URL.Query().Get("transfer")
	device := r.URL.Query().Get("device")
	if transferID == "" || device == "" {
		http.Error(w, "transfer and device required", http.StatusBadRequest)
		return
	}
	data, romPath, err := h.store.FetchROM(transferID, device)
	if err != nil {
		jsonError(w, err, http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filepath.Base(romPath)))
	_, _ = w.Write(data)
}
