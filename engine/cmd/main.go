package main

import (
	"encoding/json"
	"fmt"

	"github.com/NICE-DEV226/Veil/engine/pkg/analyzer"
	"github.com/NICE-DEV226/Veil/engine/pkg/server"
	"github.com/NICE-DEV226/Veil/engine/pkg/types"
)

func main() {
	server.Serve(func(method string, params json.RawMessage) (interface{}, error) {
		switch method {
		case "analyze":
			var req types.AnalysisRequest
			if err := json.Unmarshal(params, &req); err != nil {
				return nil, fmt.Errorf("invalid params: %v", err)
			}
			return analyzer.Analyze(req)
		default:
			return nil, fmt.Errorf("method not found: %s", method)
		}
	})
}
