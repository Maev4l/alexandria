package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type HTTPHandler struct {
}

func NewHTTPHandler() *HTTPHandler {
	return &HTTPHandler{}
}

func (h *HTTPHandler) Ping(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"message": "Pong !",
	})
}
