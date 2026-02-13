package identifier

import (
	"strings"

	"github.com/google/uuid"
)

func Normalize(val string) string {
	return strings.ToUpper(strings.ReplaceAll(val, "-", ""))
}

func NewId() string {
	id := uuid.NewString()
	return Normalize(id)
}
