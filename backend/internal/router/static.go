package router

import (
	"io/fs"
	"log"
	"mime"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
)

func mountFrontend(r *gin.Engine, staticFS fs.FS) {
	if staticFS == nil {
		return
	}

	distFS, err := fs.Sub(staticFS, "dist")
	if err != nil {
		log.Printf("mount frontend failed: %v", err)
		return
	}

	// 静态资源：/assets/* 直接从 dist 子目录读文件
	r.GET("/assets/*filepath", func(c *gin.Context) {
		path := strings.TrimPrefix(c.Param("filepath"), "/")
		if path == "" {
			c.Status(http.StatusNotFound)
			return
		}

		data, err := fs.ReadFile(distFS, filepath.ToSlash(filepath.Join("assets", path)))
		if err != nil {
			c.Status(http.StatusNotFound)
			return
		}

		ctype := mime.TypeByExtension(filepath.Ext(path))
		if ctype == "" {
			ctype = "application/octet-stream"
		}
		c.Data(http.StatusOK, ctype, data)
	})

	// 首页
	r.GET("/", func(c *gin.Context) {
		data, err := fs.ReadFile(distFS, "index.html")
		if err != nil {
			log.Printf("read embedded index.html failed: %v", err)
			c.String(http.StatusInternalServerError, "index.html not found")
			return
		}
		c.Data(http.StatusOK, "text/html; charset=utf-8", data)
	})

	// 其余前端路由回退到 index.html（仅处理 GET）
	r.NoRoute(func(c *gin.Context) {
		if c.Request.Method != http.MethodGet {
			c.Status(http.StatusNotFound)
			return
		}
		data, err := fs.ReadFile(distFS, "index.html")
		if err != nil {
			log.Printf("read embedded index.html failed: %v", err)
			c.String(http.StatusInternalServerError, "index.html not found")
			return
		}
		c.Data(http.StatusOK, "text/html; charset=utf-8", data)
	})
}
