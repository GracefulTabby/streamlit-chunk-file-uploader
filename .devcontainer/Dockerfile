FROM node:12.13.1-alpine AS node-dev
FROM python:3.11.0-slim

COPY --from=node-dev /usr/local/bin/node /usr/local/bin/