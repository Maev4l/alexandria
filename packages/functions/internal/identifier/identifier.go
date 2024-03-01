package identifier

import (
	"strings"
)

func Normalize(val string) string {
	return strings.ToUpper(strings.Replace(val, "-", "", -1))
}
