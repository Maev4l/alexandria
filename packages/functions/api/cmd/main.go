package main

import (
	"context"
	"os"

	"alexandria.isnan.eu/functions/api/handlers"
	"alexandria.isnan.eu/functions/api/repositories/cognito"
	"alexandria.isnan.eu/functions/api/repositories/dynamodb"
	storage "alexandria.isnan.eu/functions/api/repositories/s3"
	"alexandria.isnan.eu/functions/api/services"
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	ginadapter "github.com/awslabs/aws-lambda-go-api-proxy/gin"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

var ginLambda *ginadapter.GinLambda

func init() {

	gin.SetMode(gin.ReleaseMode)

	router := gin.New()
	router.Use(handlers.HttpLogger())
	router.Use(gin.Recovery())

	config := cors.DefaultConfig()
	config.AllowCredentials = true
	config.AllowAllOrigins = true
	router.Use(cors.New(config))

	region := os.Getenv("REGION")

	db := dynamodb.NewDynamoDB(region)
	storage := storage.NewObjectStorage(region)
	idp := cognito.NewIdp(region)
	s := services.NewServices(db, storage, idp)
	h := handlers.NewHTTPHandler(s)

	g := router.Group("/v1")
	g.Use(handlers.TokenParser())
	g.Use(handlers.IdentityLogger())

	g.POST("/detections", h.RequestDetection)
	g.POST("/libraries", h.CreateLibrary)
	g.GET("/libraries", h.ListLibraries)
	g.PUT("/libraries/:libraryId", h.UpdateLibrary)
	g.DELETE("/libraries/:libraryId", h.DeleteLibrary)
	g.GET("/libraries/:libraryId/items", h.ListLibraryItems)
	g.POST("/libraries/:libraryId/books", h.CreateBook)
	g.DELETE("/libraries/:libraryId/items/:itemId", h.DeleteItem)
	g.PUT("/libraries/:libraryId/books/:bookId", h.UpdateBook)
	g.POST("/libraries/:libraryId/share", h.ShareLibrary)
	g.POST("/libraries/:libraryId/unshare", h.UnshareLibrary)
	g.POST("/libraries/:libraryId/items/:itemId/events", h.CreateItemHistoryEvent)
	g.GET("/libraries/:libraryId/items/:itemId/events", h.GetItemHistoryEvents)
	g.DELETE("/libraries/:libraryId/items/:itemId/events", h.DeleteItemHistoryEvents)
	g.POST("/search", h.Search)

	/* g.GET("/hello", func(c *gin.Context) {
		c.JSON(http.StatusOK, map[string]string{
			"response": "world",
		})
	})
	*/
	ginLambda = ginadapter.New(router)
}

func handler(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// If no name is provided in the HTTP request body, throw an error
	return ginLambda.ProxyWithContext(ctx, req)
}
func main() {
	lambda.Start(handler)
}
