package processing

import (
	"alexandria.isnan.eu/functions/internal/domain"
	"alexandria.isnan.eu/functions/internal/persistence"
)

type Handler func(db *domain.IndexDatabase, r *persistence.EventRecord) bool
