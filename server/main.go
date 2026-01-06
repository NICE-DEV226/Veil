package main

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type UserStats struct {
	UserID         string         `json:"userId"`
	TotalFindings  int            `json:"totalFindings"`
	TotalFixed     int            `json:"totalFixed"`
	LastSeen       time.Time      `json:"lastSeen"`
	FindingsByRule map[string]int `json:"findingsByRule"`
	History        interface{}    `json:"history"`
}

type TelemetryData struct {
	UserID         string         `json:"userId"`
	TotalFindings  int            `json:"totalFindings"`
	TotalFixed     int            `json:"totalFixed"`
	FindingsByRule map[string]int `json:"findingsByRule"`
}

var (
	users      = make(map[string]*UserStats)
	usersMutex sync.RWMutex
)

func main() {
	r := gin.Default()

	// CORS for Dashboard access
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// Telemetry Endpoint (from extensions)
	r.POST("/api/telemetry", func(c *gin.Context) {
		var data TelemetryData
		if err := c.ShouldBindJSON(&data); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		usersMutex.Lock()
		defer usersMutex.Unlock()

		if _, ok := users[data.UserID]; !ok {
			users[data.UserID] = &UserStats{UserID: data.UserID}
		}

		user := users[data.UserID]
		user.TotalFindings = data.TotalFindings
		user.TotalFixed = data.TotalFixed
		user.FindingsByRule = data.FindingsByRule
		user.LastSeen = time.Now()

		c.JSON(http.StatusOK, gin.H{"status": "recorded"})
	})

	// Admin API (for Dashboard)
	r.GET("/api/admin/users", func(c *gin.Context) {
		usersMutex.RLock()
		defer usersMutex.RUnlock()

		userList := make([]*UserStats, 0, len(users))
		for _, u := range users {
			userList = append(userList, u)
		}

		c.JSON(http.StatusOK, userList)
	})

	r.GET("/api/admin/stats", func(c *gin.Context) {
		usersMutex.RLock()
		defer usersMutex.RUnlock()

		totalUsers := len(users)
		totalFindings := 0
		for _, u := range users {
			totalFindings += u.TotalFindings
		}

		c.JSON(http.StatusOK, gin.H{
			"totalUsers":     totalUsers,
			"globalFindings": totalFindings,
		})
	})

	r.Run(":8080")
}
