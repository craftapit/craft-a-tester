# Ollama Adapter Tests

This set of tests verifies the functionality of the OllamaAdapter for LLM-powered testing.

## Scenario: OllamaAdapter Initialization

In this scenario, we'll test the initialization of the OllamaAdapter with various configuration options.

### Steps

1. Create an OllamaAdapter with default configuration
2. Initialize the adapter
3. Verify the adapter is connected to the Ollama server
4. Create an adapter with custom model and context size
5. Initialize the adapter with custom configuration
6. Verify the adapter uses the custom configuration

### Expected Results

- The adapter should connect to the Ollama server successfully
- The adapter should detect available models
- The adapter should use the default configuration when none is provided
- The adapter should use custom configuration when provided

## Scenario: LLM Completion with OllamaAdapter

In this scenario, we'll test the completion capabilities of the OllamaAdapter.

### Steps

1. Create and initialize an OllamaAdapter
2. Send a simple completion request
3. Verify that the response is reasonable and coherent
4. Send a longer, more complex completion request
5. Verify that the adapter handles longer content correctly
6. Test dynamic context sizing with varying input lengths

### Expected Results

- The adapter should return coherent completions for simple prompts
- The adapter should handle longer prompts correctly
- Dynamic context sizing should adjust based on input length
- The adapter should respect temperature and other generation parameters