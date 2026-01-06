package server

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
)

type JsonRpcRequest struct {
	Jsonrpc string          `json:"jsonrpc"`
	Method  string          `json:"method"`
	Params  json.RawMessage `json:"params"`
	Id      interface{}     `json:"id"`
}

type JsonRpcResponse struct {
	Jsonrpc string      `json:"jsonrpc"`
	Result  interface{} `json:"result,omitempty"`
	Error   interface{} `json:"error,omitempty"`
	Id      interface{} `json:"id"`
}

type Handler func(method string, params json.RawMessage) (interface{}, error)

func Serve(handler Handler) {
	scanner := bufio.NewScanner(os.Stdin)
	for scanner.Scan() {
		var req JsonRpcRequest
		if err := json.Unmarshal(scanner.Bytes(), &req); err != nil {
			sendError(nil, -32700, "Parse error")
			continue
		}

		result, err := handler(req.Method, req.Params)
		if err != nil {
			sendError(req.Id, -32603, err.Error())
		} else {
			sendResult(req.Id, result)
		}
	}
}

func sendResult(id interface{}, result interface{}) {
	resp := JsonRpcResponse{
		Jsonrpc: "2.0",
		Result:  result,
		Id:      id,
	}
	send(resp)
}

func sendError(id interface{}, code int, message string) {
	resp := JsonRpcResponse{
		Jsonrpc: "2.0",
		Error: map[string]interface{}{
			"code":    code,
			"message": message,
		},
		Id: id,
	}
	send(resp)
}

func send(v interface{}) {
	data, _ := json.Marshal(v)
	fmt.Println(string(data))
}
