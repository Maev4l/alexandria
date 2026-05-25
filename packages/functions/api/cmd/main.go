package main

import (
	"os"

	"alexandria.isnan.eu/functions/api/handlers"
	"alexandria.isnan.eu/functions/api/repositories/bedrock"
	"alexandria.isnan.eu/functions/api/repositories/cognito"
	"alexandria.isnan.eu/functions/api/repositories/dynamodb"
	storage "alexandria.isnan.eu/functions/api/repositories/s3"
	"alexandria.isnan.eu/functions/api/services"
	"github.com/gin-gonic/gin"
)

func main() {
	gin.SetMode(gin.ReleaseMode)

	router := gin.New()
	router.Use(handlers.HttpLogger())
	router.Use(gin.Recovery())

	region := os.Getenv("REGION")

	db := dynamodb.NewDynamoDB(region)
	storage := storage.NewObjectStorage(region)
	idp := cognito.NewIdp(region)

	// OCR via Bedrock Claude - model configurable via environment variable
	ocrModel := os.Getenv("OCR_MODEL")
	ocr := bedrock.NewOCR(region, ocrModel)

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

	// LWA forwards requests to the port set by env (default 8080).
	// Locally (no LWA) the same default lets `go run ./api/cmd` work out of the box.
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	_ = router.Run(":" + port)
}
