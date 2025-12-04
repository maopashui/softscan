package service

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

func InitDB(filename string) (*sql.DB, error) {
	baseDir, _ := os.Getwd()
	dbPath := filepath.Join(baseDir, filename)
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1)
	return db, nil
}

func AutoMigrate(db *sql.DB) error {
	userTable := `
CREATE TABLE IF NOT EXISTS users (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	username TEXT NOT NULL UNIQUE,
	password_hash TEXT NOT NULL,
	daily_limit INTEGER DEFAULT 20,
	created_at DATETIME NOT NULL
);`

	sessionTable := `
CREATE TABLE IF NOT EXISTS sessions (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id INTEGER NOT NULL,
	token TEXT NOT NULL UNIQUE,
	expires_at DATETIME NOT NULL,
	FOREIGN KEY(user_id) REFERENCES users(id)
);`

	ocrTable := `
CREATE TABLE IF NOT EXISTS ocr_records (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id INTEGER NOT NULL,
	text TEXT NOT NULL,
	created_at DATETIME NOT NULL,
	FOREIGN KEY(user_id) REFERENCES users(id)
);`

	rateLimitTable := `
CREATE TABLE IF NOT EXISTS ocr_rate_limits (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id INTEGER NOT NULL,
	ip TEXT NOT NULL,
	date TEXT NOT NULL,
	created_at DATETIME NOT NULL,
	FOREIGN KEY(user_id) REFERENCES users(id)
);`

	configTable := `
CREATE TABLE IF NOT EXISTS config (
	key TEXT PRIMARY KEY,
	value TEXT NOT NULL,
	updated_at DATETIME NOT NULL
);`

	if _, err := db.Exec(userTable); err != nil {
		return fmt.Errorf("创建 users 表失败: %w", err)
	}
	if _, err := db.Exec(sessionTable); err != nil {
		return fmt.Errorf("创建 sessions 表失败: %w", err)
	}
	if _, err := db.Exec(ocrTable); err != nil {
		return fmt.Errorf("创建 ocr_records 表失败: %w", err)
	}
	if _, err := db.Exec(rateLimitTable); err != nil {
		return fmt.Errorf("创建 ocr_rate_limits 表失败: %w", err)
	}
	if _, err := db.Exec(configTable); err != nil {
		return fmt.Errorf("创建 config 表失败: %w", err)
	}

	// 为已存在的 users 表添加 daily_limit 字段（如果不存在）
	// SQLite 不支持 ALTER TABLE ADD COLUMN IF NOT EXISTS，所以需要忽略错误
	_, _ = db.Exec(`ALTER TABLE users ADD COLUMN daily_limit INTEGER DEFAULT 3;`)

	return nil
}

func CleanupTempDir() {
	baseDir, _ := os.Getwd()
	tempDir := filepath.Join(baseDir, "temp")
	_ = os.RemoveAll(tempDir)
}

func Now() time.Time {
	return time.Now().UTC()
}
