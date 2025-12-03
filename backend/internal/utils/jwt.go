package utils

import (
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const (
	defaultSecret   = "VictoriaSteam001"
	tokenExpireDays = 7
	tokenContextKey = "userID"
)

func getJWTSecret() []byte {
	secret := os.Getenv("STEAM_JWT_SECRET")
	if secret == "" {
		secret = defaultSecret
	}
	return []byte(secret)
}

type Claims struct {
	UserID int64 `json:"uid"`
	jwt.RegisteredClaims
}

func GenerateToken(userID int64) (string, time.Time, error) {
	expireAt := time.Now().Add(time.Hour * 24 * tokenExpireDays)
	claims := &Claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expireAt),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	ss, err := token.SignedString(getJWTSecret())
	return ss, expireAt, err
}

func ParseToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return getJWTSecret(), nil
	})
	if err != nil {
		return nil, err
	}
	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}
	return nil, jwt.ErrTokenInvalidClaims
}
