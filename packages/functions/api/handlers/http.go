package handlers

import (
	"alexandria.isnan.eu/functions/api/ports"
	"github.com/gin-gonic/gin"
)

type HTTPHandler struct {
	s ports.Services
}

func (h *HTTPHandler) getTokenInfo(c *gin.Context) *tokenInfo {
	t := c.MustGet("tokenInfo").(*tokenInfo)
	return t
}

func NewHTTPHandler(s ports.Services) *HTTPHandler {
	return &HTTPHandler{s: s}
}
