package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoad(t *testing.T) {
	dir := t.TempDir()
	p := filepath.Join(dir, "config.json")
	body := `{"userPoolId":"pool","region":"eu-central-1","tableName":"alexandria","bucketName":"bucket"}`
	if err := os.WriteFile(p, []byte(body), 0o644); err != nil {
		t.Fatal(err)
	}
	cfg, err := Load(p)
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if cfg.UserPoolID != "pool" || cfg.Region != "eu-central-1" ||
		cfg.TableName != "alexandria" || cfg.BucketName != "bucket" {
		t.Fatalf("unexpected config: %+v", cfg)
	}
}

func TestLoadMissingFile(t *testing.T) {
	if _, err := Load(filepath.Join(t.TempDir(), "nope.json")); err == nil {
		t.Fatal("expected error for missing file")
	}
}
