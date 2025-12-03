package service

import (
	"context"
	"database/sql"
	"errors"
	"os"
)

var (
	ErrConfigNotFound = errors.New("配置不存在")
)

// GetConfig 获取配置值
func GetConfig(ctx context.Context, db *sql.DB, key string) (string, error) {
	var value string
	err := db.QueryRowContext(ctx, "SELECT value FROM config WHERE key = ?", key).Scan(&value)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", ErrConfigNotFound
		}
		return "", err
	}
	return value, nil
}

// SetConfig 设置配置值
func SetConfig(ctx context.Context, db *sql.DB, key, value string) error {
	_, err := db.ExecContext(ctx,
		`INSERT INTO config(key, value, updated_at) 
		 VALUES(?, ?, ?) 
		 ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?`,
		key, value, Now(), value, Now())
	return err
}

// IsAdmin 检查用户是否为管理员
// 简单实现：第一个用户（id=1）为管理员
func IsAdmin(ctx context.Context, db *sql.DB, userID int64) (bool, error) {
	// 第一个用户（id=1）为管理员
	if userID == 1 {
		return true, nil
	}
	return false, nil
}

// OCREngineConfig OCR 引擎配置
type OCREngineConfig struct {
	URL   string
	Token string
}

// GetOCREngineConfig 一次查询获取 OCR 引擎配置（URL 和 Token）
func GetOCREngineConfig(ctx context.Context, db *sql.DB) OCREngineConfig {
	config := OCREngineConfig{}

	// 一次查询获取两个配置项
	rows, err := db.QueryContext(ctx, "SELECT key, value FROM config WHERE key IN ('ocr_engine_url', 'ocr_engine_token')")
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var key, value string
			if err := rows.Scan(&key, &value); err == nil {
				if key == "ocr_engine_url" && value != "" {
					config.URL = value
				} else if key == "ocr_engine_token" && value != "" {
					config.Token = value
				}
			}
		}
	}

	// 如果数据库中没有 URL，从环境变量或默认值获取
	if config.URL == "" {
		if url := os.Getenv("OCR_ENGINE_URL"); url != "" {
			config.URL = url
		} else {
			config.URL = "http://example.com/ocr" // 默认值
		}
	}

	// 如果数据库中没有 Token，从环境变量获取
	if config.Token == "" {
		if token := os.Getenv("OCR_ENGINE_TOKEN"); token != "" {
			config.Token = token
		}
	}

	return config
}

// GetOCREngineToken 获取 OCR 引擎 token（向后兼容，内部调用 GetOCREngineConfig）
func GetOCREngineToken(ctx context.Context, db *sql.DB) string {
	return GetOCREngineConfig(ctx, db).Token
}

// GetOCREngineURL 获取 OCR 引擎 URL（向后兼容，内部调用 GetOCREngineConfig）
func GetOCREngineURL(ctx context.Context, db *sql.DB) string {
	return GetOCREngineConfig(ctx, db).URL
}
