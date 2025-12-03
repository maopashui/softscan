package service

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"

	"gin_ocrimg/backend/internal/model"
	"gin_ocrimg/backend/internal/utils"
)

var (
	ErrUserExists      = errors.New("用户已存在")
	ErrInvalidLogin    = errors.New("用户名或密码错误")
	ErrSessionNotFound = errors.New("会话不存在")
)

func hashPassword(pw string) string {
	sum := sha256.Sum256([]byte(pw))
	return hex.EncodeToString(sum[:])
}

func RegisterUser(ctx context.Context, db *sql.DB, username, password string) error {
	var exists int
	err := db.QueryRowContext(ctx, "SELECT COUNT(1) FROM users WHERE username = ?", username).Scan(&exists)
	if err != nil {
		return err
	}
	if exists > 0 {
		return ErrUserExists
	}
	_, err = db.ExecContext(ctx,
		"INSERT INTO users(username, password_hash, created_at) VALUES(?,?,?)",
		username, hashPassword(password), Now())
	return err
}

func Login(ctx context.Context, db *sql.DB, username, password string) (string, error) {
	var u model.User
	row := db.QueryRowContext(ctx, "SELECT id, password_hash FROM users WHERE username = ?", username)
	if err := row.Scan(&u.ID, &u.PasswordHash); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", ErrInvalidLogin
		}
		return "", err
	}
	if u.PasswordHash != hashPassword(password) {
		return "", ErrInvalidLogin
	}

	token, exp, err := utils.GenerateToken(u.ID)
	if err != nil {
		return "", err
	}

	_, err = db.ExecContext(ctx,
		"INSERT INTO sessions(user_id, token, expires_at) VALUES(?,?,?)",
		u.ID, token, exp)
	if err != nil {
		return "", fmt.Errorf("保存会话失败: %w", err)
	}
	return token, nil
}

func ValidateToken(ctx context.Context, db *sql.DB, token string) (*model.Session, error) {
	claims, err := utils.ParseToken(token)
	if err != nil {
		return nil, err
	}
	var s model.Session
	row := db.QueryRowContext(ctx,
		"SELECT id, user_id, token, expires_at FROM sessions WHERE token = ?", token)
	if err := row.Scan(&s.ID, &s.UserID, &s.Token, &s.ExpiresAt); err != nil {
		return nil, ErrSessionNotFound
	}
	if s.UserID != claims.UserID {
		return nil, errors.New("token 与会话不匹配")
	}
	if s.ExpiresAt.Before(Now()) {
		return nil, errors.New("会话已过期")
	}
	return &s, nil
}
