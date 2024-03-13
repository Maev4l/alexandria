package services

import "alexandria.isnan.eu/functions/api/ports"

type services struct {
	db      ports.Database
	storage ports.Storage
}

func NewServices(db ports.Database, s ports.Storage) *services {
	return &services{db: db, storage: s}
}
