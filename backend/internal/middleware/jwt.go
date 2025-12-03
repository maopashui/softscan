package middleware

import (
	"database/sql"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"gin_ocrimg/backend/internal/service"
)

func AuthMiddleware(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		auth := c.GetHeader("Authorization")
		if auth == "" || !strings.HasPrefix(auth, "Bearer ") {
			c.JSON(http.StatusUnauthorized, gin.H{
				"errcode": 4,
				"msg":     "缺少 Authorization Bearer token",
			})
			c.Abort()
			return
		}
		token := strings.TrimPrefix(auth, "Bearer ")
		session, err := service.ValidateToken(c.Request.Context(), db, token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"errcode": 4,
				"msg":     "Token 无效或会话已过期",
			})
			c.Abort()
			return
		}
		c.Set("userID", session.UserID)
		c.Next()
	}
}
