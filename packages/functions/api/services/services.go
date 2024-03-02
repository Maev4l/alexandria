package services

import "alexandria.isnan.eu/functions/api/ports"

type services struct {
	db ports.Database
}

func NewServices(db ports.Database) *services {
	return &services{db: db}
}
