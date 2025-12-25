.PHONY: minio-up minio-up-alt minio-down dev start-dev frontend-dev start-all start-infra start-backend start-frontend

MINIO_CONTAINER=minio
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_PORT=9000
MINIO_CONSOLE_PORT=9001
MINIO_VOLUME?=./minio

ifeq ($(OS),Windows_NT)
	MINIO_VOLUME_ABS := $(shell powershell -NoProfile -Command "[System.IO.Path]::GetFullPath('$(MINIO_VOLUME)')")
	MKDIR_CMD = if not exist $(MINIO_VOLUME) mkdir $(MINIO_VOLUME)
	CMD_PREFIX = cmd /c
else
	MINIO_VOLUME_ABS := $(shell realpath $(MINIO_VOLUME))
	MKDIR_CMD = mkdir -p $(MINIO_VOLUME)
	CMD_PREFIX =
endif

minio-up:
	$(MKDIR_CMD)
ifeq ($(OS),Windows_NT)
	-docker rm -f $(MINIO_CONTAINER) 2>nul
else
	-docker rm -f $(MINIO_CONTAINER) 2>/dev/null || true
endif
	docker run -d --rm \
		--name $(MINIO_CONTAINER) \
		-p $(MINIO_PORT):9000 \
		-p $(MINIO_CONSOLE_PORT):9001 \
		-e MINIO_ROOT_USER=$(MINIO_ACCESS_KEY) \
		-e MINIO_ROOT_PASSWORD=$(MINIO_SECRET_KEY) \
		-v $(MINIO_VOLUME_ABS):/data \
		minio/minio server /data --console-address ":9001"

# Alternative method - using PowerShell script (when network is down)
minio-up-alt:
	PowerShell -ExecutionPolicy Bypass -File start-infra.ps1

minio-down:
	- docker rm -f $(MINIO_CONTAINER)

start-dev-be: minio-down minio-up
	cd backend && npm install && npm run start:dev

start-dev-fe:
	cd frontend && npm install && npm run dev

# New targets for separate development
start-infra:
	PowerShell -ExecutionPolicy Bypass -File start-infra.ps1

start-backend:
	cd backend && npm run start:dev

start-frontend:
	cd frontend && npm install && npm run dev

start-all: minio-down minio-up
ifeq ($(OS),Windows_NT)
	cmd /c start "Backend" /d "$(CURDIR)\backend" cmd /k "npm install && npm run start:dev"
	cmd /c start "Frontend" /d "$(CURDIR)\frontend" cmd /k "npm install && npm run dev"
else
	(cd backend && npm install && npm run start:dev &) \
	(cd frontend && npm install && npm run dev)
endif

# Database commands
db-up:
	docker run -d --name metastore-postgres \
		-e POSTGRES_PASSWORD=postgres \
		-e POSTGRES_DB=metastore \
		-p 5432:5432 \
		postgres:16-alpine

db-down:
	-docker rm -f metastore-postgres

db-logs:
	docker logs -f metastore-postgres

# Clean commands
clean:
	rm -rf backend/dist backend/node_modules/.cache frontend/.next frontend/node_modules/.cache

clean-all: clean
	rm -rf backend/node_modules frontend/node_modules backend/data/*.db

# Test commands
test-api:
	./test-api.sh

test-backend:
	cd backend && npm test

test-frontend:
	cd frontend && npm test

# Build commands
build-backend:
	cd backend && npm run build

build-frontend:
	cd frontend && npm run build

build-all: build-backend build-frontend

# Docker commands
docker-build:
	docker-compose build

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f

# Development helpers
install-all:
	cd backend && npm install
	cd frontend && npm install

setup: install-all db-up minio-up
	@echo "✅ Setup complete! Run 'make start-all' to start development servers"

# Health checks
health-check:
	@echo "Checking services..."
	@curl -s http://localhost:3001/api/health > /dev/null && echo "✅ Backend: OK" || echo "❌ Backend: Not running"
	@curl -s http://localhost:3000 > /dev/null && echo "✅ Frontend: OK" || echo "❌ Frontend: Not running"
	@docker ps | grep -q postgres && echo "✅ Postgres: OK" || echo "❌ Postgres: Not running"
	@docker ps | grep -q minio && echo "✅ MinIO: OK" || echo "❌ MinIO: Not running"
	@docker ps | grep -q redis && echo "✅ Redis: OK" || echo "❌ Redis: Not running"

# Infrastructure management
infra-status:
	@echo "=== Docker Containers Status ==="
	@docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" --filter "name=minio" --filter "name=redis"
	@echo ""

infra-logs:
	@echo "=== MinIO Logs ==="
	@docker logs --tail 10 minio 2>/dev/null || echo "MinIO container not found"
	@echo ""
	@echo "=== Redis Logs ==="  
	@docker logs --tail 10 redis 2>/dev/null || echo "Redis container not found"
	@echo ""

infra-restart: minio-down minio-up-alt
	@echo "✅ Infrastructure restarted"