package main

import (
	"flag"
	"log"
	"net/http"

	"github.com/crbroughton/trove/internal/api"
	"github.com/crbroughton/trove/internal/embed"
	"github.com/crbroughton/trove/internal/git"
)

func main() {
	repoPath := flag.String("repo", "/var/lib/trove/saves", "Path to git working tree for saves")
	addr := flag.String("addr", ":8080", "Address to listen on")
	flag.Parse()

	repo, err := git.Open(*repoPath)
	if err != nil {
		log.Fatalf("failed to open/init repo: %v", err)
	}

	mux := api.NewMux(repo, embed.Handler())

	log.Printf("trove listening on %s", *addr)
	if err := http.ListenAndServe(*addr, mux); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
