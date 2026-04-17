package handlers

import (
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/yourusername/aaag-api/internal/models"
	"github.com/yourusername/aaag-api/internal/services"
)

// DB is the interface the handlers depend on.
// The concrete implementation lives in the db layer (Supabase/Neon).
type DB interface {
	GetOrder(id string) (*models.Order, error)
	StoreAppConfig(appID string, config models.AppConfigEnvelope) (string, error) // returns config URL
	ActivateApp(appID, deploymentID, subdomain string, expiresAt *time.Time) error
}

// Handler holds injected dependencies for all HTTP handlers.
type Handler struct {
	db        DB
	deployer  *services.Deployer
	notifier  *services.Notifier
	generator *services.Generator
}

// New constructs a Handler. db may be nil during early development; handlers that
// need it will return 501 until a real implementation is wired in.
func New(deployer *services.Deployer, notifier *services.Notifier, generator *services.Generator) *Handler {
	return &Handler{
		deployer:  deployer,
		notifier:  notifier,
		generator: generator,
	}
}

// InternalAuthMiddleware rejects requests that don't carry the internal secret header.
func InternalAuthMiddleware() gin.HandlerFunc {
	secret := os.Getenv("INTERNAL_API_SECRET")
	return func(c *gin.Context) {
		if c.GetHeader("X-Internal-Secret") != secret || secret == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
		}
		c.Next()
	}
}

// ── Stub handlers ─────────────────────────────────────────────────────────────
// These return 501 until the DB layer is implemented.

func (h *Handler) ListTemplates(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
}

func (h *Handler) GetTemplate(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
}

func (h *Handler) CreateOrder(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
}

func (h *Handler) GetApp(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
}

func (h *Handler) ListUserApps(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
}

func (h *Handler) ExtendApp(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
}

func (h *Handler) ExpireApps(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
}
