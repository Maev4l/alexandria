package main

import (
	"context"
	"os"

	"alexandria.isnan.eu/functions/api/handlers"
	"alexandria.isnan.eu/functions/api/repositories/dynamodb"
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
	s := services.NewServices(db)
	h := handlers.NewHTTPHandler(s)

	g := router.Group("/v1")
	g.Use(handlers.TokenParser())
	g.Use(handlers.IdentityLogger())

	g.POST("/detections", h.RequestDetection)
	g.POST("/libraries", h.CreateLibrary)
	g.GET("/libraries", h.ListLibraries)

	ginLambda = ginadapter.New(router)
}

func handler(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// If no name is provided in the HTTP request body, throw an error
	return ginLambda.ProxyWithContext(ctx, req)
}
func main() {
	lambda.Start(handler)
}
