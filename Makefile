.PHONY: test lint format clean help setup

test:
	npm test

lint:
	npm run lint

format:
	npm run format

setup:
	npm install

clean:
	rm -rf scratch/*
	@echo "Cleaned scratch directory."

help:
	@echo "Available commands:"
	@echo "  make test    - Run tests"
	@echo "  make lint    - Run linters"
	@echo "  make format  - Format code"
	@echo "  make setup   - Install dependencies"
	@echo "  make clean   - Clean artifacts"