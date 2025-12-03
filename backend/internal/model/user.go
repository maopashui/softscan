package model

import "time"

type User struct {
	ID           int64     `db:"id"`
	Username     string    `db:"username"`
	PasswordHash string    `db:"password_hash"`
	DailyLimit   int       `db:"daily_limit"`
	CreatedAt    time.Time `db:"created_at"`
}

type Session struct {
	ID        int64     `db:"id"`
	UserID    int64     `db:"user_id"`
	Token     string    `db:"token"`
	ExpiresAt time.Time `db:"expires_at"`
}

type OCRRecord struct {
	ID        int64     `db:"id"`
	UserID    int64     `db:"user_id"`
	Text      string    `db:"text"`
	CreatedAt time.Time `db:"created_at"`
}
