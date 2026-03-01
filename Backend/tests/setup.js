// Load test environment variables before any test file runs
process.env.NODE_ENV    = "test";
process.env.MONGO_URI   = process.env.MONGO_URI_TEST || "mongodb://localhost:27017/hotel_test";
process.env.JWT_SECRET  = "test_jwt_secret_do_not_use_in_production";
process.env.JWT_EXPIRES_IN = "1d";
process.env.PORT        = "5001";
