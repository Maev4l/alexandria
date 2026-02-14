// Edited by Claude.
package handlers

import (
	"fmt"
	"time"

	"alexandria.isnan.eu/functions/internal/identifier"
	"github.com/gin-gonic/gin"
	"github.com/lestrrat-go/jwx/jwt"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

type tokenInfo struct {
	userId      string
	userName    string
	displayName string
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
			id, exists := token.Get("sub")
			if exists {
				info.userId = identifier.Normalize(fmt.Sprintf("%v", id))
			}

			username, exists := token.Get("cognito:username")
			if exists {
				info.userName = fmt.Sprintf("%v", username)
			}

			displayName, exists := token.Get("custom:DisplayName")
			if exists {
				info.displayName = fmt.Sprintf("%v", displayName)
			}
		}

		c.Set("tokenInfo", &info)

		c.Next()
	}
}

func IdentityLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		t := c.MustGet("tokenInfo").(*tokenInfo)
		log.Logger = log.With().Str("user", identifier.Normalize(t.userId)).Logger()
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
