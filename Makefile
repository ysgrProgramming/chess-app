.PHONY: test lint format clean help setup

# Load nvm if available (for environments using nvm)
# This Makefile automatically detects and loads nvm if ~/.nvm/nvm.sh exists
# If nvm is not found, it assumes node/npm are already in PATH

test:
	@if [ -f ~/.nvm/nvm.sh ]; then \
		bash -c 'source ~/.nvm/nvm.sh && npm test'; \
	else \
		npm test; \
	fi

lint:
	@if [ -f ~/.nvm/nvm.sh ]; then \
		bash -c 'source ~/.nvm/nvm.sh && npm run lint'; \
	else \
		npm run lint; \
	fi

format:
	@if [ -f ~/.nvm/nvm.sh ]; then \
		bash -c 'source ~/.nvm/nvm.sh && npm run format'; \
	else \
		npm run format; \
	fi

setup:
	@if [ -f ~/.nvm/nvm.sh ]; then \
		bash -c 'source ~/.nvm/nvm.sh && npm install'; \
	else \
		npm install; \
	fi

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
	@echo ""
	@echo "Note: This Makefile automatically detects and loads nvm if available."
	@echo "If you're using nvm, make sure ~/.nvm/nvm.sh exists."