.PHONY: minio-up minio-down dev start-dev frontend-dev start-all

MINIO_CONTAINER=minio
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_PORT=9000
MINIO_CONSOLE_PORT=9001
MINIO_VOLUME?=./minio

ifeq ($(OS),Windows_NT)
	MINIO_VOLUME_ABS := $(shell powershell -Command "[System.IO.Path]::GetFullPath('$(MINIO_VOLUME)')")
	MKDIR_CMD = if not exist $(MINIO_VOLUME) mkdir $(MINIO_VOLUME)
	CMD_PREFIX = cmd /c
else
	MINIO_VOLUME_ABS := $(shell realpath $(MINIO_VOLUME))
	MKDIR_CMD = mkdir -p $(MINIO_VOLUME)
	CMD_PREFIX =
endif

minio-up:
	$(MKDIR_CMD)
	docker run -d --rm \
		--name $(MINIO_CONTAINER) \
		-p $(MINIO_PORT):9000 \
		-p $(MINIO_CONSOLE_PORT):9001 \
		-e MINIO_ROOT_USER=$(MINIO_ACCESS_KEY) \
		-e MINIO_ROOT_PASSWORD=$(MINIO_SECRET_KEY) \
		-v $(MINIO_VOLUME_ABS):/data \
		minio/minio server /data --console-address ":9001"

minio-down:
	- docker rm -f $(MINIO_CONTAINER)

start-dev-be: minio-down minio-up
	cd backend && npm install && npm run start:dev

start-dev-fe:
	cd frontend && npm install && npm run dev

start-all: minio-down minio-up
ifeq ($(OS),Windows_NT)
	cmd /c start "Backend" /d "$(CURDIR)\backend" cmd /k "npm install && npm run start:dev"
	cmd /c start "Frontend" /d "$(CURDIR)\frontend" cmd /k "npm install && npm run dev"
else
	(cd backend && npm install && npm run start:dev &) \
	(cd frontend && npm install && npm run dev)
endif