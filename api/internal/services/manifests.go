package services

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

// TemplateManifest mirrors the structure of templates/{slug}/manifest.json.
// It is the compile-time contract between a template and the platform:
// - consumes declares what AppConfigEnvelope keys the template reads
// - deploy tells the deployer where and how to deploy it
type TemplateManifest struct {
	Slug                string          `json:"slug"`
	Version             string          `json:"version"`
	DisplayName         string          `json:"display_name"`
	Platform            string          `json:"platform"`
	ConfigSchemaVersion string          `json:"config_schema_version"`
	Consumes            ManifestConsumes `json:"consumes"`
	Deploy              ManifestDeploy   `json:"deploy"`
}

type ManifestConsumes struct {
	MetaKeys       []string `json:"meta_keys"`
	UserInputKeys  []string `json:"user_input_keys"`
	MediaKeys      []string `json:"media_keys"`
	AIContentShape string   `json:"ai_content_shape"`
}

type ManifestDeploy struct {
	Target          string   `json:"target"`            // "vercel"
	VercelProjectID string   `json:"vercel_project_id"` // empty = not yet wired
	EnvVars         []string `json:"env_vars"`
}

// ManifestRegistry holds all loaded manifests keyed by template slug.
type ManifestRegistry struct {
	manifests map[string]*TemplateManifest
}

// LoadManifests reads all manifest.json files under templatesDir and caches them.
// templatesDir is typically the root-level templates/ directory (e.g. "../templates").
func LoadManifests(templatesDir string) (*ManifestRegistry, error) {
	pattern := filepath.Join(templatesDir, "*", "manifest.json")
	paths, err := filepath.Glob(pattern)
	if err != nil {
		return nil, fmt.Errorf("glob manifests: %w", err)
	}

	reg := &ManifestRegistry{manifests: make(map[string]*TemplateManifest, len(paths))}
	for _, p := range paths {
		data, err := os.ReadFile(p)
		if err != nil {
			return nil, fmt.Errorf("read %s: %w", p, err)
		}
		var m TemplateManifest
		if err := json.Unmarshal(data, &m); err != nil {
			return nil, fmt.Errorf("parse %s: %w", p, err)
		}
		reg.manifests[m.Slug] = &m
	}

	return reg, nil
}

// Get returns the manifest for a given slug, or nil if not found.
func (r *ManifestRegistry) Get(slug string) *TemplateManifest {
	return r.manifests[slug]
}

// AllSlugs returns all registered template slugs.
func (r *ManifestRegistry) AllSlugs() []string {
	slugs := make([]string, 0, len(r.manifests))
	for s := range r.manifests {
		slugs = append(slugs, s)
	}
	return slugs
}
