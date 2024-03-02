package detection

type BookResolver interface {
	Resolve(code string, ch chan []ResolvedBook)
	Name() string
}

var bookResolversRegistry []BookResolver

func ResolveBook(code string) []ResolvedBook {
	var result []ResolvedBook

	ch := make(chan []ResolvedBook, len(bookResolversRegistry))

	for _, r := range bookResolversRegistry {
		go r.Resolve(code, ch)
	}

	for i := 0; i < len(bookResolversRegistry); i++ {
		resolvedBooks := <-ch
		if resolvedBooks != nil {
			result = append(result, resolvedBooks...)
		}
	}

	return result
}

func init() {

	bookResolversRegistry = []BookResolver{
		newBabelioResolver(),
		newGoogleResolver(),
	}

}
