package services

import "alexandria.isnan.eu/functions/api/ports"

type services struct {
	db      ports.Database
	storage ports.Storage
	idp     ports.Idp
}

func NewServices(db ports.Database, s ports.Storage, i ports.Idp) *services {
	return &services{db: db, storage: s, idp: i}
}
