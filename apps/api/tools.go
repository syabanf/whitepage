//go:build tools

// This file tracks tool-time dependencies that aren't imported by the build.
// `go mod tidy` keeps them in go.sum so `go run -mod=mod <tool>` works reproducibly.
package tools

import (
	_ "github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen"
	_ "github.com/riverqueue/river/cmd/river"
)
