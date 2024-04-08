package ports

type Idp interface {
	GetUserIdFromUserName(userName string) (string, error)
}
