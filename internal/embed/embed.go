package embed

import (
	"embed"
	"io/fs"
	"net/http"
)

//go:embed dist/*
var uiFiles embed.FS

// Handler returns an http.Handler that serves the embedded React build.
// It falls back to index.html for any path not found, supporting React Router.
func Handler() http.Handler {
	sub, err := fs.Sub(uiFiles, "dist")
	if err != nil {
		panic("embed: dist folder not found: " + err.Error())
	}

	fileServer := http.FileServer(http.FS(sub))

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Try to serve the file; if not found, serve index.html (SPA fallback)
		f, err := sub.Open(r.URL.Path[1:]) // strip leading /
		if err != nil {
			// Fall back to index.html
			r2 := *r
			r2.URL.Path = "/"
			fileServer.ServeHTTP(w, &r2)
			return
		}
		f.Close()
		fileServer.ServeHTTP(w, r)
	})
}
