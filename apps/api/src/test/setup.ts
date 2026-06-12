// Mock environment variables for all tests
process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.RPC_URL = 'https://bsc-dataseed.binance.org';
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.PORT = '4001';
process.env.PARALLEL_API_KEY = 'test-parallel-key';
process.env.GEMINI_CLI_AUTH_TYPE = 'oauth-personal';
process.env.THIRDWEB_SECRET_KEY = 'test-thirdweb-secret';
process.env.THIRDWEB_ADMIN_PRIVATE_KEY = '0x0000000000000000000000000000000000000000000000000000000000000001';
process.env.AUTH_DOMAIN = 'localhost:3000';
process.env.MANTLE_IDENTITY_REGISTRY_ADDRESS = '0x1111111111111111111111111111111111111111';
process.env.MANTLE_REPUTATION_REGISTRY_ADDRESS = '0x2222222222222222222222222222222222222222';
process.env.MANTLE_ATTESTATION_REGISTRY_ADDRESS = '0x3333333333333333333333333333333333333333';
