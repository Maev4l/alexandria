package ports

import (
	"alexandria.isnan.eu/functions/api/domain"
)

type Database interface {
	SaveLibrary(l *domain.Library) error
}
