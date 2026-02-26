// Edited by Claude.
package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/lestrrat-go/jwx/jwt"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

type tokenInfo struct {
	userId      string
	userName    string // This is the credentials for native Cognito users
	displayName string
	approved    bool
}

func TokenParser() gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString := c.Request.Header.Get("Authorization")
		var info tokenInfo

		// Strip "Bearer " prefix if present
		if len(tokenString) > 7 && tokenString[:7] == "Bearer " {
			tokenString = tokenString[7:]
		}

		token, err := jwt.Parse([]byte(tokenString))

		// Only extract claims if token parsed successfully
		if err == nil && token != nil {
			// User ID from custom:Id attribute (UUID without dashes, uppercase)
			id, exists := token.Get("custom:Id")
			if exists {
				info.userId = fmt.Sprintf("%v", id)
			}

			// Username from email attribute
			email, exists := token.Get("email")
			if exists {
				info.userName = fmt.Sprintf("%v", email)
			}

			// Display name from standard "name" attribute
			name, exists := token.Get("name")
			if exists {
				info.displayName = fmt.Sprintf("%v", name)
			}

			// Approval status from custom:Approved attribute
			approved, exists := token.Get("custom:Approved")
			if exists && fmt.Sprintf("%v", approved) == "true" {
				info.approved = true
			}
		}

		c.Set("tokenInfo", &info)

		c.Next()
	}
}

// ApprovalChecker middleware ensures user is approved before accessing API
func ApprovalChecker() gin.HandlerFunc {
	return func(c *gin.Context) {
		t := c.MustGet("tokenInfo").(*tokenInfo)
		if !t.approved {
			c.JSON(http.StatusForbidden, gin.H{
				"message": "Pending approval",
			})
			c.Abort()
			return
		}
		c.Next()
	}
}

func IdentityLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		t := c.MustGet("tokenInfo").(*tokenInfo)
		// userId from custom:Id is already normalized (UUID without dashes, uppercase)
		log.Logger = log.With().Str("user", fmt.Sprintf("%s (id: %s)", t.userName, t.userId)).Logger()
		c.Next()
	}
}

func HttpLogger() gin.HandlerFunc {
	return func(c *gin.Context) {

		start := time.Now() // Start timer
		path := c.Request.URL.Path
		raw := c.Request.URL.RawQuery
		c.Next()

		param := gin.LogFormatterParams{}

		param.TimeStamp = time.Now() // Stop timer
		param.Latency = param.TimeStamp.Sub(start)
		if param.Latency > time.Minute {
			param.Latency = param.Latency.Truncate(time.Second)
		}
		param.Method = c.Request.Method
		param.StatusCode = c.Writer.Status()
		param.ErrorMessage = c.Errors.ByType(gin.ErrorTypePrivate).String()
		param.BodySize = c.Writer.Size()
		if raw != "" {
			path = path + "?" + raw
		}
		param.Path = path

		logger := &log.Logger
		var logEvent *zerolog.Event
		if c.Writer.Status() >= 500 {
			logEvent = logger.Error()
		} else {
			logEvent = logger.Info()
		}

		logEvent.
			Str("method", param.Method).
			Int("status_code", param.StatusCode).
			Int("body_size", param.BodySize).
			Str("path", param.Path).
			Str("latency", param.Latency.String()).
			Msg(param.ErrorMessage)
	}
}
