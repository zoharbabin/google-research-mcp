#!/bin/sh
# Load environment variables from .env file
export $(grep -v '^#' .env | grep -v '^$' | xargs)
# Start the Node.js server
exec npm start