package api

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/crbroughton/trove/internal/git"
	"github.com/crbroughton/trove/internal/trade"
)

// NewMux wires all HTTP routes and returns the root handler.
// ui is served for any path not matched by the API routes.
func NewMux(repo git.Repository, tradeStore *trade.Store, ui http.Handler) http.Handler {
	h := &handler{repo: repo}
	th := &tradeHandler{store: tradeStore}
	mux := http.NewServeMux()

	mux.HandleFunc("/api/files", h.listFiles)
	mux.HandleFunc("/api/push/", h.pushSave)
	mux.HandleFunc("/api/pull/", h.pullSave)
	mux.HandleFunc("/api/history/", h.history)
	mux.HandleFunc("/api/restore/", h.restore)

	mux.HandleFunc("/api/trade/events", th.events)
	mux.HandleFunc("/api/trade/announce", th.announce)
	mux.HandleFunc("/api/trade/devices", th.devices)
	mux.HandleFunc("/api/trade/transfers", th.listTransfers)
	mux.HandleFunc("/api/trade/transfer", th.queueTransfer)
	mux.HandleFunc("/api/trade/pending", th.pending)
	mux.HandleFunc("/api/trade/upload/", th.upload)
	mux.HandleFunc("/api/trade/fetch/", th.fetch)

	mux.Handle("/", ui)

	return withLogging(mux)
}

func jsonOK(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("json encode: %v", err)
	}
}

func jsonError(w http.ResponseWriter, err error, code int) {
	log.Printf("error: %v", err)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
}

func withLogging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("%s %s", r.Method, r.URL.Path)
		next.ServeHTTP(w, r)
	})
}
