package assets

import (
	"bytes"
	"fmt"
	"image"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	// Register decoders so image.DecodeConfig can read dimensions cheaply
	// (header only — does not decode the full image).
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"

	"github.com/google/uuid"
)

type Store struct {
	dir string
}

func NewStore(dir string) (*Store, error) {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, fmt.Errorf("create upload dir: %w", err)
	}
	return &Store{dir: dir}, nil
}

var unsafeName = regexp.MustCompile(`[^a-zA-Z0-9._-]+`)

// Save writes the bytes under {tenantID}/{uuid}-{safeName} and returns the
// storage key (relative path, also the URL path after the file mount).
func (s *Store) Save(tenantID uuid.UUID, filename string, data []byte) (string, error) {
	safe := unsafeName.ReplaceAllString(filepath.Base(filename), "-")
	if safe == "" || safe == "-" {
		safe = "upload"
	}
	key := fmt.Sprintf("%s/%s-%s", tenantID.String(), uuid.NewString(), safe)
	full := filepath.Join(s.dir, filepath.FromSlash(key))
	if err := os.MkdirAll(filepath.Dir(full), 0o755); err != nil {
		return "", fmt.Errorf("mkdir: %w", err)
	}
	if err := os.WriteFile(full, data, 0o644); err != nil {
		return "", fmt.Errorf("write file: %w", err)
	}
	return key, nil
}

// Delete removes the stored file for a key. Missing files are not an error
// (the DB row is the source of truth; a vanished file shouldn't block cleanup).
// The key is confined to the store dir to prevent path escape.
func (s *Store) Delete(key string) error {
	full := filepath.Join(s.dir, filepath.FromSlash(key))
	rel, err := filepath.Rel(s.dir, full)
	if err != nil || strings.HasPrefix(rel, "..") {
		return fmt.Errorf("invalid storage key")
	}
	if err := os.Remove(full); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("remove file: %w", err)
	}
	return nil
}

// Dimensions reads width/height from image header bytes. Returns 0,0 if the
// format is unknown (e.g. SVG) so callers can fall back gracefully.
func Dimensions(data []byte) (width, height int) {
	cfg, _, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil {
		return 0, 0
	}
	return cfg.Width, cfg.Height
}

// IsImageContentType is a light allowlist for the demo uploader.
func IsImageContentType(ct string) bool {
	ct = strings.ToLower(strings.TrimSpace(ct))
	switch {
	case strings.HasPrefix(ct, "image/png"),
		strings.HasPrefix(ct, "image/jpeg"),
		strings.HasPrefix(ct, "image/jpg"),
		strings.HasPrefix(ct, "image/gif"),
		strings.HasPrefix(ct, "image/webp"),
		strings.HasPrefix(ct, "image/svg+xml"),
		strings.HasPrefix(ct, "image/avif"):
		return true
	}
	return false
}
