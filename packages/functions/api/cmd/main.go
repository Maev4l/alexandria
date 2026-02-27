package main

import (
	"context"
	"os"

	"alexandria.isnan.eu/functions/api/handlers"
	"alexandria.isnan.eu/functions/api/repositories/cognito"
	"alexandria.isnan.eu/functions/api/repositories/dynamodb"
	"alexandria.isnan.eu/functions/api/repositories/rekognition"
	storage "alexandria.isnan.eu/functions/api/repositories/s3"
	"alexandria.isnan.eu/functions/api/services"
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	ginadapter "github.com/awslabs/aws-lambda-go-api-proxy/gin"
	"github.com/gin-gonic/gin"
)

var ginLambda *ginadapter.GinLambdaV2

func init() {

	gin.SetMode(gin.ReleaseMode)

	router := gin.New()
	router.Use(handlers.HttpLogger())
	router.Use(gin.Recovery())

	region := os.Getenv("REGION")

	db := dynamodb.NewDynamoDB(region)
	storage := storage.NewObjectStorage(region)
	idp := cognito.NewIdp(region)
	ocr := rekognition.NewOCR(region)
	s := services.NewServices(db, storage, idp, ocr)
	h := handlers.NewHTTPHandler(s)

	g := router.Group("/api/v1")
	g.Use(handlers.TokenParser())
	g.Use(handlers.IdentityLogger())
	g.Use(handlers.ApprovalChecker())

	g.POST("/detections", h.RequestDetection)
	g.POST("/libraries", h.CreateLibrary)
	g.GET("/libraries", h.ListLibraries)
	g.PUT("/libraries/:libraryId", h.UpdateLibrary)
	g.DELETE("/libraries/:libraryId", h.DeleteLibrary)
	g.GET("/libraries/:libraryId/items", h.ListLibraryItems)
	g.POST("/libraries/:libraryId/books", h.CreateBook)
	g.PUT("/libraries/:libraryId/books/:bookId", h.UpdateBook)
	g.POST("/libraries/:libraryId/videos", h.CreateVideo)
	g.PUT("/libraries/:libraryId/videos/:videoId", h.UpdateVideo)
	g.DELETE("/libraries/:libraryId/items/:itemId", h.DeleteItem)
	g.POST("/libraries/:libraryId/share", h.ShareLibrary)
	g.POST("/libraries/:libraryId/unshare", h.UnshareLibrary)
	g.POST("/libraries/:libraryId/items/:itemId/events", h.CreateItemHistoryEvent)
	g.GET("/libraries/:libraryId/items/:itemId/events", h.GetItemHistoryEvents)
	g.DELETE("/libraries/:libraryId/items/:itemId/events", h.DeleteItemHistoryEvents)
	// Collection routes
	g.GET("/libraries/:libraryId/collections", h.ListCollections)
	g.POST("/libraries/:libraryId/collections", h.CreateCollection)
	g.GET("/libraries/:libraryId/collections/:collectionId", h.GetCollection)
	g.PUT("/libraries/:libraryId/collections/:collectionId", h.UpdateCollection)
	g.DELETE("/libraries/:libraryId/collections/:collectionId", h.DeleteCollection)
	g.POST("/search", h.Search)

	/* g.GET("/hello", func(c *gin.Context) {
		c.JSON(http.StatusOK, map[string]string{
			"response": "world",
		})
	})
	*/
	ginLambda = ginadapter.NewV2(router)
}

func handler(ctx context.Context, req events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error) {
	return ginLambda.ProxyWithContext(ctx, req)
}
func main() {
	lambda.Start(handler)
}
