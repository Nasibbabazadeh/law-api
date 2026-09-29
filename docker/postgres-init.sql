-- Runs once, on first start of an empty volume.
-- The dev database (huquq) is created by POSTGRES_DB; add a separate one for API tests.
CREATE DATABASE huquq_test;
