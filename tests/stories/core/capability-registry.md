# Capability Registry Tests

This set of tests verifies the functionality of the CapabilityRegistry with vector-based caching.

## Scenario: Capability Registration and Retrieval

In this scenario, we'll test registering and retrieving capabilities from the registry.

### Steps

1. Create a new CapabilityRegistry with caching enabled
2. Register a test capability with example usage
3. Verify the capability can be retrieved by name
4. Register multiple capabilities
5. Retrieve all capabilities
6. Verify all capabilities are correctly registered

### Expected Results

- The registry should allow registration of capabilities
- Registered capabilities should be retrievable by name
- The registry should maintain a list of all registered capabilities
- Example embeddings should be created for registered capabilities

## Scenario: Capability Resolution with Vector Caching

In this scenario, we'll test the vector-based caching mechanism for capability resolution.

### Steps

1. Create a new CapabilityRegistry with caching enabled
2. Register multiple test capabilities with examples
3. Resolve a capability for a specific action description
4. Perform the same resolution again with a slightly different description
5. Verify that the second resolution uses the cached result
6. Provide negative feedback and verify cache cleanup

### Expected Results

- The first resolution should use the LLM
- The second resolution should use the vector cache
- Similar actions should resolve to the same capability
- Negative feedback should clean up incorrect cache entries
- The cache should persist between registry instances