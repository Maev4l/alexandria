package slices

func Filter[T any](ss []T, test func(T) bool) []T {
	ret := []T{}
	for _, s := range ss {
		if test(s) {
			ret = append(ret, s)
		}
	}
	return ret
}
