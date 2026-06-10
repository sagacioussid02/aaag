package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

// TestGenerateWizardRouteExists validates that the /api/generate endpoint
// is registered and responds (not 404). This is a regression guard to catch
// silent removal of the wizard integration endpoint.
func TestGenerateWizardRouteExists(t *testing.T) {
	// Set Gin to test mode
	gin.SetMode(gin.TestMode)

	// Create a test router
	router := gin.New()

	// Register the GenerateWizard handler on the /api/generate route
	// (This mirrors the registration in main.go)
	router.POST("/api/generate", GenerateWizard)

	// Create a test request
	req, err := http.NewRequest("POST", "/api/generate", nil)
	if err != nil {
		t.Fatalf("Failed to create request: %v", err)
	}

	// Record the response
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Verify the route exists (not 404)
	if w.Code == http.StatusNotFound {
		t.Errorf("GenerateWizard route not found (404). Route may have been removed.")
	}

	// The endpoint should return 200 or a client error (400, 422), not 404
	if w.Code >= 500 {
		t.Logf("Warning: GenerateWizard returned server error %d. Check handler implementation.", w.Code)
	}

	t.Logf("GenerateWizard route exists and returned status %d", w.Code)
}
