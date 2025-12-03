package handler

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"

	"gin_ocrimg/backend/internal/service"
)

type authRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func RegisterHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req authRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"errcode": 5, "msg": "参数错误"})
			return
		}
		if err := service.RegisterUser(c.Request.Context(), db, req.Username, req.Password); err != nil {
			if err == service.ErrUserExists {
				c.JSON(http.StatusBadRequest, gin.H{"errcode": 5, "msg": "用户已存在"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"errcode": 5, "msg": "注册失败"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"errcode": 0, "msg": "注册成功"})
	}
}

func LoginHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req authRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"errcode": 5, "msg": "参数错误"})
			return
		}
		token, err := service.Login(c.Request.Context(), db, req.Username, req.Password)
		if err != nil {
			if err == service.ErrInvalidLogin {
				c.JSON(http.StatusUnauthorized, gin.H{"errcode": 5, "msg": "用户名或密码错误"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"errcode": 5, "msg": "登录失败"})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"errcode": 0,
			"msg":     "登录成功",
			"token":   token,
		})
	}
}
